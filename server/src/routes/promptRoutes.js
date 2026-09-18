import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import { broadcastSessionEvent } from '../socket/socketHandler.js';

const router = express.Router();

// Get active prompt for a session (for students joining late)
router.get('/session/:sessionId/active', authenticate, (req, res) => {
  try {
    const { sessionId } = req.params;
    const prompt = db.prepare(`
      SELECT * FROM session_prompts 
      WHERE session_id = ? AND status = 'active'
    `).get(sessionId);

    if (!prompt) return res.json({ prompt: null });

    // Hide correct option from students, expose end_time so timer works
    const response = {
      ...prompt,
      options: JSON.parse(prompt.options_json),
      end_time: prompt.end_time
    };
    delete response.correct_option;
    delete response.options_json;

    res.json({ prompt: response });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create and Launch a prompt (Instructor only)
router.post('/session/:sessionId/launch', authenticate, authorize('instructor'), (req, res) => {
  try {
    const { sessionId } = req.params;
    const { question_text, options, correct_option, time_limit_seconds, image_url, group_id } = req.body;

    // Verify session belongs to instructor and is active
    const session = db.prepare('SELECT id FROM class_sessions WHERE id = ? AND instructor_id = ? AND status = ?').get(sessionId, req.user.id, 'active');
    if (!session) {
      return res.status(403).json({ error: 'Invalid or inactive session.' });
    }

    const promptId = uuidv4();
    const optionsJson = JSON.stringify(options);
    const timeLimitSec = parseInt(time_limit_seconds) || 20;
    const endTime = Date.now() + (timeLimitSec * 1000);

    db.prepare(`
      INSERT INTO session_prompts (id, session_id, group_id, question_text, image_url, options_json, correct_option, time_limit_seconds, status, end_time)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?, 'active', ?)
    `).run(promptId, sessionId, group_id || null, question_text, image_url || null, optionsJson, correct_option, timeLimitSec, endTime);

    // Broadcast to all in session room (students + instructor)
    broadcastSessionEvent(sessionId, 'prompt:start', {
      id: promptId,
      group_id: group_id || null,
      question_text,
      image_url: image_url || null,
      options,
      time_limit_seconds: timeLimitSec,
      end_time: endTime
    });

    // Auto-close after time limit + 1s buffer
    setTimeout(() => {
      const current = db.prepare("SELECT status FROM session_prompts WHERE id = ?").get(promptId);
      if (current && current.status === 'active') {
        closePrompt(promptId, sessionId);
      }
    }, (timeLimitSec * 1000) + 1000);

    res.json({ success: true, promptId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to launch prompt' });
  }
});

// Instructor manually ends a prompt early
router.post('/session/:sessionId/prompt/:promptId/close', authenticate, authorize('instructor'), (req, res) => {
  try {
    const { sessionId, promptId } = req.params;

    const session = db.prepare('SELECT id FROM class_sessions WHERE id = ? AND instructor_id = ?').get(sessionId, req.user.id);
    if (!session) return res.status(403).json({ error: 'Unauthorized' });

    const prompt = db.prepare('SELECT status FROM session_prompts WHERE id = ?').get(promptId);
    if (prompt && prompt.status === 'active') {
      closePrompt(promptId, sessionId);
    }
    res.json({ success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to close prompt early' });
  }
});

// Close prompt: reveal answer, award XP, emit reveal, then check if it was last in group
function closePrompt(promptId, sessionId) {
  try {
    db.prepare("UPDATE session_prompts SET status = 'completed' WHERE id = ?").run(promptId);

    // Tally votes per option
    const statsRow = db.prepare(`
      SELECT selected_option, COUNT(*) as count 
      FROM prompt_responses 
      WHERE prompt_id = ? 
      GROUP BY selected_option
    `).all(promptId);

    const stats = {};
    statsRow.forEach(row => { stats[row.selected_option] = row.count; });

    const prompt = db.prepare('SELECT * FROM session_prompts WHERE id = ?').get(promptId);

    // Broadcast answer reveal to ALL clients in room (students see correct answer)
    broadcastSessionEvent(sessionId, 'prompt:reveal', {
      promptId,
      correctOption: prompt.correct_option,
      stats
    });

    // After reveal, check if there are more active/pending prompts in the same group
    // If this was the last, broadcast leaderboard
    const remainingInGroup = prompt.group_id
      ? db.prepare("SELECT COUNT(*) as count FROM session_prompts WHERE group_id = ? AND status = 'active'").get(prompt.group_id).count
      : 0;

    if (remainingInGroup === 0) {
      // Compute leaderboard: top participants by total points in this session's prompts
      const sessionGroupIds = db.prepare(`
        SELECT DISTINCT group_id FROM session_prompts 
        WHERE session_id = ? AND group_id IS NOT NULL
      `).all(sessionId).map(r => r.group_id);

      let leaderboard = [];
      if (sessionGroupIds.length > 0) {
        // Get all prompts for those groups
        const promptIds = db.prepare(`
          SELECT id FROM session_prompts WHERE session_id = ?
        `).all(sessionId).map(r => r.id);

        if (promptIds.length > 0) {
          // Build parameterized IN list safely
          const placeholders = promptIds.map(() => '?').join(',');
          leaderboard = db.prepare(`
            SELECT u.id, u.name, u.avatar_url, u.id_number,
                   SUM(pr.points_awarded) as total_points,
                   COUNT(CASE WHEN pr.is_correct = 1 THEN 1 END) as correct_count,
                   COUNT(pr.id) as answered_count
            FROM prompt_responses pr
            JOIN users u ON pr.student_id = u.id
            WHERE pr.prompt_id IN (${placeholders})
            GROUP BY u.id
            ORDER BY total_points DESC
            LIMIT 10
          `).all(...promptIds);
        }
      }

      // Delay leaderboard so students see the final reveal for 3s first
      setTimeout(() => {
        broadcastSessionEvent(sessionId, 'prompt:leaderboard', { leaderboard });
      }, 3500);
    }
  } catch (e) {
    console.error("Error closing prompt", e);
  }
}

// Student submits an answer
router.post('/:promptId/submit', authenticate, (req, res) => {
  try {
    const { promptId } = req.params;
    const { selectedOption } = req.body;
    const studentId = req.user.id;

    // BLOCK: instructors cannot answer
    if (req.user.role === 'instructor' || req.user.role === 'admin') {
      return res.status(403).json({ error: 'Instructors cannot participate in Quick Recap.' });
    }

    const prompt = db.prepare('SELECT * FROM session_prompts WHERE id = ?').get(promptId);
    if (!prompt) return res.status(404).json({ error: 'Prompt not found' });
    if (prompt.status !== 'active') return res.status(400).json({ error: 'Prompt is no longer active' });

    const isCorrect = prompt.correct_option === selectedOption;
    let points = 0;

    if (isCorrect) {
      const maxTime = prompt.time_limit_seconds * 1000;
      const startTime = prompt.end_time - maxTime;
      const timeTaken = Math.max(0, Math.min(Date.now() - startTime, maxTime));
      // Kahoot-style: min 50 pts for correct, bonus up to 50 for speed
      points = 50 + Math.round(50 * (1 - timeTaken / maxTime));
    }

    try {
      db.prepare(`
        INSERT INTO prompt_responses (id, prompt_id, student_id, selected_option, is_correct, points_awarded)
        VALUES (?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), promptId, studentId, selectedOption, isCorrect ? 1 : 0, points);

      if (points > 0) {
        db.prepare(`UPDATE users SET total_xp = total_xp + ? WHERE id = ?`).run(points, studentId);
      }
    } catch (e) {
      if (e.message.includes('UNIQUE constraint failed')) {
        return res.status(400).json({ error: 'Already answered' });
      }
      throw e;
    }

    // Update instructor progress counter
    const totalPresent = db.prepare(`
      SELECT COUNT(*) as count FROM attendance_records 
      WHERE session_id = ? AND status IN ('present', 'late')
    `).get(prompt.session_id).count;
    const answeredCount = db.prepare(`SELECT COUNT(*) as count FROM prompt_responses WHERE prompt_id = ?`).get(promptId).count;

    broadcastSessionEvent(prompt.session_id, 'prompt:update', { answeredCount, totalPresent });

    res.json({ success: true, isCorrect, points });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to submit answer' });
  }
});

export default router;

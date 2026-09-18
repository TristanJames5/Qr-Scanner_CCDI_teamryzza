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

    // Hide correct option from students
    const response = { ...prompt, options: JSON.parse(prompt.options_json) };
    delete response.correct_option;
    delete response.options_json;

    res.json({ prompt: response });
  } catch (error) {
    res.status(500).json({ error: 'Server error' });
  }
});

// Create and Launch a prompt (Instructor)
router.post('/session/:sessionId/launch', authenticate, authorize('instructor'), (req, res) => {
  try {
    const { sessionId } = req.params;
    const { question_text, options, correct_option, time_limit_seconds } = req.body;

    // Verify session belongs to instructor and is active
    const session = db.prepare('SELECT id FROM class_sessions WHERE id = ? AND instructor_id = ? AND status = ?').get(sessionId, req.user.id, 'active');
    if (!session) {
       return res.status(403).json({ error: 'Invalid or inactive session.' });
    }

    const promptId = uuidv4();
    const optionsJson = JSON.stringify(options); // [{id: 'A', text: '...'}, ...]

    db.prepare(`
      INSERT INTO session_prompts (id, session_id, question_text, options_json, correct_option, time_limit_seconds, status)
      VALUES (?, ?, ?, ?, ?, ?, 'active')
    `).run(promptId, sessionId, question_text, optionsJson, correct_option, time_limit_seconds || 20);

    const prompt = {
        id: promptId,
        question_text,
        options,
        time_limit_seconds: time_limit_seconds || 20,
        end_time: Date.now() + ((time_limit_seconds || 20) * 1000)
    };

    // Broadcast to session room
    broadcastSessionEvent(sessionId, 'prompt:start', prompt);

    // Auto-close after time limit
    setTimeout(() => {
        closePrompt(promptId, sessionId);
    }, (time_limit_seconds || 20) * 1000 + 1000); // 1s buffer

    res.json({ success: true, promptId });
  } catch (error) {
    console.error(error);
    res.status(500).json({ error: 'Failed to launch prompt' });
  }
});

// Close prompt manually or via timeout
function closePrompt(promptId, sessionId) {
    try {
        db.prepare("UPDATE session_prompts SET status = 'completed' WHERE id = ?").run(promptId);
        
        // Calculate stats
        const statsRow = db.prepare(`
            SELECT selected_option, COUNT(*) as count 
            FROM prompt_responses 
            WHERE prompt_id = ? 
            GROUP BY selected_option
        `).all(promptId);
        
        const stats = {};
        statsRow.forEach(row => stats[row.selected_option] = row.count);

        const prompt = db.prepare('SELECT correct_option FROM session_prompts WHERE id = ?').get(promptId);

        broadcastSessionEvent(sessionId, 'prompt:reveal', {
            correctOption: prompt.correct_option,
            stats
        });
    } catch (e) {
        console.error("Error closing prompt", e);
    }
}

// Student submits an answer
router.post('/:promptId/submit', authenticate, (req, res) => {
    try {
        const { promptId } = req.params;
        const { selectedOption, responseTimeMs } = req.body;
        const studentId = req.user.id;

        const prompt = db.prepare('SELECT * FROM session_prompts WHERE id = ?').get(promptId);
        if (!prompt) return res.status(404).json({ error: 'Prompt not found' });
        if (prompt.status !== 'active') return res.status(400).json({ error: 'Prompt is no longer active' });

        const isCorrect = prompt.correct_option === selectedOption;
        let points = 0;

        if (isCorrect) {
            const maxTime = prompt.time_limit_seconds * 1000;
            const timeTaken = Math.min(responseTimeMs, maxTime);
            points = Math.round(100 * (1 - (timeTaken / (2 * maxTime))));
        }

        try {
            db.prepare(`
                INSERT INTO prompt_responses (id, prompt_id, student_id, selected_option, is_correct, points_awarded)
                VALUES (?, ?, ?, ?, ?, ?)
            `).run(uuidv4(), promptId, studentId, selectedOption, isCorrect ? 1 : 0, points);
        } catch (e) {
            if (e.message.includes('UNIQUE constraint failed')) {
                 return res.status(400).json({ error: 'Already answered' });
            }
            throw e;
        }

        // Notify teacher to update counter
        const totalPresent = db.prepare(`SELECT COUNT(*) as count FROM attendance_records WHERE session_id = ? AND status IN ('present', 'late')`).get(prompt.session_id).count;
        const answeredCount = db.prepare(`SELECT COUNT(*) as count FROM prompt_responses WHERE prompt_id = ?`).get(promptId).count;
        
        broadcastSessionEvent(prompt.session_id, 'prompt:update', { answeredCount, totalPresent });

        res.json({ success: true, isCorrect, points });
    } catch (error) {
        console.error(error);
        res.status(500).json({ error: 'Failed to submit answer' });
    }
});

export default router;

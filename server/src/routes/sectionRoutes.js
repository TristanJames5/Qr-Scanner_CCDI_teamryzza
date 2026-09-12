import express from 'express';
import db from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { generateSectionAttendanceCSV } from '../services/exportService.js';

const router = express.Router();

// List sections with no instructor assigned (for the self-assign modal)
router.get('/all-unassigned', authenticate, (req, res) => {
  try {
    const sections = db.prepare(`
      SELECT s.id, s.name, s.room, s.schedule, s.academic_term,
             sub.code as subject_code, sub.title as subject_title
      FROM sections s
      JOIN subjects sub ON s.subject_id = sub.id
      WHERE s.instructor_id IS NULL
      ORDER BY sub.code ASC, s.name ASC
    `).all();
    res.json({ sections });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch unassigned sections: ' + err.message });
  }
});

// List sections (role-aware: instructors see their assigned sections, admins see all)
router.get('/', authenticate, (req, res) => {
  try {
    let query = `
      SELECT s.*, 
             sub.code as subject_code, sub.title as subject_title, sub.units,
             u.name as instructor_name, u.email as instructor_email,
             (SELECT COUNT(*) FROM enrollments WHERE section_id = s.id) as enrolled_count,
             (SELECT COUNT(*) FROM class_sessions WHERE section_id = s.id AND status = 'closed') as closed_sessions_count,
             (SELECT id FROM class_sessions WHERE section_id = s.id AND status = 'active' LIMIT 1) as active_session_id
      FROM sections s
      JOIN subjects sub ON s.subject_id = sub.id
      LEFT JOIN users u ON s.instructor_id = u.id
    `;

    let sections;
    if (req.user.role === 'instructor') {
      query += ` WHERE s.instructor_id = ? ORDER BY s.name ASC`;
      sections = db.prepare(query).all(req.user.id);
    } else {
      query += ` ORDER BY s.name ASC`;
      sections = db.prepare(query).all();
    }

    res.json({ sections });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sections: ' + err.message });
  }
});

// Section details
router.get('/:id', authenticate, (req, res) => {
  try {
    const { id } = req.params;
    const section = db.prepare(`
      SELECT s.*, 
             sub.code as subject_code, sub.title as subject_title, sub.units, sub.description as subject_description,
             u.name as instructor_name, u.email as instructor_email, u.department as instructor_department,
             (SELECT id FROM class_sessions WHERE section_id = s.id AND status = 'active' LIMIT 1) as active_session_id
      FROM sections s
      JOIN subjects sub ON s.subject_id = sub.id
      LEFT JOIN users u ON s.instructor_id = u.id
      WHERE s.id = ?
    `).get(id);

    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }

    // Enrolled students
    const roster = db.prepare(`
      SELECT u.id, u.id_number, u.name, u.email, u.department, u.avatar_url, e.enrolled_at
      FROM enrollments e
      JOIN users u ON e.student_id = u.id
      WHERE e.section_id = ?
      ORDER BY u.name ASC
    `).all(id);

    // Past sessions
    const sessions = db.prepare(`
      SELECT cs.id, cs.date, cs.start_time, cs.end_time, cs.status, cs.late_cutoff_minutes,
             (SELECT COUNT(*) FROM attendance_records WHERE session_id = cs.id AND status = 'present') as present_count,
             (SELECT COUNT(*) FROM attendance_records WHERE session_id = cs.id AND status = 'late') as late_count,
             (SELECT COUNT(*) FROM attendance_records WHERE session_id = cs.id AND status = 'absent') as absent_count,
             (SELECT COUNT(*) FROM attendance_records WHERE session_id = cs.id AND status = 'excused') as excused_count
      FROM class_sessions cs
      WHERE cs.section_id = ?
      ORDER BY cs.date DESC, cs.start_time DESC
    `).all(id);

    res.json({
      section,
      roster,
      sessions
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch section details: ' + err.message });
  }
});

// Self-assign instructor to a section
router.patch('/:id/assign-instructor', authenticate, (req, res) => {
  try {
    const { id } = req.params;
    const instructorId = req.user.id;

    // Only instructors (and admins) can call this
    if (req.user.role !== 'instructor' && req.user.role !== 'admin') {
      return res.status(403).json({ error: 'Only instructors can self-assign to sections' });
    }

    const section = db.prepare('SELECT id, instructor_id FROM sections WHERE id = ?').get(id);
    if (!section) return res.status(404).json({ error: 'Section not found' });

    if (section.instructor_id) {
      return res.status(409).json({ error: 'This section already has an instructor assigned' });
    }

    db.prepare('UPDATE sections SET instructor_id = ? WHERE id = ?').run(instructorId, id);
    res.json({ message: 'Section assigned successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to assign section: ' + err.message });
  }
});

// Export Section Attendance Matrix CSV
router.get('/:id/export-csv', authenticate, (req, res) => {
  try {
    const { id } = req.params;
    const result = generateSectionAttendanceCSV(id);

    if (!result) {
      return res.status(404).json({ error: 'Section not found' });
    }

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="${result.filename}"`);
    res.send(result.content);
  } catch (err) {
    res.status(500).json({ error: 'Failed to export section CSV: ' + err.message });
  }
});

export default router;

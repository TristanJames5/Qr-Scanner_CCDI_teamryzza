import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db, { logAdminAction } from '../config/db.js';
import { authenticate, authorize } from '../middleware/auth.js';
import bcrypt from 'bcryptjs';

const router = express.Router();

router.use(authenticate);
router.use(authorize('instructor'));

// -----------------------------------------------------------------
// 1. Subjects Management (Global for all instructors)
// -----------------------------------------------------------------
router.get('/subjects', (req, res) => {
  try {
    const subjects = db.prepare(`
      SELECT sub.*, 
             (SELECT COUNT(*) FROM sections WHERE subject_id = sub.id) as sections_count
      FROM subjects sub 
      ORDER BY sub.code ASC
    `).all();
    res.json({ subjects });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch subjects: ' + err.message });
  }
});

router.post('/subjects', (req, res) => {
  try {
    const { code, title, units, description } = req.body;
    if (!code || !title) return res.status(400).json({ error: 'Subject code and title are required' });

    const cleanCode = code.trim().toUpperCase();
    const cleanTitle = title.trim();

    const existing = db.prepare('SELECT id FROM subjects WHERE code = ?').get(cleanCode);
    if (existing) return res.status(409).json({ error: `A subject with code "${cleanCode}" already exists.` });

    const id = uuidv4();
    db.prepare(`INSERT INTO subjects (id, code, title, units, description) VALUES (?, ?, ?, ?, ?)`).run(id, cleanCode, cleanTitle, parseInt(units) || 3, (description || '').trim());

    res.status(201).json({ message: 'Subject created successfully', subject: { id, code: cleanCode, title: cleanTitle, units: parseInt(units) || 3, description } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create subject: ' + err.message });
  }
});

router.put('/subjects/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { code, title, units, description } = req.body;

    const subject = db.prepare('SELECT * FROM subjects WHERE id = ?').get(id);
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    const cleanCode = code ? code.trim().toUpperCase() : subject.code;
    const cleanTitle = title ? title.trim() : subject.title;
    const cleanUnits = units !== undefined ? parseInt(units) || 3 : subject.units;
    const cleanDesc = description !== undefined ? description.trim() : subject.description;

    const conflict = db.prepare('SELECT id FROM subjects WHERE code = ? AND id != ?').get(cleanCode, id);
    if (conflict) return res.status(409).json({ error: `Subject code "${cleanCode}" is already taken.` });

    db.prepare(`UPDATE subjects SET code = ?, title = ?, units = ?, description = ? WHERE id = ?`).run(cleanCode, cleanTitle, cleanUnits, cleanDesc, id);

    res.json({ message: 'Subject updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update subject: ' + err.message });
  }
});

router.delete('/subjects/:id', (req, res) => {
  try {
    const { id } = req.params;
    const subject = db.prepare('SELECT * FROM subjects WHERE id = ?').get(id);
    if (!subject) return res.status(404).json({ error: 'Subject not found' });

    db.prepare('DELETE FROM subjects WHERE id = ?').run(id);

    res.json({ message: `Subject deleted successfully` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete subject: ' + err.message });
  }
});

// -----------------------------------------------------------------
// 2. Sections Management (Only their own)
// -----------------------------------------------------------------
router.get('/sections', (req, res) => {
  try {
    const sections = db.prepare(`
      SELECT s.*, 
             sub.code as subject_code, sub.title as subject_title, sub.units,
             u.id_number as instructor_id_number, u.name as instructor_name, u.email as instructor_email,
             (SELECT COUNT(*) FROM enrollments WHERE section_id = s.id) as enrolled_count,
             (SELECT COUNT(*) FROM class_sessions WHERE section_id = s.id AND status = 'closed') as closed_sessions_count,
             (SELECT COUNT(*) FROM class_sessions WHERE section_id = s.id) as total_sessions_count,
             (SELECT id FROM class_sessions WHERE section_id = s.id AND status = 'active' LIMIT 1) as active_session_id
      FROM sections s
      JOIN subjects sub ON s.subject_id = sub.id
      LEFT JOIN users u ON s.instructor_id = u.id
      WHERE s.instructor_id = ?
      ORDER BY sub.code ASC, s.name ASC
    `).all(req.user.id);

    res.json({ sections });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sections: ' + err.message });
  }
});

router.post('/sections', (req, res) => {
  try {
    const { name, subject_id, academic_term, room, schedule } = req.body;
    if (!name || !subject_id || !academic_term || !room || !schedule) {
      return res.status(400).json({ error: 'Please fill in section name, subject, academic term, room, and schedule.' });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO sections (id, name, subject_id, instructor_id, academic_term, room, schedule)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, name.trim(), subject_id, req.user.id, academic_term.trim(), room.trim(), schedule.trim());

    res.status(201).json({ message: 'Section created successfully', sectionId: id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create section: ' + err.message });
  }
});

router.put('/sections/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, subject_id, academic_term, room, schedule } = req.body;

    const section = db.prepare('SELECT * FROM sections WHERE id = ?').get(id);
    if (!section) return res.status(404).json({ error: 'Section not found' });
    if (section.instructor_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    db.prepare(`
      UPDATE sections
      SET name = ?, subject_id = ?, academic_term = ?, room = ?, schedule = ?
      WHERE id = ?
    `).run(
      name ? name.trim() : section.name,
      subject_id || section.subject_id,
      academic_term ? academic_term.trim() : section.academic_term,
      room ? room.trim() : section.room,
      schedule ? schedule.trim() : section.schedule,
      id
    );

    res.json({ message: 'Section updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update section: ' + err.message });
  }
});

router.delete('/sections/:id', (req, res) => {
  try {
    const { id } = req.params;
    const section = db.prepare('SELECT id, instructor_id FROM sections WHERE id = ?').get(id);
    if (!section) return res.status(404).json({ error: 'Section not found' });
    if (section.instructor_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    db.prepare('DELETE FROM sections WHERE id = ?').run(id);

    res.json({ message: `Section deleted successfully` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete section: ' + err.message });
  }
});

// -----------------------------------------------------------------
// 3. Section Roster Management
// -----------------------------------------------------------------
router.get('/sections/:id/roster', (req, res) => {
  try {
    const { id } = req.params;
    const section = db.prepare(`SELECT * FROM sections WHERE id = ?`).get(id);
    if (!section) return res.status(404).json({ error: 'Section not found' });
    if (section.instructor_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    const roster = db.prepare(`
      SELECT u.id, u.id_number, u.name, u.email, u.department, u.avatar_url, e.enrolled_at,
             (SELECT COUNT(*) FROM attendance_records ar JOIN class_sessions cs ON ar.session_id = cs.id WHERE ar.student_id = u.id AND cs.section_id = ? AND ar.status = 'present') as present_count,
             (SELECT COUNT(*) FROM attendance_records ar JOIN class_sessions cs ON ar.session_id = cs.id WHERE ar.student_id = u.id AND cs.section_id = ? AND ar.status = 'late') as late_count,
             (SELECT COUNT(*) FROM attendance_records ar JOIN class_sessions cs ON ar.session_id = cs.id WHERE ar.student_id = u.id AND cs.section_id = ? AND ar.status = 'absent') as absent_count,
             (SELECT COUNT(*) FROM attendance_records ar JOIN class_sessions cs ON ar.session_id = cs.id WHERE ar.student_id = u.id AND cs.section_id = ? AND ar.status = 'excused') as excused_count
      FROM enrollments e
      JOIN users u ON e.student_id = u.id
      WHERE e.section_id = ?
      ORDER BY u.name ASC
    `).all(id, id, id, id, id);

    res.json({ section, roster });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch section roster: ' + err.message });
  }
});

router.post('/sections/:id/enroll', (req, res) => {
  try {
    const { id: sectionId } = req.params;
    const { student_identifier } = req.body;
    
    const section = db.prepare('SELECT instructor_id FROM sections WHERE id = ?').get(sectionId);
    if (!section || section.instructor_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    if (!student_identifier) return res.status(400).json({ error: 'Please provide a student ID number, email, or user ID.' });

    const trimmed = student_identifier.trim();
    const student = db.prepare(`SELECT id, id_number, name, email FROM users WHERE (LOWER(id_number) = LOWER(?) OR LOWER(email) = LOWER(?) OR id = ?) AND role = 'student'`).get(trimmed, trimmed, trimmed);

    if (!student) return res.status(404).json({ error: `Student with ID/Email "${trimmed}" not found in system.` });

    const existing = db.prepare('SELECT id FROM enrollments WHERE section_id = ? AND student_id = ?').get(sectionId, student.id);
    if (existing) return res.status(409).json({ error: `${student.name} is already enrolled.` });

    db.prepare('INSERT INTO enrollments (id, student_id, section_id) VALUES (?, ?, ?)').run(uuidv4(), student.id, sectionId);

    res.status(201).json({ message: `Enrolled ${student.name} successfully!`, student });
  } catch (err) {
    res.status(500).json({ error: 'Failed to enroll student: ' + err.message });
  }
});

router.delete('/sections/:id/enroll/:studentId', (req, res) => {
  try {
    const { id: sectionId, studentId } = req.params;
    const section = db.prepare('SELECT instructor_id FROM sections WHERE id = ?').get(sectionId);
    if (!section || section.instructor_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    db.prepare('DELETE FROM enrollments WHERE section_id = ? AND student_id = ?').run(sectionId, studentId);
    res.json({ message: `Student removed from section successfully.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unenroll student: ' + err.message });
  }
});

// CSV Import
router.post('/sections/:id/import-roster', (req, res) => {
  try {
    const { id: sectionId } = req.params;
    const { students } = req.body;
    
    const section = db.prepare('SELECT instructor_id FROM sections WHERE id = ?').get(sectionId);
    if (!section || section.instructor_id !== req.user.id) return res.status(403).json({ error: 'Forbidden' });

    if (!Array.isArray(students) || students.length === 0) {
      return res.status(400).json({ error: 'No students provided for import.' });
    }

    let successCount = 0;
    let errorCount = 0;
    let errors = [];

    const findStudentStmt = db.prepare(`SELECT id FROM users WHERE (LOWER(id_number) = LOWER(?) OR LOWER(email) = LOWER(?)) AND role = 'student'`);
    const checkEnrollmentStmt = db.prepare(`SELECT id FROM enrollments WHERE section_id = ? AND student_id = ?`);
    const enrollStmt = db.prepare(`INSERT INTO enrollments (id, student_id, section_id) VALUES (?, ?, ?)`);
    const createStudentStmt = db.prepare(`INSERT INTO users (id, id_number, name, email, password, role) VALUES (?, ?, ?, ?, ?, 'student')`);

    db.transaction(() => {
      for (const row of students) {
        const id_num = (row.student_identifier || row.id_number || row.id || row.ID || '').toString().trim();
        const email = (row.email || row.Email || '').toString().trim();
        const name = (row.name || row.Name || '').toString().trim();

        if (!id_num && !email) {
          errorCount++;
          errors.push({ row, error: 'Missing identifier (ID or Email)' });
          continue;
        }

        let student = findStudentStmt.get(id_num, email);

        if (!student) {
          if (!id_num) {
            errorCount++;
            errors.push({ row, error: 'Cannot auto-create student without an ID Number.' });
            continue;
          }
          const defaultPassword = bcrypt.hashSync('ccdi123', 10);
          const newId = uuidv4();
          createStudentStmt.run(newId, id_num, name || id_num, email || `${id_num.toLowerCase()}@ccdi.edu.ph`, defaultPassword);
          student = { id: newId };
        }

        const isEnrolled = checkEnrollmentStmt.get(sectionId, student.id);
        if (isEnrolled) {
          successCount++; 
          continue;
        }

        enrollStmt.run(uuidv4(), student.id, sectionId);
        successCount++;
      }
    })();

    res.status(200).json({
      message: \`Successfully processed \${successCount} students. (\${errorCount} failed)\`,
      successCount,
      errorCount,
      errors
    });

  } catch (err) {
    res.status(500).json({ error: 'Failed to import roster: ' + err.message });
  }
});

export default router;

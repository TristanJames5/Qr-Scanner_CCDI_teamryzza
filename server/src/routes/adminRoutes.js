import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db, { logAdminAction } from '../config/db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes in this file require Admin role
router.use(authenticate);
router.use(authorize('admin'));

// -----------------------------------------------------------------
// 1. Users Management (CRUD & Reset Password)
// -----------------------------------------------------------------
router.get('/users', (req, res) => {
  try {
    const { role, search } = req.query;
    let query = 'SELECT id, id_number, name, email, role, department, avatar_url, created_at FROM users';
    const params = [];
    const conditions = [];

    if (role) {
      conditions.push('role = ?');
      params.push(role);
    }
    if (search) {
      conditions.push('(LOWER(name) LIKE ? OR LOWER(id_number) LIKE ? OR LOWER(email) LIKE ?)');
      const s = `%${search.toLowerCase()}%`;
      params.push(s, s, s);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY role ASC, name ASC';

    const users = db.prepare(query).all(...params);
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users: ' + err.message });
  }
});

router.post('/users', (req, res) => {
  try {
    const { id_number, name, email, password, role, department } = req.body;
    if (!name || !email || !password || !role) {
      return res.status(400).json({ error: 'Missing required fields (name, email, password, role)' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanRole = role.toLowerCase();
    const cleanDept = (department || '').trim() || (cleanRole === 'student' ? 'College of Information & Communications Technology' : 'Information Technology Department');

    // Generate ID number if omitted
    const prefix = cleanRole === 'admin' ? 'ADM' : cleanRole === 'instructor' ? 'INST' : '2023';
    const cleanIdNumber = (id_number || '').trim() || `${prefix}-${Math.floor(10000 + Math.random() * 90000)}`;

    const existing = db.prepare('SELECT id FROM users WHERE LOWER(email) = ? OR LOWER(id_number) = ?').get(cleanEmail, cleanIdNumber.toLowerCase());
    if (existing) {
      return res.status(409).json({ error: 'User with this email or ID number already exists.' });
    }

    const userId = uuidv4();
    const hash = bcrypt.hashSync(password, 10);
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanIdNumber)}`;

    db.prepare(`
      INSERT INTO users (id, id_number, name, email, password_hash, role, department, avatar_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, cleanIdNumber, cleanName, cleanEmail, hash, cleanRole, cleanDept, avatar);

    logAdminAction(req.user.id, req.user.name, 'CREATE_USER', 'USER', userId, {
      id_number: cleanIdNumber,
      name: cleanName,
      email: cleanEmail,
      role: cleanRole,
      department: cleanDept
    });

    res.status(201).json({
      message: 'User created successfully',
      user: { id: userId, id_number: cleanIdNumber, name: cleanName, email: cleanEmail, role: cleanRole, department: cleanDept, avatar_url: avatar }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user: ' + err.message });
  }
});

router.put('/users/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { id_number, name, email, role, department, password } = req.body;

    const user = db.prepare('SELECT * FROM users WHERE id = ?').get(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const cleanName = name ? name.trim() : user.name;
    const cleanEmail = email ? email.trim().toLowerCase() : user.email;
    const cleanIdNumber = id_number ? id_number.trim() : user.id_number;
    const cleanRole = role ? role.toLowerCase() : user.role;
    const cleanDept = department ? department.trim() : user.department;

    // Check unique duplicate conflict
    const conflict = db.prepare('SELECT id FROM users WHERE (LOWER(email) = ? OR LOWER(id_number) = ?) AND id != ?').get(cleanEmail, cleanIdNumber.toLowerCase(), id);
    if (conflict) {
      return res.status(409).json({ error: 'Another user already uses this email or ID number.' });
    }

    let passwordHash = user.password_hash;
    if (password && password.trim().length >= 6) {
      passwordHash = bcrypt.hashSync(password.trim(), 10);
    }

    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanIdNumber)}`;

    db.prepare(`
      UPDATE users 
      SET id_number = ?, name = ?, email = ?, password_hash = ?, role = ?, department = ?, avatar_url = ?
      WHERE id = ?
    `).run(cleanIdNumber, cleanName, cleanEmail, passwordHash, cleanRole, cleanDept, avatar, id);

    logAdminAction(req.user.id, req.user.name, 'UPDATE_USER', 'USER', id, {
      id_number: cleanIdNumber,
      name: cleanName,
      email: cleanEmail,
      role: cleanRole,
      department: cleanDept
    });

    res.json({
      message: 'User updated successfully',
      user: { id, id_number: cleanIdNumber, name: cleanName, email: cleanEmail, role: cleanRole, department: cleanDept, avatar_url: avatar }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update user: ' + err.message });
  }
});

router.delete('/users/:id', (req, res) => {
  try {
    const { id } = req.params;
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own admin account.' });
    }

    const user = db.prepare('SELECT id, id_number, name, email, role FROM users WHERE id = ?').get(id);
    if (!user) return res.status(404).json({ error: 'User not found' });

    db.prepare('DELETE FROM users WHERE id = ?').run(id);

    logAdminAction(req.user.id, req.user.name, 'DELETE_USER', 'USER', id, user);

    res.json({ message: `User "${user.name}" (${user.id_number}) deleted successfully` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user: ' + err.message });
  }
});

// -----------------------------------------------------------------
// 2. Subjects Management (CRUD)
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
    if (!code || !title) {
      return res.status(400).json({ error: 'Subject code and title are required' });
    }

    const cleanCode = code.trim().toUpperCase();
    const cleanTitle = title.trim();

    const existing = db.prepare('SELECT id FROM subjects WHERE code = ?').get(cleanCode);
    if (existing) {
      return res.status(409).json({ error: `A subject with code "${cleanCode}" already exists.` });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO subjects (id, code, title, units, description)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, cleanCode, cleanTitle, parseInt(units) || 3, (description || '').trim());

    logAdminAction(req.user.id, req.user.name, 'CREATE_SUBJECT', 'SUBJECT', id, { code: cleanCode, title: cleanTitle, units });

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
    if (conflict) {
      return res.status(409).json({ error: `Subject code "${cleanCode}" is already taken.` });
    }

    db.prepare(`
      UPDATE subjects 
      SET code = ?, title = ?, units = ?, description = ?
      WHERE id = ?
    `).run(cleanCode, cleanTitle, cleanUnits, cleanDesc, id);

    logAdminAction(req.user.id, req.user.name, 'UPDATE_SUBJECT', 'SUBJECT', id, { code: cleanCode, title: cleanTitle, units: cleanUnits });

    res.json({ message: 'Subject updated successfully', subject: { id, code: cleanCode, title: cleanTitle, units: cleanUnits, description: cleanDesc } });
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

    logAdminAction(req.user.id, req.user.name, 'DELETE_SUBJECT', 'SUBJECT', id, subject);

    res.json({ message: `Subject "${subject.code} - ${subject.title}" deleted successfully` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete subject: ' + err.message });
  }
});

// -----------------------------------------------------------------
// 3. Sections Management & Full Control (CRUD & Details)
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
      ORDER BY sub.code ASC, s.name ASC
    `).all();

    res.json({ sections });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch sections: ' + err.message });
  }
});

router.post('/sections', (req, res) => {
  try {
    const { name, subject_id, instructor_id, instructor_id_number, academic_term, room, schedule } = req.body;
    if (!name || !subject_id || !academic_term || !room || !schedule) {
      return res.status(400).json({ error: 'Please fill in section name, subject, academic term, room, and schedule.' });
    }

    let finalInstructorId = instructor_id || null;
    if (instructor_id_number && !finalInstructorId) {
      const inst = db.prepare("SELECT id FROM users WHERE LOWER(id_number) = LOWER(?) AND role IN ('instructor', 'admin')").get(instructor_id_number.trim());
      if (inst) finalInstructorId = inst.id;
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO sections (id, name, subject_id, instructor_id, academic_term, room, schedule)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, name.trim(), subject_id, finalInstructorId, academic_term.trim(), room.trim(), schedule.trim());

    logAdminAction(req.user.id, req.user.name, 'CREATE_SECTION', 'SECTION', id, {
      name,
      subject_id,
      instructor_id: finalInstructorId,
      academic_term,
      room,
      schedule
    });

    res.status(201).json({ message: 'Section created successfully', sectionId: id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create section: ' + err.message });
  }
});

router.put('/sections/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { name, subject_id, instructor_id, instructor_id_number, academic_term, room, schedule } = req.body;

    const section = db.prepare('SELECT * FROM sections WHERE id = ?').get(id);
    if (!section) return res.status(404).json({ error: 'Section not found' });

    let finalInstructorId = instructor_id !== undefined ? instructor_id : section.instructor_id;
    if (instructor_id_number) {
      const inst = db.prepare("SELECT id FROM users WHERE LOWER(id_number) = LOWER(?) AND role IN ('instructor', 'admin')").get(instructor_id_number.trim());
      if (inst) finalInstructorId = inst.id;
    }

    db.prepare(`
      UPDATE sections
      SET name = ?, subject_id = ?, instructor_id = ?, academic_term = ?, room = ?, schedule = ?
      WHERE id = ?
    `).run(
      name ? name.trim() : section.name,
      subject_id || section.subject_id,
      finalInstructorId,
      academic_term ? academic_term.trim() : section.academic_term,
      room ? room.trim() : section.room,
      schedule ? schedule.trim() : section.schedule,
      id
    );

    logAdminAction(req.user.id, req.user.name, 'UPDATE_SECTION', 'SECTION', id, {
      name,
      subject_id,
      instructor_id: finalInstructorId,
      room,
      schedule
    });

    res.json({ message: 'Section updated successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update section: ' + err.message });
  }
});

router.delete('/sections/:id', (req, res) => {
  try {
    const { id } = req.params;
    const section = db.prepare('SELECT id, name FROM sections WHERE id = ?').get(id);
    if (!section) return res.status(404).json({ error: 'Section not found' });

    db.prepare('DELETE FROM sections WHERE id = ?').run(id);

    logAdminAction(req.user.id, req.user.name, 'DELETE_SECTION', 'SECTION', id, section);

    res.json({ message: `Section "${section.name}" deleted successfully` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete section: ' + err.message });
  }
});

// -----------------------------------------------------------------
// 4. Section Roster & Quick ID Enrollment / Reassignment
// -----------------------------------------------------------------
router.get('/sections/:id/roster', (req, res) => {
  try {
    const { id } = req.params;
    const section = db.prepare(`
      SELECT s.*, sub.code as subject_code, sub.title as subject_title, u.name as instructor_name, u.id_number as instructor_id_number
      FROM sections s
      JOIN subjects sub ON s.subject_id = sub.id
      LEFT JOIN users u ON s.instructor_id = u.id
      WHERE s.id = ?
    `).get(id);

    if (!section) return res.status(404).json({ error: 'Section not found' });

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

// Enroll student by Student ID number or Student UUID
router.post('/sections/:id/enroll', (req, res) => {
  try {
    const { id: sectionId } = req.params;
    const { student_identifier } = req.body;

    if (!student_identifier) {
      return res.status(400).json({ error: 'Please provide a student ID number, email, or user ID.' });
    }

    const trimmed = student_identifier.trim();
    const student = db.prepare(`
      SELECT id, id_number, name, email FROM users 
      WHERE (LOWER(id_number) = LOWER(?) OR LOWER(email) = LOWER(?) OR id = ?) AND role = 'student'
    `).get(trimmed, trimmed, trimmed);

    if (!student) {
      return res.status(404).json({ error: `Student with ID/Email "${trimmed}" not found in system.` });
    }

    const existing = db.prepare('SELECT id FROM enrollments WHERE section_id = ? AND student_id = ?').get(sectionId, student.id);
    if (existing) {
      return res.status(409).json({ error: `${student.name} (${student.id_number}) is already enrolled in this section.` });
    }

    const enrollmentId = uuidv4();
    db.prepare('INSERT INTO enrollments (id, student_id, section_id) VALUES (?, ?, ?)').run(enrollmentId, student.id, sectionId);

    logAdminAction(req.user.id, req.user.name, 'ENROLL_STUDENT', 'SECTION', sectionId, {
      student_id: student.id,
      student_id_number: student.id_number,
      student_name: student.name
    });

    res.status(201).json({
      message: `Enrolled ${student.name} (${student.id_number}) successfully!`,
      student
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to enroll student: ' + err.message });
  }
});

// Remove student from section
router.delete('/sections/:id/enroll/:studentId', (req, res) => {
  try {
    const { id: sectionId, studentId } = req.params;

    const student = db.prepare('SELECT id, id_number, name FROM users WHERE id = ?').get(studentId);

    db.prepare('DELETE FROM enrollments WHERE section_id = ? AND student_id = ?').run(sectionId, studentId);

    logAdminAction(req.user.id, req.user.name, 'UNENROLL_STUDENT', 'SECTION', sectionId, {
      student_id: studentId,
      student_name: student?.name,
      student_id_number: student?.id_number
    });

    res.json({ message: `Student removed from section successfully.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to unenroll student: ' + err.message });
  }
});

// Assign / Reassign Instructor via ID Number or UUID
router.patch('/sections/:id/instructor', (req, res) => {
  try {
    const { id: sectionId } = req.params;
    const { instructor_identifier } = req.body;

    let instructor = null;
    if (instructor_identifier) {
      const trimmed = instructor_identifier.trim();
      instructor = db.prepare(`
        SELECT id, id_number, name, email FROM users 
        WHERE (LOWER(id_number) = LOWER(?) OR LOWER(email) = LOWER(?) OR id = ?) AND role IN ('instructor', 'admin')
      `).get(trimmed, trimmed, trimmed);

      if (!instructor) {
        return res.status(404).json({ error: `Instructor with identifier "${trimmed}" not found.` });
      }
    }

    db.prepare('UPDATE sections SET instructor_id = ? WHERE id = ?').run(instructor ? instructor.id : null, sectionId);

    logAdminAction(req.user.id, req.user.name, 'REASSIGN_INSTRUCTOR', 'SECTION', sectionId, {
      instructor_id: instructor?.id || null,
      instructor_name: instructor?.name || 'Unassigned',
      instructor_id_number: instructor?.id_number || 'N/A'
    });

    res.json({
      message: instructor ? `Assigned ${instructor.name} (${instructor.id_number}) to section.` : 'Section instructor unassigned.',
      instructor
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to reassign instructor: ' + err.message });
  }
});

// Export Roster CSV
router.get('/sections/:id/export-roster', (req, res) => {
  try {
    const { id: sectionId } = req.params;
    const section = db.prepare('SELECT name FROM sections WHERE id = ?').get(sectionId);
    if (!section) return res.status(404).json({ error: 'Section not found' });

    const roster = db.prepare(`
      SELECT u.id_number, u.name, u.email, u.department, e.enrolled_at
      FROM enrollments e
      JOIN users u ON e.student_id = u.id
      WHERE e.section_id = ?
      ORDER BY u.name ASC
    `).all(sectionId);

    let csv = 'Student ID,Full Name,Institutional Email,Department,Enrolled Date\n';
    roster.forEach(r => {
      csv += `"${r.id_number}","${r.name}","${r.email}","${r.department || ''}","${r.enrolled_at || ''}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', `attachment; filename="Roster_${section.name.replace(/\s+/g, '_')}.csv"`);
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: 'Failed to export roster: ' + err.message });
  }
});

// -----------------------------------------------------------------
// 5. Autocomplete & Search Lookups (Unique ID search)
// -----------------------------------------------------------------
router.get('/lookup/students', (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) {
      const topStudents = db.prepare("SELECT id, id_number, name, email, department FROM users WHERE role = 'student' ORDER BY name ASC LIMIT 10").all();
      return res.json({ students: topStudents });
    }

    const s = `%${q.toLowerCase()}%`;
    const students = db.prepare(`
      SELECT id, id_number, name, email, department 
      FROM users 
      WHERE role = 'student' AND (LOWER(id_number) LIKE ? OR LOWER(name) LIKE ? OR LOWER(email) LIKE ?)
      ORDER BY name ASC 
      LIMIT 15
    `).all(s, s, s);

    res.json({ students });
  } catch (err) {
    res.status(500).json({ error: 'Failed to lookup students: ' + err.message });
  }
});

router.get('/lookup/instructors', (req, res) => {
  try {
    const q = (req.query.q || '').trim();
    if (!q) {
      const topInstructors = db.prepare("SELECT id, id_number, name, email, department FROM users WHERE role IN ('instructor', 'admin') ORDER BY name ASC LIMIT 15").all();
      return res.json({ instructors: topInstructors });
    }

    const s = `%${q.toLowerCase()}%`;
    const instructors = db.prepare(`
      SELECT id, id_number, name, email, department 
      FROM users 
      WHERE role IN ('instructor', 'admin') AND (LOWER(id_number) LIKE ? OR LOWER(name) LIKE ? OR LOWER(email) LIKE ?)
      ORDER BY name ASC 
      LIMIT 15
    `).all(s, s, s);

    res.json({ instructors });
  } catch (err) {
    res.status(500).json({ error: 'Failed to lookup instructors: ' + err.message });
  }
});

// Bulk CSV Roster Import
router.post('/sections/:id/import-roster', (req, res) => {
  try {
    const { id: sectionId } = req.params;
    const { csvData } = req.body;

    if (!csvData) {
      return res.status(400).json({ error: 'No CSV data provided' });
    }

    const section = db.prepare('SELECT id, name FROM sections WHERE id = ?').get(sectionId);
    if (!section) {
      return res.status(404).json({ error: 'Section not found' });
    }

    let rows = [];
    if (typeof csvData === 'string') {
      const lines = csvData.trim().split(/\r?\n/);
      const startIdx = (lines[0].toLowerCase().includes('id') || lines[0].toLowerCase().includes('name')) ? 1 : 0;
      for (let i = startIdx; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
        if (parts.length >= 3) {
          rows.push({ id_number: parts[0], name: parts[1], email: parts[2] });
        } else if (parts.length === 2) {
          rows.push({ id_number: parts[0], name: parts[1], email: `${parts[0].toLowerCase().replace(/[^a-z0-9]/g, '')}@ccdi.edu.ph` });
        } else if (parts.length === 1 && parts[0]) {
          rows.push({ id_number: parts[0], name: `Student ${parts[0]}`, email: `${parts[0].toLowerCase().replace(/[^a-z0-9]/g, '')}@ccdi.edu.ph` });
        }
      }
    } else if (Array.isArray(csvData)) {
      rows = csvData;
    }

    let enrolledCount = 0;
    let newlyCreatedUsers = 0;
    const defaultPasswordHash = bcrypt.hashSync('student123', 10);

    for (const row of rows) {
      if (!row.id_number) continue;

      let student = db.prepare('SELECT id FROM users WHERE id_number = ? OR email = ?').get(row.id_number, row.email || '');

      if (!student) {
        const newId = uuidv4();
        const email = row.email || `${row.id_number.toLowerCase().replace(/[^a-z0-9]/g, '')}@ccdi.edu.ph`;
        const name = row.name || `Student ${row.id_number}`;
        const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(row.id_number)}`;

        db.prepare(`
          INSERT INTO users (id, id_number, name, email, password_hash, role, department, avatar_url)
          VALUES (?, ?, ?, ?, ?, 'student', 'College of ICT', ?)
        `).run(newId, row.id_number, name, email, defaultPasswordHash, avatar);

        student = { id: newId };
        newlyCreatedUsers++;
      }

      const alreadyEnrolled = db.prepare('SELECT id FROM enrollments WHERE student_id = ? AND section_id = ?').get(student.id, sectionId);
      if (!alreadyEnrolled) {
        db.prepare('INSERT INTO enrollments (id, student_id, section_id) VALUES (?, ?, ?)').run(uuidv4(), student.id, sectionId);
        enrolledCount++;
      }
    }

    logAdminAction(req.user.id, req.user.name, 'IMPORT_ROSTER_CSV', 'SECTION', sectionId, {
      enrolledCount,
      newlyCreatedUsers,
      totalRows: rows.length
    });

    res.json({
      message: `Roster import complete! Enrolled ${enrolledCount} students into ${section.name}. (${newlyCreatedUsers} new student accounts created).`,
      enrolledCount,
      newlyCreatedUsers
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to import roster: ' + err.message });
  }
});

// -----------------------------------------------------------------
// 6. Security & Audit Logs (Admin Actions & QR Scan Telemetry)
// -----------------------------------------------------------------
router.get('/audit-logs', (req, res) => {
  try {
    const { action, search, limit = 50, offset = 0 } = req.query;
    let query = 'SELECT * FROM admin_audit_logs';
    const params = [];
    const conditions = [];

    if (action) {
      conditions.push('action = ?');
      params.push(action);
    }
    if (search) {
      conditions.push('(LOWER(admin_name) LIKE ? OR LOWER(action) LIKE ? OR LOWER(target_type) LIKE ? OR LOWER(details) LIKE ?)');
      const s = `%${search.toLowerCase()}%`;
      params.push(s, s, s, s);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY timestamp DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit) || 50, parseInt(offset) || 0);

    const logs = db.prepare(query).all(...params);
    const totalCount = db.prepare('SELECT COUNT(*) as c FROM admin_audit_logs').get().c;

    res.json({ logs, totalCount });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch audit logs: ' + err.message });
  }
});

router.get('/scan-logs', (req, res) => {
  try {
    const { status, search, limit = 60, offset = 0 } = req.query;
    let query = `
      SELECT ar.id, ar.scanned_at, ar.status, ar.method, ar.ip_address, ar.user_agent,
             u.id_number, u.name as student_name, u.email as student_email,
             cs.date as session_date,
             s.name as section_name, sub.code as subject_code
      FROM attendance_records ar
      JOIN users u ON ar.student_id = u.id
      JOIN class_sessions cs ON ar.session_id = cs.id
      JOIN sections s ON cs.section_id = s.id
      JOIN subjects sub ON s.subject_id = sub.id
    `;
    const params = [];
    const conditions = [];

    if (status) {
      conditions.push('ar.status = ?');
      params.push(status);
    }
    if (search) {
      conditions.push('(LOWER(u.name) LIKE ? OR LOWER(u.id_number) LIKE ? OR LOWER(s.name) LIKE ? OR LOWER(sub.code) LIKE ? OR LOWER(ar.ip_address) LIKE ?)');
      const s = `%${search.toLowerCase()}%`;
      params.push(s, s, s, s, s);
    }

    if (conditions.length > 0) {
      query += ' WHERE ' + conditions.join(' AND ');
    }
    query += ' ORDER BY ar.scanned_at DESC LIMIT ? OFFSET ?';
    params.push(parseInt(limit) || 60, parseInt(offset) || 0);

    const logs = db.prepare(query).all(...params);
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch scan logs: ' + err.message });
  }
});

router.get('/audit-logs/export', (req, res) => {
  try {
    const logs = db.prepare('SELECT * FROM admin_audit_logs ORDER BY timestamp DESC LIMIT 1000').all();
    let csv = 'Timestamp,Admin Name,Action,Target Type,Target ID,Details\n';
    logs.forEach(l => {
      csv += `"${l.timestamp}","${l.admin_name || 'Admin'}","${l.action}","${l.target_type}","${l.target_id || ''}","${(l.details || '').replace(/"/g, '""')}"\n`;
    });
    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="Admin_Audit_Logs.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: 'Failed to export audit logs: ' + err.message });
  }
});

router.get('/scan-logs/export', (req, res) => {
  try {
    const logs = db.prepare(`
      SELECT ar.scanned_at, ar.status, ar.method, ar.ip_address, ar.user_agent,
             u.id_number, u.name as student_name,
             cs.date as session_date,
             s.name as section_name, sub.code as subject_code
      FROM attendance_records ar
      JOIN users u ON ar.student_id = u.id
      JOIN class_sessions cs ON ar.session_id = cs.id
      JOIN sections s ON cs.section_id = s.id
      JOIN subjects sub ON s.subject_id = sub.id
      ORDER BY ar.scanned_at DESC
      LIMIT 2000
    `).all();

    let csv = 'Timestamp,Student ID,Student Name,Subject,Section,Session Date,Status,Method,IP Address,Device/User Agent\n';
    logs.forEach(l => {
      csv += `"${l.scanned_at}","${l.id_number}","${l.student_name}","${l.subject_code}","${l.section_name}","${l.session_date}","${l.status}","${l.method}","${l.ip_address || ''}","${(l.user_agent || '').replace(/"/g, '""')}"\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="QR_Scan_Telemetry_Logs.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: 'Failed to export scan logs: ' + err.message });
  }
});

// -----------------------------------------------------------------
// 7. Communication Tools (Announcements, Absence Excuses, Alerts)
// -----------------------------------------------------------------
router.get('/announcements', (req, res) => {
  try {
    const announcements = db.prepare('SELECT * FROM announcements ORDER BY created_at DESC LIMIT 50').all();
    res.json({ announcements });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch announcements: ' + err.message });
  }
});

router.post('/announcements', (req, res) => {
  try {
    const { title, content, target_audience = 'all', priority = 'normal' } = req.body;
    if (!title || !content) {
      return res.status(400).json({ error: 'Title and content are required' });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO announcements (id, author_id, author_name, title, content, target_audience, priority)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, req.user.id, req.user.name, title.trim(), content.trim(), target_audience, priority);

    logAdminAction(req.user.id, req.user.name, 'BROADCAST_ANNOUNCEMENT', 'ANNOUNCEMENT', id, { title, target_audience, priority });

    res.status(201).json({ message: 'Announcement published successfully', id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create announcement: ' + err.message });
  }
});

router.delete('/announcements/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM announcements WHERE id = ?').run(id);
    logAdminAction(req.user.id, req.user.name, 'DELETE_ANNOUNCEMENT', 'ANNOUNCEMENT', id, {});
    res.json({ message: 'Announcement deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete announcement: ' + err.message });
  }
});

// Absence Excuses & Feedback Management
router.get('/absence-excuses', (req, res) => {
  try {
    const excuses = db.prepare(`
      SELECT aer.*,
             u.id_number as student_id_number, u.name as student_name, u.email as student_email,
             cs.date as session_date, cs.start_time,
             sec.name as section_name, sub.code as subject_code, sub.title as subject_title
      FROM absence_excuse_requests aer
      JOIN users u ON aer.student_id = u.id
      JOIN class_sessions cs ON aer.session_id = cs.id
      JOIN sections sec ON cs.section_id = sec.id
      JOIN subjects sub ON sec.subject_id = sub.id
      ORDER BY aer.created_at DESC
    `).all();

    res.json({ excuses });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch absence excuse requests: ' + err.message });
  }
});

router.post('/absence-excuses', (req, res) => {
  try {
    const { student_id, session_id, reason, documentation_url } = req.body;
    if (!student_id || !session_id || !reason) {
      return res.status(400).json({ error: 'Student ID, session ID, and excuse reason are required' });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO absence_excuse_requests (id, student_id, session_id, reason, documentation_url, status)
      VALUES (?, ?, ?, ?, ?, 'pending')
    `).run(id, student_id, session_id, reason.trim(), (documentation_url || '').trim());

    res.status(201).json({ message: 'Absence excuse request logged successfully', id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to record absence excuse: ' + err.message });
  }
});

router.patch('/absence-excuses/:id', (req, res) => {
  try {
    const { id } = req.params;
    const { status, review_notes } = req.body;

    if (!['approved', 'rejected', 'pending'].includes(status)) {
      return res.status(400).json({ error: 'Invalid status. Must be approved or rejected.' });
    }

    const excuse = db.prepare('SELECT * FROM absence_excuse_requests WHERE id = ?').get(id);
    if (!excuse) return res.status(404).json({ error: 'Excuse request not found' });

    db.prepare(`
      UPDATE absence_excuse_requests
      SET status = ?, reviewed_by = ?, review_notes = ?, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(status, req.user.id, (review_notes || '').trim(), id);

    // If approved, automatically update or insert attendance_records status to 'excused'!
    if (status === 'approved') {
      const existingRecord = db.prepare('SELECT id FROM attendance_records WHERE session_id = ? AND student_id = ?').get(excuse.session_id, excuse.student_id);
      if (existingRecord) {
        db.prepare("UPDATE attendance_records SET status = 'excused', method = 'manual_override' WHERE id = ?").run(existingRecord.id);
      } else {
        db.prepare(`
          INSERT INTO attendance_records (id, session_id, student_id, scanned_at, status, method)
          VALUES (?, ?, ?, CURRENT_TIMESTAMP, 'excused', 'manual_override')
        `).run(uuidv4(), excuse.session_id, excuse.student_id);
      }
    }

    logAdminAction(req.user.id, req.user.name, 'REVIEW_ABSENCE_EXCUSE', 'EXCUSE_REQUEST', id, { status, review_notes });

    res.json({ message: `Absence excuse ${status} successfully.` });
  } catch (err) {
    res.status(500).json({ error: 'Failed to update excuse status: ' + err.message });
  }
});

// Notifications & Alert Dispatcher
router.get('/notifications/logs', (req, res) => {
  try {
    const logs = db.prepare('SELECT * FROM notification_logs ORDER BY sent_at DESC LIMIT 100').all();
    res.json({ logs });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch notification logs: ' + err.message });
  }
});

router.post('/notifications/send-absence-alert', (req, res) => {
  try {
    const { student_id, subject = 'CCDI QRScan: Attendance Risk Alert', message, channel = 'email' } = req.body;
    if (!student_id || !message) {
      return res.status(400).json({ error: 'Student ID and message are required' });
    }

    const student = db.prepare('SELECT id, name, email, id_number FROM users WHERE id = ?').get(student_id);
    if (!student) return res.status(404).json({ error: 'Student not found' });

    const notifId = uuidv4();
    db.prepare(`
      INSERT INTO notification_logs (id, recipient_id, recipient_name, recipient_contact, channel, subject, message, status)
      VALUES (?, ?, ?, ?, ?, ?, ?, 'sent')
    `).run(notifId, student.id, student.name, student.email, channel, subject, message);

    logAdminAction(req.user.id, req.user.name, 'DISPATCH_ABSENCE_ALERT', 'NOTIFICATION', notifId, {
      student_id: student.id,
      student_name: student.name,
      channel,
      subject
    });

    res.json({
      message: `Alert successfully dispatched via ${channel.toUpperCase()} to ${student.name} (${student.email})`,
      notificationId: notifId
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to send absence alert: ' + err.message });
  }
});

// -----------------------------------------------------------------
// 8. Advanced Institutional Analytics & Forecasting
// -----------------------------------------------------------------
router.get('/analytics/advanced', (req, res) => {
  try {
    // 1. Total Metrics
    const totalStudents = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'student'").get().count;
    const totalInstructors = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'instructor'").get().count;
    const totalSections = db.prepare("SELECT COUNT(*) as count FROM sections").get().count;
    const totalSessions = db.prepare("SELECT COUNT(*) as count FROM class_sessions").get().count;
    const activeSessions = db.prepare("SELECT COUNT(*) as count FROM class_sessions WHERE status = 'active'").get().count;

    // 2. Status Breakdown
    const scanStats = db.prepare('SELECT status, COUNT(*) as count FROM attendance_records GROUP BY status').all();
    let presentCount = 0, lateCount = 0, absentCount = 0, excusedCount = 0;
    scanStats.forEach(s => {
      if (s.status === 'present') presentCount = s.count;
      if (s.status === 'late') lateCount = s.count;
      if (s.status === 'absent') absentCount = s.count;
      if (s.status === 'excused') excusedCount = s.count;
    });
    const grandTotal = presentCount + lateCount + absentCount + excusedCount;
    const overallRate = grandTotal > 0 ? Math.round(((presentCount + lateCount + excusedCount) / grandTotal) * 100) : 100;

    // 3. Top 5 Lowest Attendance Sessions (Anomalies)
    const closedSessions = db.prepare(`
      SELECT cs.id, cs.date, cs.start_time, cs.section_id,
             s.name as section_name, sub.code as subject_code, sub.title as subject_title,
             u.name as instructor_name,
             (SELECT COUNT(*) FROM enrollments WHERE section_id = s.id) as total_enrolled,
             (SELECT COUNT(*) FROM attendance_records WHERE session_id = cs.id AND status IN ('present', 'late', 'excused')) as attendees_count
      FROM class_sessions cs
      JOIN sections s ON cs.section_id = s.id
      JOIN subjects sub ON s.subject_id = sub.id
      LEFT JOIN users u ON cs.instructor_id = u.id
      WHERE cs.status = 'closed'
    `).all();

    const lowestSessions = closedSessions
      .map(cs => {
        const rate = cs.total_enrolled > 0 ? Math.round((cs.attendees_count / cs.total_enrolled) * 100) : 0;
        return { ...cs, attendance_rate: rate };
      })
      .sort((a, b) => a.attendance_rate - b.attendance_rate)
      .slice(0, 5);

    // 4. Global School-Wide At-Risk Students
    const allStudents = db.prepare("SELECT id, id_number, name, email, department FROM users WHERE role = 'student' ORDER BY name ASC").all();
    const atRiskStudents = [];

    allStudents.forEach(st => {
      const records = db.prepare(`
        SELECT ar.status, cs.date
        FROM attendance_records ar
        JOIN class_sessions cs ON ar.session_id = cs.id
        WHERE ar.student_id = ?
        ORDER BY cs.date DESC
      `).all(st.id);

      let p = 0, l = 0, a = 0, e = 0;
      records.forEach(r => {
        if (r.status === 'present') p++;
        else if (r.status === 'late') l++;
        else if (r.status === 'absent') a++;
        else if (r.status === 'excused') e++;
      });

      const total = p + l + a + e;
      const rate = total > 0 ? Math.round(((p + l + e) / total) * 100) : 100;

      // Flag if rate < 75% or absent in 3+ recent sessions
      const recentAbsences = records.slice(0, 5).filter(r => r.status === 'absent').length;

      if ((total >= 3 && rate < 75) || recentAbsences >= 3) {
        atRiskStudents.push({
          ...st,
          total_sessions: total,
          attendance_rate: rate,
          absent_count: a,
          recent_absences: recentAbsences,
          risk_level: rate < 60 || recentAbsences >= 4 ? 'CRITICAL' : 'HIGH'
        });
      }
    });

    // 5. Attendance Trends Over Time (Grouped by Date)
    const trendsByDate = db.prepare(`
      SELECT cs.date,
             COUNT(DISTINCT cs.id) as sessions_held,
             COUNT(ar.id) as total_scans,
             SUM(CASE WHEN ar.status IN ('present', 'late', 'excused') THEN 1 ELSE 0 END) as attendees_count
      FROM class_sessions cs
      LEFT JOIN attendance_records ar ON cs.id = ar.session_id
      WHERE cs.status = 'closed'
      GROUP BY cs.date
      ORDER BY cs.date ASC
      LIMIT 20
    `).all();

    const attendanceTrends = trendsByDate.map(t => {
      const rate = t.total_scans > 0 ? Math.round((t.attendees_count / t.total_scans) * 100) : 0;
      return {
        date: t.date,
        sessionsHeld: t.sessions_held,
        scansCount: t.total_scans,
        rate
      };
    });

    // 6. Predictive 3-session forecast
    let forecastTrend = [];
    if (attendanceTrends.length >= 3) {
      const last3 = attendanceTrends.slice(-3);
      const avgRate = Math.round(last3.reduce((acc, curr) => acc + curr.rate, 0) / 3);
      const lastRate = last3[last3.length - 1].rate;
      const slope = Math.round((lastRate - last3[0].rate) / 2);

      forecastTrend = [
        { label: 'Next Day +1', predictedRate: Math.max(10, Math.min(100, avgRate + slope)) },
        { label: 'Next Day +2', predictedRate: Math.max(10, Math.min(100, avgRate + slope * 2)) },
        { label: 'Next Day +3', predictedRate: Math.max(10, Math.min(100, avgRate + slope * 3)) }
      ];
    }

    // 7. Section Comparison Matrix
    const sectionComparisons = db.prepare(`
      SELECT s.id, s.name, s.room, s.schedule,
             sub.code as subject_code, sub.title as subject_title,
             u.name as instructor_name,
             (SELECT COUNT(*) FROM enrollments WHERE section_id = s.id) as enrolled_count,
             (SELECT COUNT(*) FROM class_sessions WHERE section_id = s.id AND status = 'closed') as closed_sessions
      FROM sections s
      JOIN subjects sub ON s.subject_id = sub.id
      LEFT JOIN users u ON s.instructor_id = u.id
      ORDER BY s.name ASC
    `).all().map(sec => {
      const records = db.prepare(`
        SELECT ar.status FROM attendance_records ar
        JOIN class_sessions cs ON ar.session_id = cs.id
        WHERE cs.section_id = ? AND cs.status = 'closed'
      `).all(sec.id);

      let pres = 0, lat = 0, abs = 0, exc = 0;
      records.forEach(r => {
        if (r.status === 'present') pres++;
        if (r.status === 'late') lat++;
        if (r.status === 'absent') abs++;
        if (r.status === 'excused') exc++;
      });
      const secTotal = pres + lat + abs + exc;
      const rate = secTotal > 0 ? Math.round(((pres + lat + exc) / secTotal) * 100) : 100;

      return {
        ...sec,
        rate,
        totalScans: secTotal,
        present: pres,
        late: lat,
        absent: abs,
        excused: exc
      };
    });

    // 8. Instructor Performance Metrics
    const instructorMetrics = db.prepare("SELECT id, id_number, name, email, department FROM users WHERE role = 'instructor'").all().map(inst => {
      const mySections = db.prepare('SELECT id FROM sections WHERE instructor_id = ?').all(inst.id);
      const secIds = mySections.map(s => s.id);

      let sessionsConducted = 0;
      let totalAttScans = 0;
      let onTimeScans = 0;

      if (secIds.length > 0) {
        const ph = secIds.map(() => '?').join(',');
        sessionsConducted = db.prepare(`SELECT COUNT(*) as c FROM class_sessions WHERE section_id IN (${ph}) AND status = 'closed'`).get(...secIds).c;
        const scans = db.prepare(`SELECT ar.status FROM attendance_records ar JOIN class_sessions cs ON ar.session_id = cs.id WHERE cs.section_id IN (${ph})`).all(...secIds);
        totalAttScans = scans.length;
        onTimeScans = scans.filter(s => s.status === 'present').length;
      }

      const onTimeRate = totalAttScans > 0 ? Math.round((onTimeScans / totalAttScans) * 100) : 100;

      return {
        ...inst,
        sectionsCount: mySections.length,
        sessionsConducted,
        totalScansRecorded: totalAttScans,
        onTimeRate
      };
    });

    res.json({
      summary: {
        totalStudents,
        totalInstructors,
        totalSections,
        totalSessions,
        activeSessions,
        overallRate,
        breakdown: {
          present: presentCount,
          late: lateCount,
          absent: absentCount,
          excused: excusedCount
        }
      },
      lowestSessions,
      atRiskStudents,
      attendanceTrends,
      forecastTrend,
      sectionComparisons,
      instructorMetrics
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to compute advanced analytics: ' + err.message });
  }
});

// Institutional Summary Report Export CSV
router.get('/analytics/export-report', (req, res) => {
  try {
    const sections = db.prepare(`
      SELECT s.name as section_name, s.room, s.schedule, s.academic_term,
             sub.code as subject_code, sub.title as subject_title,
             u.name as instructor_name,
             (SELECT COUNT(*) FROM enrollments WHERE section_id = s.id) as enrolled_students,
             (SELECT COUNT(*) FROM class_sessions WHERE section_id = s.id AND status = 'closed') as closed_sessions
      FROM sections s
      JOIN subjects sub ON s.subject_id = sub.id
      LEFT JOIN users u ON s.instructor_id = u.id
      ORDER BY s.name ASC
    `).all();

    let csv = 'Section,Subject Code,Subject Title,Instructor,Academic Term,Room,Schedule,Enrolled Students,Sessions Held\n';
    sections.forEach(s => {
      csv += `"${s.section_name}","${s.subject_code}","${s.subject_title}","${s.instructor_name || 'N/A'}","${s.academic_term}","${s.room}","${s.schedule}",${s.enrolled_students},${s.closed_sessions}\n`;
    });

    res.setHeader('Content-Type', 'text/csv');
    res.setHeader('Content-Disposition', 'attachment; filename="CCDI_Institutional_Attendance_Report.csv"');
    res.send(csv);
  } catch (err) {
    res.status(500).json({ error: 'Failed to export report: ' + err.message });
  }
});

export default router;

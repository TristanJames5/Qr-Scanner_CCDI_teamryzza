import express from 'express';
import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// All routes in this file require Admin role
router.use(authenticate);
router.use(authorize('admin'));

// 1. Users Management
router.get('/users', (req, res) => {
  try {
    const role = req.query.role;
    let query = 'SELECT id, id_number, name, email, role, department, avatar_url, created_at FROM users';
    let users;
    if (role) {
      query += ' WHERE role = ? ORDER BY name ASC';
      users = db.prepare(query).all(role);
    } else {
      query += ' ORDER BY role ASC, name ASC';
      users = db.prepare(query).all();
    }
    res.json({ users });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch users: ' + err.message });
  }
});

router.post('/users', (req, res) => {
  try {
    const { id_number, name, email, password, role, department } = req.body;
    if (!id_number || !name || !email || !password || !role) {
      return res.status(400).json({ error: 'Missing required fields' });
    }

    const existing = db.prepare('SELECT id FROM users WHERE email = ? OR id_number = ?').get(email, id_number);
    if (existing) {
      return res.status(409).json({ error: 'User with this email or ID number already exists.' });
    }

    const userId = uuidv4();
    const hash = bcrypt.hashSync(password, 10);
    const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${id_number}`;

    db.prepare(`
      INSERT INTO users (id, id_number, name, email, password_hash, role, department, avatar_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, id_number, name, email, hash, role, department || 'College of ICT', avatar);

    res.status(201).json({
      message: 'User created successfully',
      user: { id: userId, id_number, name, email, role, department, avatar_url: avatar }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create user: ' + err.message });
  }
});

router.delete('/users/:id', (req, res) => {
  try {
    const { id } = req.params;
    if (id === req.user.id) {
      return res.status(400).json({ error: 'Cannot delete your own admin account.' });
    }
    db.prepare('DELETE FROM users WHERE id = ?').run(id);
    res.json({ message: 'User deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete user: ' + err.message });
  }
});

// 2. Subjects Management
router.get('/subjects', (req, res) => {
  try {
    const subjects = db.prepare('SELECT * FROM subjects ORDER BY code ASC').all();
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

    const id = uuidv4();
    db.prepare(`
      INSERT INTO subjects (id, code, title, units, description)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, code.toUpperCase(), title, parseInt(units) || 3, description || '');

    res.status(201).json({ message: 'Subject created', subject: { id, code, title, units, description } });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create subject: ' + err.message });
  }
});

// 3. Sections Management
router.post('/sections', (req, res) => {
  try {
    const { name, subject_id, instructor_id, academic_term, room, schedule } = req.body;
    if (!name || !subject_id || !academic_term || !room || !schedule) {
      return res.status(400).json({ error: 'Please fill in all section details' });
    }

    const id = uuidv4();
    db.prepare(`
      INSERT INTO sections (id, name, subject_id, instructor_id, academic_term, room, schedule)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(id, name, subject_id, instructor_id || null, academic_term, room, schedule);

    res.status(201).json({ message: 'Section created successfully', sectionId: id });
  } catch (err) {
    res.status(500).json({ error: 'Failed to create section: ' + err.message });
  }
});

router.delete('/sections/:id', (req, res) => {
  try {
    const { id } = req.params;
    db.prepare('DELETE FROM sections WHERE id = ?').run(id);
    res.json({ message: 'Section deleted successfully' });
  } catch (err) {
    res.status(500).json({ error: 'Failed to delete section: ' + err.message });
  }
});

// 4. Bulk CSV Roster Import for a Section
router.post('/sections/:id/import-roster', (req, res) => {
  try {
    const { id: sectionId } = req.params;
    const { csvData } = req.body; // Array of { id_number, name, email } or raw CSV text

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
      // Skip header if it contains 'id' or 'name'
      const startIdx = (lines[0].toLowerCase().includes('id') || lines[0].toLowerCase().includes('name')) ? 1 : 0;
      for (let i = startIdx; i < lines.length; i++) {
        const parts = lines[i].split(',').map(p => p.trim().replace(/^["']|["']$/g, ''));
        if (parts.length >= 3) {
          rows.push({ id_number: parts[0], name: parts[1], email: parts[2] });
        } else if (parts.length === 2) {
          rows.push({ id_number: parts[0], name: parts[1], email: `${parts[0]}@ccdi.edu.ph` });
        }
      }
    } else if (Array.isArray(csvData)) {
      rows = csvData;
    }

    let enrolledCount = 0;
    let newlyCreatedUsers = 0;

    const defaultPasswordHash = bcrypt.hashSync('student123', 10);

    for (const row of rows) {
      if (!row.id_number || !row.name) continue;

      let student = db.prepare('SELECT id FROM users WHERE id_number = ? OR email = ?').get(row.id_number, row.email || '');

      if (!student) {
        const newId = uuidv4();
        const email = row.email || `${row.id_number.toLowerCase().replace(/[^a-z0-9]/g, '')}@ccdi.edu.ph`;
        const avatar = `https://api.dicebear.com/7.x/avataaars/svg?seed=${row.id_number}`;

        db.prepare(`
          INSERT INTO users (id, id_number, name, email, password_hash, role, department, avatar_url)
          VALUES (?, ?, ?, ?, ?, 'student', 'College of ICT', ?)
        `).run(newId, row.id_number, row.name, email, defaultPasswordHash, avatar);

        student = { id: newId };
        newlyCreatedUsers++;
      }

      // Check if already enrolled in section
      const alreadyEnrolled = db.prepare('SELECT id FROM enrollments WHERE student_id = ? AND section_id = ?').get(student.id, sectionId);
      if (!alreadyEnrolled) {
        db.prepare(`
          INSERT INTO enrollments (id, student_id, section_id)
          VALUES (?, ?, ?)
        `).run(uuidv4(), student.id, sectionId);
        enrolledCount++;
      }
    }

    res.json({
      message: `Roster import complete! Enrolled ${enrolledCount} students into ${section.name}. (${newlyCreatedUsers} new student accounts created).`,
      enrolledCount,
      newlyCreatedUsers
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to import roster: ' + err.message });
  }
});

export default router;

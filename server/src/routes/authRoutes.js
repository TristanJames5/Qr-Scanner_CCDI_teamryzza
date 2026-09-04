import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/db.js';
import { authenticate } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET || 'ccdi_qrscan_super_secure_jwt_secret_capstone_2026';

// Login with email or student ID
router.post('/login', (req, res) => {
  try {
    const { identifier, password } = req.body;
    if (!identifier || !password) {
      return res.status(400).json({ error: 'Please provide email or student ID and password' });
    }

    const trimmed = identifier.trim();
    const user = db.prepare(`
      SELECT * FROM users 
      WHERE LOWER(email) = LOWER(?) OR LOWER(id_number) = LOWER(?)
    `).get(trimmed, trimmed);

    if (!user) {
      return res.status(401).json({ error: 'Invalid credentials. User not found.' });
    }

    const isMatch = bcrypt.compareSync(password, user.password_hash);
    if (!isMatch) {
      return res.status(401).json({ error: 'Invalid credentials. Incorrect password.' });
    }

    // Self-healing: if user has missing id or avatar, fix it in DB
    if (!user.id || !user.id_number) {
      const generatedId = user.id || uuidv4();
      const prefix = user.role === 'admin' ? 'ADM' : user.role === 'instructor' ? 'INST' : '2023';
      const generatedIdNum = user.id_number || `${prefix}-${Math.floor(100 + Math.random() * 900)}`;
      const generatedAvatar = user.avatar_url || `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(generatedIdNum)}`;
      const dept = user.department || (user.role === 'student' ? 'College of Information & Communications Technology' : 'Information Technology Department');

      db.prepare(`
        UPDATE users 
        SET id = ?, id_number = ?, department = ?, avatar_url = ? 
        WHERE email = ?
      `).run(generatedId, generatedIdNum, dept, generatedAvatar, user.email);

      user.id = generatedId;
      user.id_number = generatedIdNum;
      user.department = dept;
      user.avatar_url = generatedAvatar;
    }

    const token = jwt.sign(
      {
        id: user.id,
        id_number: user.id_number,
        role: user.role,
        name: user.name
      },
      JWT_SECRET,
      { expiresIn: '7d' }
    );

    const safeUser = {
      id: user.id,
      id_number: user.id_number,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      avatar_url: user.avatar_url
    };

    res.json({
      message: 'Login successful',
      token,
      user: safeUser
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error during login: ' + err.message });
  }
});

// Get current profile
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// Demo accounts endpoint for instant capstone panel testing
router.get('/demo-accounts', (req, res) => {
  const users = db.prepare(`
    SELECT id, id_number, name, email, role, department 
    FROM users 
    ORDER BY role ASC, name ASC
  `).all();

  const accounts = {
    admin: users.filter(u => u.role === 'admin').map(u => ({ ...u, defaultPassword: 'admin123' })),
    instructors: users.filter(u => u.role === 'instructor').map(u => ({ ...u, defaultPassword: 'instructor123' })),
    students: users.filter(u => u.role === 'student').slice(0, 8).map(u => ({ ...u, defaultPassword: 'student123' }))
  };

  res.json(accounts);
});

// -----------------------------------------------------------------
// Student self-registration (public)
// -----------------------------------------------------------------
router.post('/register/student', async (req, res) => {
  try {
    const { name, id_number, email, password } = req.body;

    if (!name || !id_number || !email || !password) {
      return res.status(400).json({ error: 'All fields are required.' });
    }
    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanIdNumber = id_number.trim();
    const cleanName = name.trim();

    // Check for duplicates
    const existing = db.prepare(
      'SELECT id FROM users WHERE LOWER(email) = LOWER(?) OR LOWER(id_number) = LOWER(?)'
    ).get(cleanEmail, cleanIdNumber);

    if (existing) {
      return res.status(409).json({ error: 'A user with that Student ID or email already exists.' });
    }

    const userId = uuidv4();
    const password_hash = bcrypt.hashSync(password, 10);
    const department = 'College of Information & Communications Technology';
    const avatar_url = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(cleanIdNumber)}`;

    db.prepare(`
      INSERT INTO users (id, id_number, name, email, password_hash, role, department, avatar_url)
      VALUES (?, ?, ?, ?, ?, 'student', ?, ?)
    `).run(userId, cleanIdNumber, cleanName, cleanEmail, password_hash, department, avatar_url);

    return res.status(201).json({ 
      message: 'Student account created successfully.',
      user: { id: userId, id_number: cleanIdNumber, name: cleanName, email: cleanEmail, role: 'student' }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error during registration: ' + err.message });
  }
});

// -----------------------------------------------------------------
// Staff self-registration (invite-token-gated)
// -----------------------------------------------------------------
router.post('/register/staff', async (req, res) => {
  try {
    const { name, email, role, department, password, invite_token, id_number } = req.body;
    const STAFF_INVITE_TOKEN = process.env.STAFF_INVITE_TOKEN || 'ccdi_staff_2026';

    if (!name || !email || !role || !department || !password || !invite_token) {
      return res.status(400).json({ error: 'All fields are required.' });
    }

    // Prevent students from using this endpoint to escalate roles
    if (!['instructor', 'admin'].includes(role)) {
      return res.status(403).json({ error: 'Invalid role. Only instructor or admin roles are allowed here.' });
    }

    if (password.length < 6) {
      return res.status(400).json({ error: 'Password must be at least 6 characters.' });
    }

    // Validate invite token
    if (invite_token.trim() !== STAFF_INVITE_TOKEN) {
      return res.status(403).json({ error: 'Invalid invite token. Please contact your administrator.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();
    const cleanDept = department.trim();

    // Check for duplicate email
    const existing = db.prepare(
      'SELECT id FROM users WHERE LOWER(email) = LOWER(?)'
    ).get(cleanEmail);

    if (existing) {
      return res.status(409).json({ error: 'A user with that email already exists.' });
    }

    const userId = uuidv4();
    const prefix = role === 'admin' ? 'ADM' : 'INST';
    const randomSuffix = Math.floor(100 + Math.random() * 900);
    const staffIdNumber = id_number?.trim() || `${prefix}-${randomSuffix}`;
    const password_hash = bcrypt.hashSync(password, 10);
    const avatar_url = `https://api.dicebear.com/7.x/avataaars/svg?seed=${encodeURIComponent(staffIdNumber)}`;

    db.prepare(`
      INSERT INTO users (id, id_number, name, email, password_hash, role, department, avatar_url)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(userId, staffIdNumber, cleanName, cleanEmail, password_hash, role, cleanDept, avatar_url);

    return res.status(201).json({ 
      message: 'Staff account created successfully.',
      user: { id: userId, id_number: staffIdNumber, name: cleanName, email: cleanEmail, role, department: cleanDept }
    });
  } catch (err) {
    return res.status(500).json({ error: 'Server error during registration: ' + err.message });
  }
});

export default router;

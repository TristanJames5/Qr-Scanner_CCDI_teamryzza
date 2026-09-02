import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
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

export default router;

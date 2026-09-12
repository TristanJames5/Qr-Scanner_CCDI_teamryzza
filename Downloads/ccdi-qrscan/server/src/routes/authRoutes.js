import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import db from '../config/db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();
const JWT_SECRET = process.env.JWT_SECRET; // guaranteed by validateEnv.js at startup

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
    const isProd = process.env.NODE_ENV === 'production';
    res.status(500).json({ error: isProd ? 'Internal server error' : 'Login error: ' + err.message });
  }
});

// Get current profile
router.get('/me', authenticate, (req, res) => {
  res.json({ user: req.user });
});

// Demo accounts endpoint — admin-only, no passwords exposed
// SECURITY: guarded behind authenticate + authorize('admin')
// defaultPassword fields removed — never send credentials over the wire
router.get('/demo-accounts', authenticate, authorize('admin'), (req, res) => {
  const users = db.prepare(`
    SELECT id, id_number, name, email, role, department 
    FROM users 
    ORDER BY role ASC, name ASC
  `).all();

  const accounts = {
    admin: users.filter(u => u.role === 'admin'),
    instructors: users.filter(u => u.role === 'instructor'),
    students: users.filter(u => u.role === 'student').slice(0, 8),
  };

  res.json(accounts);
});

export default router;

import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import {
  getStudentGamificationProfile,
  getLeaderboard,
  getXPLevel
} from '../services/gamificationService.js';

const router = express.Router();

// GET /gamification/me — Student's own XP, rank, streak, badges, level
router.get('/me', authenticate, (req, res) => {
  try {
    const profile = getStudentGamificationProfile(req.user.id);
    res.json(profile);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch gamification profile: ' + err.message });
  }
});

// GET /gamification/leaderboard — School-wide top 20
router.get('/leaderboard', authenticate, (req, res) => {
  try {
    const { limit = 20 } = req.query;
    const board = getLeaderboard({ limit: parseInt(limit) || 20 });
    res.json({ leaderboard: board });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch leaderboard: ' + err.message });
  }
});

// GET /gamification/leaderboard/section/:id — Section-scoped leaderboard
router.get('/leaderboard/section/:id', authenticate, (req, res) => {
  try {
    const board = getLeaderboard({ sectionId: req.params.id, limit: 50 });
    res.json({ leaderboard: board });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch section leaderboard: ' + err.message });
  }
});

export default router;

import express from 'express';
import { authenticate } from '../middleware/auth.js';
import { getStudentGamificationProfile, getLeaderboard, awardBadgeManually, getXPLevel } from '../services/gamificationService.js';
import { TIER_NAMES, TIER_ICONS, ALL_BADGES } from '../config/badges.js';
import db from '../config/db.js';

const router = express.Router();

// GET /api/gamification/me  – full profile for the logged-in student
router.get('/me', authenticate, (req, res) => {
  try {
    const profile = getStudentGamificationProfile(req.user.id);
    res.json(profile);
  } catch (err) {
    console.error('Gamification /me error:', err);
    res.status(500).json({ error: 'Failed to fetch gamification stats' });
  }
});

// GET /api/gamification/badges/all  – full catalog (200 badges) + earned status
router.get('/badges/all', authenticate, (req, res) => {
  try {
    const earnedRows = db.prepare(`SELECT badge_key, earned_at FROM student_badges WHERE student_id = ?`).all(req.user.id);
    const earnedMap = {};
    earnedRows.forEach(r => { earnedMap[r.badge_key] = r.earned_at; });

    const tiers = {};
    ALL_BADGES.forEach(badge => {
      if (!tiers[badge.tier]) {
        tiers[badge.tier] = {
          tier: badge.tier,
          name: TIER_NAMES[badge.tier],
          icon: TIER_ICONS[badge.tier],
          badges: [],
          earnedCount: 0,
        };
      }
      const earned = !!earnedMap[badge.key];
      tiers[badge.tier].badges.push({
        key: badge.key,
        name: badge.name,
        description: badge.description,
        xp: badge.xp,
        tier: badge.tier,
        earned,
        earnedAt: earnedMap[badge.key] || null,
      });
      if (earned) tiers[badge.tier].earnedCount++;
    });

    const tierList = Object.values(tiers).sort((a, b) => a.tier - b.tier);
    const totalEarned = earnedRows.length;

    res.json({ tiers: tierList, totalBadges: ALL_BADGES.length, totalEarned });
  } catch (err) {
    console.error('Gamification /badges/all error:', err);
    res.status(500).json({ error: 'Failed to fetch badges' });
  }
});

// GET /api/gamification/leaderboard
router.get('/leaderboard', authenticate, (req, res) => {
  try {
    const { sectionId, limit } = req.query;
    const board = getLeaderboard({ sectionId, limit: parseInt(limit) || 20 });
    res.json({ leaderboard: board });
  } catch (err) {
    console.error('Leaderboard error:', err);
    res.status(500).json({ error: 'Failed to fetch leaderboard' });
  }
});

// GET /api/gamification/xp-history – student's XP log
router.get('/xp-history', authenticate, (req, res) => {
  try {
    const history = db.prepare(`
      SELECT sx.xp_earned, sx.reason, sx.created_at,
             sub.code as subject_code, sec.name as section_name
      FROM student_xp sx
      LEFT JOIN sections sec ON sx.section_id = sec.id
      LEFT JOIN subjects sub ON sec.subject_id = sub.id
      WHERE sx.student_id = ?
      ORDER BY sx.created_at DESC
      LIMIT 50
    `).all(req.user.id);
    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch XP history' });
  }
});

// POST /api/gamification/award-badge  – admin/instructor manually awards a badge
router.post('/award-badge', authenticate, (req, res) => {
  try {
    if (req.user.role !== 'admin' && req.user.role !== 'instructor') {
      return res.status(403).json({ error: 'Not authorized' });
    }
    const { studentId, badgeKey } = req.body;
    if (!studentId || !badgeKey) return res.status(400).json({ error: 'Missing studentId or badgeKey' });

    const result = awardBadgeManually(studentId, badgeKey);
    if (!result) return res.status(409).json({ error: 'Badge already awarded or badge not found' });
    res.json({ success: true, badge: result });
  } catch (err) {
    res.status(500).json({ error: 'Failed to award badge' });
  }
});

export default router;

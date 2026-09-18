import express from 'express';
import { authenticate } from '../middleware/auth.js';
import db from '../config/db.js';

const router = express.Router();

router.get('/me', authenticate, (req, res) => {
  try {
    const studentId = req.user.id;
    
    // Fetch user total XP
    const user = db.prepare('SELECT total_xp FROM users WHERE id = ?').get(studentId);
    if (!user) {
      return res.status(404).json({ error: 'User not found' });
    }

    const totalXP = user.total_xp || 0;

    // Simple leveling logic
    let levelName = 'Beginner';
    let nextLevelXP = 100;
    
    if (totalXP >= 5000) {
      levelName = 'Master';
      nextLevelXP = 10000;
    } else if (totalXP >= 2500) {
      levelName = 'Expert';
      nextLevelXP = 5000;
    } else if (totalXP >= 1000) {
      levelName = 'Scholar';
      nextLevelXP = 2500;
    } else if (totalXP >= 500) {
      levelName = 'Enthusiast';
      nextLevelXP = 1000;
    } else if (totalXP >= 100) {
      levelName = 'Learner';
      nextLevelXP = 500;
    }

    let progressPercent = 0;
    if (totalXP >= 10000) {
        progressPercent = 100;
    } else {
        const prevLevelXP = nextLevelXP === 100 ? 0 : 
                            nextLevelXP === 500 ? 100 : 
                            nextLevelXP === 1000 ? 500 : 
                            nextLevelXP === 2500 ? 1000 : 
                            nextLevelXP === 5000 ? 2500 : 5000;
        
        progressPercent = Math.min(100, Math.round(((totalXP - prevLevelXP) / (nextLevelXP - prevLevelXP)) * 100));
    }

    // Rank (Count users with higher XP)
    const rankRow = db.prepare('SELECT COUNT(*) as higher_count FROM users WHERE total_xp > ?').get(totalXP);
    const rank = (rankRow.higher_count || 0) + 1;

    // Streak (Simplistic for now - could be queried from attendance records)
    const streak = 0; 
    
    res.json({
      totalXP,
      level: {
        name: levelName,
        nextLevelXP,
        progressPercent
      },
      streak,
      rank,
      badges: []
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch gamification stats' });
  }
});

export default router;

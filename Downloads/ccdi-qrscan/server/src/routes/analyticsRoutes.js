import express from 'express';
import { authenticate, authorize } from '../middleware/auth.js';
import { 
  getSectionPatternAlerts, 
  getSectionAnalytics, 
  getStudentAttendanceHistory, 
  getAdminGlobalStats 
} from '../services/analytics.js';

const router = express.Router();

// 1. Pattern Detection Alerts for a Section (e.g. absent in 4 of last 5 sessions)
router.get('/section/:id/patterns', authenticate, authorize('instructor', 'admin'), (req, res) => {
  try {
    const { id } = req.params;
    const threshold = parseInt(req.query.threshold) || 3;
    const windowSize = parseInt(req.query.windowSize) || 5;

    const results = getSectionPatternAlerts(id, threshold, windowSize);
    res.json(results);
  } catch (err) {
    res.status(500).json({ error: 'Failed to compute pattern detection: ' + err.message });
  }
});

// 2. Section Trends and Analytics
router.get('/section/:id', authenticate, (req, res) => {
  try {
    const { id } = req.params;
    const analytics = getSectionAnalytics(id);

    if (!analytics) {
      return res.status(404).json({ error: 'Section not found' });
    }

    res.json(analytics);
  } catch (err) {
    res.status(500).json({ error: 'Failed to compute section analytics: ' + err.message });
  }
});

// 3. Student Personal Attendance History
router.get('/student/history', authenticate, (req, res) => {
  try {
    let studentId = req.user.id;
    // Admins or Instructors can query for a specific student ID
    if ((req.user.role === 'admin' || req.user.role === 'instructor') && req.query.studentId) {
      studentId = req.query.studentId;
    }

    const history = getStudentAttendanceHistory(studentId);
    if (!history) {
      return res.status(404).json({ error: 'Student history not found' });
    }

    res.json(history);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch student history: ' + err.message });
  }
});

// 4. Admin Global School-Wide Stats
router.get('/admin/global', authenticate, authorize('admin'), (req, res) => {
  try {
    const stats = getAdminGlobalStats();
    res.json(stats);
  } catch (err) {
    res.status(500).json({ error: 'Failed to fetch global stats: ' + err.message });
  }
});

export default router;

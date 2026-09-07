import db from '../config/db.js';
import { v4 as uuidv4 } from 'uuid';

// ─── XP Values ───────────────────────────────────────────────────────────────
const XP = {
  EARLY_PRESENT: 100,    // scanned within 5 min of session start
  ON_TIME_PRESENT: 75,   // scanned within cutoff window
  LATE: 25,              // scanned after cutoff
  EXCUSED: 40,           // manually excused
  ABSENT_DEDUCTION: -20, // absent (floor at 0 total)
};

// ─── Badge Definitions ───────────────────────────────────────────────────────
export const BADGES = {
  first_scan:       { emoji: '🎯', name: 'First Scan',        description: 'Successfully scanned for the very first time!' },
  early_bird_5:     { emoji: '⚡', name: 'Early Bird',         description: 'Arrived early 5 times (within 5 min of start)' },
  early_bird_10:    { emoji: '🚀', name: 'Punctuality King',   description: 'Arrived early 10 times' },
  streak_3:         { emoji: '💎', name: 'Perfect Trio',       description: '3 consecutive attended sessions' },
  streak_5:         { emoji: '🏆', name: '5-Session Streak',   description: '5 consecutive attended sessions' },
  streak_10:        { emoji: '🌟', name: '10-Session Legend',  description: '10 consecutive attended sessions' },
  streak_20:        { emoji: '👑', name: 'Attendance Royalty', description: '20 consecutive attended sessions' },
  semester_scholar: { emoji: '📚', name: 'Semester Scholar',   description: '≥ 90% overall attendance rate with at least 5 sessions' },
  perfect_month:    { emoji: '🎖️', name: 'Perfect Month',      description: 'Zero absences in a calendar month' },
};

// ─── Award XP for a scan ─────────────────────────────────────────────────────
export function awardScanXP({ studentId, sectionId, sessionId, recordId, status, diffMinutes, cutoffMinutes }) {
  let xpEarned = 0;
  let reason = status;

  if (status === 'present') {
    if (diffMinutes <= 5) {
      xpEarned = XP.EARLY_PRESENT;
      reason = 'early_present';
    } else {
      xpEarned = XP.ON_TIME_PRESENT;
      reason = 'on_time_present';
    }
  } else if (status === 'late') {
    xpEarned = XP.LATE;
    reason = 'late';
  } else if (status === 'excused') {
    xpEarned = XP.EXCUSED;
    reason = 'excused';
  }

  if (xpEarned > 0) {
    db.prepare(`
      INSERT INTO student_xp (id, student_id, section_id, session_id, attendance_record_id, xp_earned, reason)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), studentId, sectionId, sessionId, recordId, xpEarned, reason);
  }

  const newBadges = checkAndAwardBadges(studentId, reason);
  const totalXP = getStudentTotalXP(studentId);
  const streak = getStudentStreak(studentId);

  return { xpEarned, totalXP, streak, newBadges };
}

// ─── Deduct XP for absent (called on session close) ──────────────────────────
export function deductAbsentXP({ studentId, sectionId, sessionId, recordId }) {
  const totalXP = getStudentTotalXP(studentId);
  const deduction = Math.min(Math.abs(XP.ABSENT_DEDUCTION), totalXP); // never below 0
  if (deduction > 0) {
    db.prepare(`
      INSERT INTO student_xp (id, student_id, section_id, session_id, attendance_record_id, xp_earned, reason)
      VALUES (?, ?, ?, ?, ?, ?, 'absent_deduction')
    `).run(uuidv4(), studentId, sectionId, sessionId, recordId, -deduction);
  }
}

// ─── Get Student Total XP ────────────────────────────────────────────────────
export function getStudentTotalXP(studentId) {
  const row = db.prepare(`SELECT COALESCE(SUM(xp_earned), 0) as total FROM student_xp WHERE student_id = ?`).get(studentId);
  return Math.max(0, row.total);
}

// ─── Get Current Attendance Streak ───────────────────────────────────────────
export function getStudentStreak(studentId) {
  // Get all attendance records ordered from most recent, stop on first absence
  const records = db.prepare(`
    SELECT ar.status, cs.date, cs.start_time
    FROM attendance_records ar
    JOIN class_sessions cs ON ar.session_id = cs.id
    WHERE ar.student_id = ? AND cs.status = 'closed'
    ORDER BY cs.date DESC, cs.start_time DESC
  `).all(studentId);

  let streak = 0;
  for (const rec of records) {
    if (rec.status === 'present' || rec.status === 'late' || rec.status === 'excused') {
      streak++;
    } else {
      break; // absent resets streak
    }
  }
  return streak;
}

// ─── Get XP rank for a student (school-wide) ─────────────────────────────────
export function getStudentRank(studentId) {
  const leaderboard = db.prepare(`
    SELECT student_id, COALESCE(SUM(xp_earned), 0) as total_xp
    FROM student_xp
    GROUP BY student_id
    ORDER BY total_xp DESC
  `).all();

  const idx = leaderboard.findIndex(r => r.student_id === studentId);
  return idx === -1 ? null : idx + 1;
}

// ─── Check & award badges ─────────────────────────────────────────────────────
function checkAndAwardBadges(studentId, latestReason) {
  const newBadges = [];

  const awardIfNew = (badgeKey) => {
    const exists = db.prepare(`SELECT id FROM student_badges WHERE student_id = ? AND badge_key = ?`).get(studentId, badgeKey);
    if (!exists) {
      const def = BADGES[badgeKey];
      if (def) {
        db.prepare(`
          INSERT INTO student_badges (id, student_id, badge_key, badge_name, badge_emoji, badge_description)
          VALUES (?, ?, ?, ?, ?, ?)
        `).run(uuidv4(), studentId, badgeKey, def.name, def.emoji, def.description);
        newBadges.push({ key: badgeKey, ...def });
      }
    }
  };

  // First scan ever
  const scanCount = db.prepare(`SELECT COUNT(*) as c FROM student_xp WHERE student_id = ? AND reason != 'absent_deduction'`).get(studentId).c;
  if (scanCount >= 1) awardIfNew('first_scan');

  // Early bird counts
  const earlyCount = db.prepare(`SELECT COUNT(*) as c FROM student_xp WHERE student_id = ? AND reason = 'early_present'`).get(studentId).c;
  if (earlyCount >= 5)  awardIfNew('early_bird_5');
  if (earlyCount >= 10) awardIfNew('early_bird_10');

  // Streak badges
  const streak = getStudentStreak(studentId);
  if (streak >= 3)  awardIfNew('streak_3');
  if (streak >= 5)  awardIfNew('streak_5');
  if (streak >= 10) awardIfNew('streak_10');
  if (streak >= 20) awardIfNew('streak_20');

  // Semester scholar: ≥ 90% overall rate with ≥ 5 sessions
  const allClosed = db.prepare(`
    SELECT ar.status FROM attendance_records ar
    JOIN class_sessions cs ON ar.session_id = cs.id
    WHERE ar.student_id = ? AND cs.status = 'closed'
  `).all(studentId);

  if (allClosed.length >= 5) {
    const attended = allClosed.filter(r => ['present','late','excused'].includes(r.status)).length;
    const rate = Math.round((attended / allClosed.length) * 100);
    if (rate >= 90) awardIfNew('semester_scholar');
  }

  return newBadges;
}

// ─── Full gamification profile for a student ─────────────────────────────────
export function getStudentGamificationProfile(studentId) {
  const totalXP = getStudentTotalXP(studentId);
  const streak = getStudentStreak(studentId);
  const rank = getStudentRank(studentId);

  const badges = db.prepare(`
    SELECT badge_key, badge_name, badge_emoji, badge_description, earned_at
    FROM student_badges WHERE student_id = ?
    ORDER BY earned_at DESC
  `).all(studentId);

  // XP history (last 20 entries)
  const xpHistory = db.prepare(`
    SELECT sx.xp_earned, sx.reason, sx.created_at,
           sub.code as subject_code, sec.name as section_name
    FROM student_xp sx
    LEFT JOIN sections sec ON sx.section_id = sec.id
    LEFT JOIN subjects sub ON sec.subject_id = sub.id
    WHERE sx.student_id = ?
    ORDER BY sx.created_at DESC
    LIMIT 20
  `).all(studentId);

  // XP level tiers
  const level = getXPLevel(totalXP);

  return { totalXP, streak, rank, badges, xpHistory, level };
}

export function getXPLevel(xp) {
  const tiers = [
    { level: 1, name: 'Beginner',    minXP: 0,    maxXP: 199,  color: '#94a3b8' },
    { level: 2, name: 'Regular',     minXP: 200,  maxXP: 499,  color: '#3b82f6' },
    { level: 3, name: 'Consistent',  minXP: 500,  maxXP: 999,  color: '#10b981' },
    { level: 4, name: 'Dedicated',   minXP: 1000, maxXP: 1999, color: '#f59e0b' },
    { level: 5, name: 'Elite',       minXP: 2000, maxXP: 3999, color: '#8b5cf6' },
    { level: 6, name: 'Legend',      minXP: 4000, maxXP: Infinity, color: '#f43f5e' },
  ];
  const tier = tiers.findLast(t => xp >= t.minXP) || tiers[0];
  const next = tiers[tier.level] || null;
  const progress = next ? Math.round(((xp - tier.minXP) / (next.minXP - tier.minXP)) * 100) : 100;
  return { ...tier, nextLevelXP: next?.minXP || null, progressPercent: Math.min(100, progress) };
}

// ─── Leaderboard ─────────────────────────────────────────────────────────────
export function getLeaderboard({ sectionId = null, limit = 20 } = {}) {
  let students;
  if (sectionId) {
    students = db.prepare(`
      SELECT u.id, u.id_number, u.name, u.avatar_url, u.department
      FROM enrollments e
      JOIN users u ON e.student_id = u.id
      WHERE e.section_id = ? AND u.role = 'student'
    `).all(sectionId);
  } else {
    students = db.prepare(`
      SELECT id, id_number, name, avatar_url, department FROM users WHERE role = 'student'
    `).all();
  }

  const ranked = students.map(stu => {
    const totalXP = getStudentTotalXP(stu.id);
    const streak = getStudentStreak(stu.id);
    const level = getXPLevel(totalXP);
    const topBadge = db.prepare(`
      SELECT badge_emoji, badge_name FROM student_badges WHERE student_id = ? ORDER BY earned_at DESC LIMIT 1
    `).get(stu.id);
    return { ...stu, totalXP, streak, level, topBadge };
  })
  .sort((a, b) => b.totalXP - a.totalXP)
  .slice(0, limit)
  .map((stu, idx) => ({ ...stu, rank: idx + 1 }));

  return ranked;
}

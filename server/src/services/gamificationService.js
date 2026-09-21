import db from '../config/db.js';
import { v4 as uuidv4 } from 'uuid';
import { ALL_BADGES, getBadgeByKey } from '../config/badges.js';

// ─── XP Values for attendance scans ──────────────────────────────────────────
const XP = {
  EARLY_PRESENT: 100,
  ON_TIME_PRESENT: 75,
  LATE: 25,
  EXCUSED: 40,
};

// ─── Award XP for a QR scan ───────────────────────────────────────────────────
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
    try {
      db.prepare(`
        INSERT INTO student_xp (id, student_id, section_id, session_id, attendance_record_id, xp_earned, reason)
        VALUES (?, ?, ?, ?, ?, ?, ?)
      `).run(uuidv4(), studentId, sectionId, sessionId, recordId, xpEarned, reason);

      db.prepare(`UPDATE users SET total_xp = total_xp + ? WHERE id = ?`).run(xpEarned, studentId);
    } catch (e) {
      console.error('XP insert error:', e.message);
    }
  }

  const newBadges = checkAndAwardBadges(studentId, { sectionId, sessionId, status, diffMinutes, reason });
  const totalXP = getStudentTotalXP(studentId);
  const streak = getStudentStreak(studentId);

  return { xpEarned, totalXP, streak, newBadges };
}

// ─── Award XP for absence deduction ─────────────────────────────────────────
export function deductAbsentXP({ studentId, sectionId, sessionId, recordId }) {
  const totalXP = getStudentTotalXP(studentId);
  const deduction = Math.min(20, totalXP);
  if (deduction > 0) {
    try {
      db.prepare(`
        INSERT INTO student_xp (id, student_id, section_id, session_id, attendance_record_id, xp_earned, reason)
        VALUES (?, ?, ?, ?, ?, ?, 'absent_deduction')
      `).run(uuidv4(), studentId, sectionId, sessionId, recordId, -deduction);
      db.prepare(`UPDATE users SET total_xp = MAX(0, total_xp - ?) WHERE id = ?`).run(deduction, studentId);
    } catch (e) {
      console.error('XP deduct error:', e.message);
    }
  }
}

// ─── Award XP manually (e.g. from admin action) ───────────────────────────────
export function awardBadgeManually(studentId, badgeKey) {
  const badge = getBadgeByKey(badgeKey);
  if (!badge) return null;
  return _awardBadge(studentId, badge);
}

// ─── Get Student Total XP ────────────────────────────────────────────────────
export function getStudentTotalXP(studentId) {
  try {
    const row = db.prepare(`SELECT COALESCE(SUM(xp_earned), 0) as total FROM student_xp WHERE student_id = ?`).get(studentId);
    return Math.max(0, row?.total || 0);
  } catch (e) {
    // Fallback to users table
    const u = db.prepare(`SELECT total_xp FROM users WHERE id = ?`).get(studentId);
    return Math.max(0, u?.total_xp || 0);
  }
}

// ─── Current Attendance Streak ────────────────────────────────────────────────
export function getStudentStreak(studentId) {
  try {
    const records = db.prepare(`
      SELECT ar.status, cs.date
      FROM attendance_records ar
      JOIN class_sessions cs ON ar.session_id = cs.id
      WHERE ar.student_id = ?
      ORDER BY cs.date DESC, cs.start_time DESC
    `).all(studentId);

    let streak = 0;
    let lastDate = null;
    for (const rec of records) {
      if (rec.status === 'present' || rec.status === 'late' || rec.status === 'excused') {
        if (lastDate === null || _dateDiffDays(rec.date, lastDate) <= 1) {
          streak++;
          lastDate = rec.date;
        } else {
          break;
        }
      } else {
        break;
      }
    }
    return streak;
  } catch (e) { return 0; }
}

// ─── School-wide XP Rank ──────────────────────────────────────────────────────
export function getStudentRank(studentId) {
  try {
    const myXP = getStudentTotalXP(studentId);
    const row = db.prepare(`SELECT COUNT(*) as cnt FROM users WHERE role = 'student' AND total_xp > ?`).get(myXP);
    return (row?.cnt || 0) + 1;
  } catch (e) { return null; }
}

// ─── XP Level System ─────────────────────────────────────────────────────────
export function getXPLevel(xp) {
  const tiers = [
    { level: 1, name: 'Beginner',    minXP: 0,    color: '#94a3b8' },
    { level: 2, name: 'Regular',     minXP: 200,  color: '#3b82f6' },
    { level: 3, name: 'Consistent',  minXP: 500,  color: '#10b981' },
    { level: 4, name: 'Dedicated',   minXP: 1000, color: '#f59e0b' },
    { level: 5, name: 'Elite',       minXP: 2000, color: '#8b5cf6' },
    { level: 6, name: 'Legend',      minXP: 4000, color: '#f43f5e' },
    { level: 7, name: 'Mythic',      minXP: 8000, color: '#ec4899' },
    { level: 8, name: 'Apex',        minXP: 15000, color: '#fbbf24' },
  ];
  const tier = [...tiers].reverse().find(t => xp >= t.minXP) || tiers[0];
  const nextTier = tiers[tier.level] || null;
  const prevXP = tier.minXP;
  const nextXP = nextTier?.minXP || null;
  const progress = nextXP ? Math.min(100, Math.round(((xp - prevXP) / (nextXP - prevXP)) * 100)) : 100;
  return { ...tier, nextLevelXP: nextXP, progressPercent: progress };
}

// ─── Full Gamification Profile ────────────────────────────────────────────────
export function getStudentGamificationProfile(studentId) {
  const totalXP = getStudentTotalXP(studentId);
  const streak = getStudentStreak(studentId);
  const rank = getStudentRank(studentId);
  const level = getXPLevel(totalXP);

  // Earned badges from DB
  const earnedRows = db.prepare(`
    SELECT badge_key, badge_name, badge_description, badge_xp, badge_tier, earned_at
    FROM student_badges WHERE student_id = ?
    ORDER BY earned_at DESC
  `).all(studentId);

  const earnedKeys = new Set(earnedRows.map(r => r.badge_key));

  // Merge earned with full badge catalog
  const allBadges = ALL_BADGES.map(badge => ({
    key: badge.key,
    name: badge.name,
    description: badge.description,
    xp: badge.xp,
    tier: badge.tier,
    earned: earnedKeys.has(badge.key),
    earnedAt: earnedRows.find(r => r.badge_key === badge.key)?.earned_at || null,
  }));

  // XP history (last 30 entries)
  const xpHistory = db.prepare(`
    SELECT sx.xp_earned, sx.reason, sx.created_at,
           sub.code as subject_code, sec.name as section_name
    FROM student_xp sx
    LEFT JOIN sections sec ON sx.section_id = sec.id
    LEFT JOIN subjects sub ON sec.subject_id = sub.id
    WHERE sx.student_id = ?
    ORDER BY sx.created_at DESC
    LIMIT 30
  `).all(studentId);

  return {
    totalXP,
    streak,
    rank,
    level,
    allBadges,
    earnedBadges: earnedRows,
    earnedCount: earnedRows.length,
    totalBadges: ALL_BADGES.length,
    xpHistory,
  };
}

// ─── Leaderboard ──────────────────────────────────────────────────────────────
export function getLeaderboard({ sectionId = null, limit = 20 } = {}) {
  let students;
  if (sectionId) {
    students = db.prepare(`
      SELECT u.id, u.id_number, u.name, u.avatar_url, u.total_xp
      FROM enrollments e
      JOIN users u ON e.student_id = u.id
      WHERE e.section_id = ? AND u.role = 'student'
    `).all(sectionId);
  } else {
    students = db.prepare(`SELECT id, id_number, name, avatar_url, total_xp FROM users WHERE role = 'student'`).all();
  }

  return students
    .map(stu => {
      const streak = getStudentStreak(stu.id);
      const level = getXPLevel(stu.total_xp || 0);
      const badgeCount = db.prepare(`SELECT COUNT(*) as cnt FROM student_badges WHERE student_id = ?`).get(stu.id)?.cnt || 0;
      return { ...stu, totalXP: stu.total_xp || 0, streak, level, badgeCount };
    })
    .sort((a, b) => b.totalXP - a.totalXP)
    .slice(0, limit)
    .map((s, i) => ({ ...s, rank: i + 1 }));
}

// ═════════════════════════════════════════════════════════════════════════════
// BADGE ENGINE — checks run on every scan
// ═════════════════════════════════════════════════════════════════════════════
function checkAndAwardBadges(studentId, ctx = {}) {
  const newBadges = [];

  // Stats we'll compute once and reuse
  const totalCheckins = _totalCheckins(studentId);
  const streak = getStudentStreak(studentId);
  const earlyCount = _earlyCount(studentId, 1);        // any early (1+ min before)
  const early10Count = _earlyCount(studentId, 10);     // 10+ min early
  const early30Count = _earlyCount(studentId, 30);     // 30+ min early
  const totalBadges = _badgeCount(studentId);
  const earlyConsecutive = _earlyConsecutiveDays(studentId);

  // Helper
  const tryAward = (key) => {
    const badge = getBadgeByKey(key);
    if (!badge) return;
    const result = _awardBadge(studentId, badge);
    if (result) newBadges.push(result);
  };

  // ── TIER 1: Punctuality ──────────────────────────────────────────────────
  if (ctx.diffMinutes !== undefined) {
    const minEarly = ctx.diffMinutes < 0 ? Math.abs(ctx.diffMinutes) : 0;

    if (minEarly >= 1)  tryAward('early_bird');
    if (minEarly >= 30) tryAward('dawn_patrol');

    // Sub-Five Swift: 1-5 min early
    if (minEarly >= 1 && minEarly <= 5) tryAward('sub_five_swift');

    // Morning Catalyst: Monday + 15min early
    const now = new Date();
    if (now.getDay() === 1 && minEarly >= 15) tryAward('morning_catalyst');

    // Sunrise Scholar: before 7AM
    if (now.getHours() < 7) tryAward('sunrise_scholar');
    // Early Riser: before 7:30AM
    if (now.getHours() < 7 || (now.getHours() === 7 && now.getMinutes() < 30)) {
      const before730 = _countCheckinsBeforeTime(studentId, '07:30');
      if (before730 >= 10) tryAward('early_riser');
    }
  }

  // Early count milestones
  if (earlyCount >= 10)  tryAward('punctuality_champ');
  if (earlyCount >= 30)  tryAward('always_early');
  if (earlyCount >= 50)  tryAward('time_master');
  if (earlyCount >= 100) tryAward('early_legend');
  if (earlyCount >= 250) tryAward('early_bird_elite');
  if (early10Count >= 25) tryAward('ten_minute_titan');

  // Consecutive early days
  if (earlyConsecutive >= 3) tryAward('ahead_of_time');
  if (earlyConsecutive >= 5) tryAward('early_streak');

  // First arrival check (are we the first scan today in this section?)
  if (ctx.sessionId) {
    const scansBefore = db.prepare(`
      SELECT COUNT(*) as cnt FROM attendance_records 
      WHERE session_id = ? AND scanned_at < (SELECT scanned_at FROM attendance_records WHERE student_id = ? AND session_id = ?)
    `).get(ctx.sessionId, studentId, ctx.sessionId);
    if ((scansBefore?.cnt || 0) === 0) tryAward('first_arrival');
  }

  // Zero tardies checks
  const hasLateThisMonth = _hasLateInPeriod(studentId, 'month');
  if (!hasLateThisMonth && totalCheckins >= 5) tryAward('zero_delays');

  const hasLateThisQuarter = _hasLateInPeriod(studentId, 'quarter');
  if (!hasLateThisQuarter && totalCheckins >= 20) tryAward('zero_tardies_quarter');

  // ── TIER 2: Streaks ───────────────────────────────────────────────────────
  if (streak >= 3)   tryAward('streak_starter');
  if (streak >= 5)   tryAward('consistent');
  if (streak >= 7)   tryAward('weekly_warrior');
  if (streak >= 10)  tryAward('double_down');
  if (streak >= 20)  tryAward('unstoppable');
  if (streak >= 28)  tryAward('streak_specialist');
  if (streak >= 30)  tryAward('monthly_marathon');
  if (streak >= 40)  tryAward('relentless');
  if (streak >= 50)  tryAward('perseverance');
  if (streak >= 60)  tryAward('streak_architect');
  if (streak >= 75)  tryAward('ironclad');
  if (streak >= 90)  tryAward('quarter_master');
  if (streak >= 100) tryAward('century_club');
  if (streak >= 150) tryAward('unbreakable');
  if (streak >= 200) tryAward('titanium_streak');
  if (streak >= 250) tryAward('legendary_streak');
  if (streak >= 300) tryAward('immortal_streak');
  if (streak >= 365) tryAward('yearling');
  if (streak >= 500) tryAward('streak_grandmaster');

  // Comeback: returned after absence
  if (ctx.status === 'present' || ctx.status === 'late') {
    const hadAbsence = _hadAbsenceBeforeStreak(studentId);
    if (hadAbsence) {
      if (streak >= 1)  tryAward('prompt_return');
      if (streak >= 5)  { tryAward('comeback_kid'); tryAward('streak_defender'); tryAward('re_engaged'); }
      if (streak >= 20) { tryAward('streak_rebuilder'); tryAward('absence_overcomer'); }
    }
  }

  // ── TIER 3: Perfect periods ───────────────────────────────────────────────
  const perfectWeeks = _consecutivePerfectWeeks(studentId);
  if (perfectWeeks >= 1) tryAward('perfect_week');
  if (perfectWeeks >= 2) tryAward('flawless_fortnight');
  if (perfectWeeks >= 3) { tryAward('triple_week'); tryAward('hat_trick'); }
  if (perfectWeeks >= 4) tryAward('streak_specialist');

  const perfectMonths = _consecutivePerfectMonths(studentId);
  if (perfectMonths >= 1) { tryAward('monthly_perfect'); tryAward('full_house'); }
  if (perfectMonths >= 2) tryAward('bi_monthly_perfection');
  if (perfectMonths >= 3) tryAward('quarterly_ace');
  if (perfectMonths >= 4) tryAward('grand_slam');
  if (perfectMonths >= 5) tryAward('semester_titan');
  if (perfectMonths >= 6) tryAward('flawless_record');
  if (perfectMonths >= 10) tryAward('annual_standard');

  // Day-of-week streaks
  _checkDayStreak(studentId, 1, 4) && tryAward('monday_motivator');
  _checkDayStreak(studentId, 2, 4) && tryAward('tuesday_trooper');
  _checkDayStreak(studentId, 3, 8) && tryAward('midweek_anchor');
  _checkDayStreak(studentId, 4, 4) && tryAward('thursday_vanguard');
  _checkDayStreak(studentId, 5, 4) && tryAward('friday_finisher');

  // ── TIER 4: Volume milestones ─────────────────────────────────────────────
  if (totalCheckins >= 1)    tryAward('first_step');
  if (totalCheckins >= 5)    tryAward('high_five');
  if (totalCheckins >= 10)   { tryAward('getting_started'); tryAward('double_digit_days'); }
  if (totalCheckins >= 25)   tryAward('quarter_centurion');
  if (totalCheckins >= 50)   tryAward('half_centurion');
  if (totalCheckins >= 100)  { tryAward('centurion'); tryAward('triple_digit_log'); }
  if (totalCheckins >= 200)  tryAward('double_centurion');
  if (totalCheckins >= 300)  tryAward('triple_centurion');
  if (totalCheckins >= 400)  tryAward('quad_centurion');
  if (totalCheckins >= 500)  tryAward('high_five_hundred');
  if (totalCheckins >= 750)  tryAward('seven_fifty');
  if (totalCheckins >= 1000) tryAward('kilometer_club');
  if (totalCheckins >= 1500) tryAward('fifteen_hundred');
  if (totalCheckins >= 2000) tryAward('double_k');
  if (totalCheckins >= 3000) tryAward('hall_of_fame');

  // ── TIER 5: Tech/Profile ──────────────────────────────────────────────────
  if (totalBadges >= 5)   tryAward('tech_master');
  if (totalBadges >= 25)  tryAward('badge_collector');
  if (totalBadges >= 50)  tryAward('badge_hoarder');
  if (totalBadges >= 100) tryAward('badge_legend');
  if (totalBadges >= 5)   tryAward('section_standout');

  const user = db.prepare(`SELECT avatar_url, name FROM users WHERE id = ?`).get(studentId);
  if (user?.avatar_url) { tryAward('profile_pioneer'); tryAward('custom_avatar'); }

  // ── TIER 8: Rank-based ────────────────────────────────────────────────────
  const rank = getStudentRank(studentId);
  const totalStudents = db.prepare(`SELECT COUNT(*) as cnt FROM users WHERE role = 'student'`).get()?.cnt || 1;
  const pct = (rank / totalStudents) * 100;
  if (pct <= 10)  tryAward('reliable_peer');
  if (pct <= 5)   tryAward('top_tier');
  if (pct <= 1)   tryAward('top_one_percent');

  return newBadges;
}

// ═════════════════════════════════════════════════════════════════════════════
// INTERNAL HELPERS
// ═════════════════════════════════════════════════════════════════════════════

function _awardBadge(studentId, badge) {
  const exists = db.prepare(`SELECT id FROM student_badges WHERE student_id = ? AND badge_key = ?`).get(studentId, badge.key);
  if (exists) return null;

  try {
    db.prepare(`
      INSERT INTO student_badges (id, student_id, badge_key, badge_name, badge_description, badge_xp, badge_tier, badge_emoji)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(uuidv4(), studentId, badge.key, badge.name, badge.description, badge.xp, badge.tier, badge.icon || '🏅');

    // Award the badge XP
    if (badge.xp > 0) {
      db.prepare(`
        INSERT INTO student_xp (id, student_id, section_id, session_id, attendance_record_id, xp_earned, reason)
        VALUES (?, ?, NULL, NULL, NULL, ?, ?)
      `).run(uuidv4(), studentId, badge.xp, `badge_${badge.key}`);
      db.prepare(`UPDATE users SET total_xp = total_xp + ? WHERE id = ?`).run(badge.xp, studentId);
    }

    return { key: badge.key, name: badge.name, description: badge.description, xp: badge.xp, tier: badge.tier };
  } catch (e) {
    if (!e.message.includes('UNIQUE')) console.error('Badge award error:', e.message);
    return null;
  }
}

function _totalCheckins(studentId) {
  return db.prepare(`SELECT COUNT(*) as cnt FROM attendance_records WHERE student_id = ? AND status IN ('present','late')`).get(studentId)?.cnt || 0;
}

function _badgeCount(studentId) {
  return db.prepare(`SELECT COUNT(*) as cnt FROM student_badges WHERE student_id = ?`).get(studentId)?.cnt || 0;
}

function _earlyCount(studentId, minsBefore = 1) {
  // "early" = scanned before session start_time by at least minsBefore minutes
  return db.prepare(`
    SELECT COUNT(*) as cnt FROM attendance_records ar
    JOIN class_sessions cs ON ar.session_id = cs.id
    WHERE ar.student_id = ?
      AND ar.status = 'present'
      AND (strftime('%s', cs.start_time) - strftime('%s', ar.scanned_at)) >= ?
  `).get(studentId, minsBefore * 60)?.cnt || 0;
}

function _earlyConsecutiveDays(studentId) {
  const records = db.prepare(`
    SELECT ar.scanned_at, cs.start_time, cs.date
    FROM attendance_records ar
    JOIN class_sessions cs ON ar.session_id = cs.id
    WHERE ar.student_id = ? AND ar.status = 'present'
    ORDER BY cs.date DESC, cs.start_time DESC
  `).all(studentId);

  let consecutive = 0;
  let lastDate = null;
  for (const rec of records) {
    const earlySeconds = (new Date(rec.start_time) - new Date(rec.scanned_at)) / 1000;
    if (earlySeconds >= 60) { // at least 1 minute early
      if (lastDate === null || _dateDiffDays(rec.date, lastDate) <= 1) {
        consecutive++;
        lastDate = rec.date;
      } else break;
    } else break;
  }
  return consecutive;
}

function _countCheckinsBeforeTime(studentId, timeStr) {
  const [hours, minutes] = timeStr.split(':').map(Number);
  return db.prepare(`
    SELECT COUNT(*) as cnt FROM attendance_records ar
    WHERE ar.student_id = ?
      AND CAST(strftime('%H', ar.scanned_at) AS INTEGER) < ?
      OR (CAST(strftime('%H', ar.scanned_at) AS INTEGER) = ? AND CAST(strftime('%M', ar.scanned_at) AS INTEGER) < ?)
  `).get(studentId, hours, hours, minutes)?.cnt || 0;
}

function _hasLateInPeriod(studentId, period) {
  const now = new Date();
  let startDate;
  if (period === 'month') {
    startDate = new Date(now.getFullYear(), now.getMonth(), 1).toISOString().split('T')[0];
  } else if (period === 'quarter') {
    const q = Math.floor(now.getMonth() / 3);
    startDate = new Date(now.getFullYear(), q * 3, 1).toISOString().split('T')[0];
  } else if (period === 'semester') {
    const s = now.getMonth() < 6 ? 0 : 6;
    startDate = new Date(now.getFullYear(), s, 1).toISOString().split('T')[0];
  } else {
    startDate = new Date(now.getFullYear(), 0, 1).toISOString().split('T')[0];
  }

  const row = db.prepare(`
    SELECT COUNT(*) as cnt FROM attendance_records ar
    JOIN class_sessions cs ON ar.session_id = cs.id
    WHERE ar.student_id = ? AND ar.status = 'late' AND cs.date >= ?
  `).get(studentId, startDate);
  return (row?.cnt || 0) > 0;
}

function _hadAbsenceBeforeStreak(studentId) {
  const records = db.prepare(`
    SELECT ar.status FROM attendance_records ar
    JOIN class_sessions cs ON ar.session_id = cs.id
    WHERE ar.student_id = ?
    ORDER BY cs.date ASC, cs.start_time ASC
  `).all(studentId);

  // Look for an absence followed by present/late records
  let hadAbsence = false;
  for (const r of records) {
    if (r.status === 'absent') hadAbsence = true;
    else if ((r.status === 'present' || r.status === 'late') && hadAbsence) return true;
  }
  return false;
}

function _consecutivePerfectWeeks(studentId) {
  // Get all sessions grouped by ISO week, check if student attended all
  const rows = db.prepare(`
    SELECT strftime('%Y-%W', cs.date) as week,
           COUNT(cs.id) as total_sessions,
           SUM(CASE WHEN ar.status IN ('present','excused') THEN 1 ELSE 0 END) as attended
    FROM class_sessions cs
    JOIN enrollments en ON cs.section_id = en.section_id AND en.student_id = ?
    LEFT JOIN attendance_records ar ON ar.session_id = cs.id AND ar.student_id = ?
    WHERE cs.status = 'closed'
    GROUP BY week
    ORDER BY week DESC
  `).all(studentId, studentId);

  let consecutive = 0;
  for (const row of rows) {
    if (row.total_sessions > 0 && row.attended >= row.total_sessions) consecutive++;
    else break;
  }
  return consecutive;
}

function _consecutivePerfectMonths(studentId) {
  const rows = db.prepare(`
    SELECT strftime('%Y-%m', cs.date) as month,
           COUNT(cs.id) as total_sessions,
           SUM(CASE WHEN ar.status IN ('present','excused') THEN 1 ELSE 0 END) as attended
    FROM class_sessions cs
    JOIN enrollments en ON cs.section_id = en.section_id AND en.student_id = ?
    LEFT JOIN attendance_records ar ON ar.session_id = cs.id AND ar.student_id = ?
    WHERE cs.status = 'closed'
    GROUP BY month
    ORDER BY month DESC
  `).all(studentId, studentId);

  let consecutive = 0;
  for (const row of rows) {
    if (row.total_sessions > 0 && row.attended >= row.total_sessions) consecutive++;
    else break;
  }
  return consecutive;
}

function _checkDayStreak(studentId, dayOfWeek, requiredWeeks) {
  // dayOfWeek: 0=Sun,1=Mon,...,6=Sat (JS getDay style; SQLite strftime %w)
  const rows = db.prepare(`
    SELECT strftime('%Y-%W', cs.date) as week,
           SUM(CASE WHEN ar.status IN ('present','excused') THEN 1 ELSE 0 END) as attended
    FROM class_sessions cs
    JOIN enrollments en ON cs.section_id = en.section_id AND en.student_id = ?
    LEFT JOIN attendance_records ar ON ar.session_id = cs.id AND ar.student_id = ?
    WHERE cs.status = 'closed' AND CAST(strftime('%w', cs.date) AS INTEGER) = ?
    GROUP BY week
    ORDER BY week DESC
    LIMIT ?
  `).all(studentId, studentId, dayOfWeek, requiredWeeks);

  if (rows.length < requiredWeeks) return false;
  return rows.every(r => (r.attended || 0) >= 1);
}

function _dateDiffDays(d1, d2) {
  return Math.abs((new Date(d1) - new Date(d2)) / (1000 * 60 * 60 * 24));
}

import db from '../config/db.js';

export function getSectionPatternAlerts(sectionId, threshold = 3, windowSize = 5) {
  const recentSessions = db.prepare(`
    SELECT id, date, start_time 
    FROM class_sessions 
    WHERE section_id = ? AND status = 'closed'
    ORDER BY date DESC, start_time DESC
    LIMIT ?
  `).all(sectionId, windowSize);

  if (!recentSessions || recentSessions.length === 0) {
    return { windowSize, totalSessionsEvaluated: 0, alerts: [], stats: { totalEnrolled: 0, atRiskCount: 0 } };
  }

  const sessionIds = recentSessions.map(s => s.id);
  const enrolledStudents = db.prepare(`
    SELECT u.id, u.id_number, u.name, u.email, u.avatar_url
    FROM enrollments e
    JOIN users u ON e.student_id = u.id
    WHERE e.section_id = ?
    ORDER BY u.name ASC
  `).all(sectionId);

  const allClosedSessions = db.prepare(
    `SELECT id FROM class_sessions WHERE section_id = ? AND status = 'closed'`
  ).all(sectionId);
  const totalClosedCount = allClosedSessions.length;
  const allClosedIds = allClosedSessions.map(s => s.id);

  // FIXED N+1: Single batch query for all window records, grouped in JS
  const windowPlaceholders = sessionIds.map(() => '?').join(',');
  const allWindowRecords = db.prepare(`
    SELECT student_id, session_id, status, scanned_at, method
    FROM attendance_records
    WHERE session_id IN (${windowPlaceholders})
  `).all(...sessionIds);

  // FIXED N+1: Single batch query for all overall term records
  const allClosedPlaceholders = allClosedIds.map(() => '?').join(',');
  const allOverallRecords = allClosedIds.length > 0
    ? db.prepare(`
        SELECT student_id, status
        FROM attendance_records
        WHERE session_id IN (${allClosedPlaceholders})
      `).all(...allClosedIds)
    : [];

  // Group records by student in JS — zero additional DB round-trips
  const windowByStudent = new Map();
  for (const rec of allWindowRecords) {
    if (!windowByStudent.has(rec.student_id)) windowByStudent.set(rec.student_id, new Map());
    windowByStudent.get(rec.student_id).set(rec.session_id, rec);
  }

  const overallByStudent = new Map();
  for (const rec of allOverallRecords) {
    if (!overallByStudent.has(rec.student_id)) overallByStudent.set(rec.student_id, []);
    overallByStudent.get(rec.student_id).push(rec);
  }

  const alerts = [];
  const chronologicalSessions = [...recentSessions].reverse();

  for (const student of enrolledStudents) {
    const studentWindowMap = windowByStudent.get(student.id) || new Map();

    let windowAbsences = 0, windowLates = 0, windowPresents = 0, windowExcused = 0;
    const historyInWindow = [];

    for (const sess of chronologicalSessions) {
      const rec = studentWindowMap.get(sess.id);
      const status = rec ? rec.status : 'absent';
      if (status === 'absent') windowAbsences++;
      else if (status === 'late') windowLates++;
      else if (status === 'present') windowPresents++;
      else if (status === 'excused') windowExcused++;
      historyInWindow.push({ sessionId: sess.id, date: sess.date, status, method: rec?.method || 'unrecorded' });
    }

    const overallRecords = overallByStudent.get(student.id) || [];
    const totalPresentOrLate = overallRecords.filter(
      r => r.status === 'present' || r.status === 'late' || r.status === 'excused'
    ).length;
    const overallRate = totalClosedCount > 0
      ? Math.round((totalPresentOrLate / totalClosedCount) * 100)
      : 100;

    let riskLevel = 'NONE';
    let riskReason = '';

    if (windowAbsences >= 4) {
      riskLevel = 'CRITICAL';
      riskReason = `Absent in ${windowAbsences} of the last ${recentSessions.length} class sessions (High Dropout / Failure Risk)`;
    } else if (windowAbsences >= 3) {
      riskLevel = 'HIGH';
      riskReason = `Absent in ${windowAbsences} of the last ${recentSessions.length} class sessions (Chronic Absenteeism)`;
    } else if (overallRate < 75) {
      riskLevel = 'WARNING';
      riskReason = `Overall attendance rate (${overallRate}%) is below institutional passing threshold (75%)`;
    } else if (windowLates >= 3) {
      riskLevel = 'HABITUAL_LATE';
      riskReason = `Habitually late: ${windowLates} late arrivals in the last ${recentSessions.length} sessions`;
    }

    if (riskLevel !== 'NONE') {
      alerts.push({
        student: { id: student.id, idNumber: student.id_number, name: student.name, email: student.email, avatarUrl: student.avatar_url },
        riskLevel,
        riskReason,
        windowStats: {
          evaluatedSessions: recentSessions.length,
          absences: windowAbsences,
          lates: windowLates,
          presents: windowPresents,
          excused: windowExcused,
          history: historyInWindow
        },
        overallStats: { totalSessions: totalClosedCount, attendedSessions: totalPresentOrLate, overallRatePercent: overallRate }
      });
    }
  }

  const riskPriority = { CRITICAL: 4, HIGH: 3, WARNING: 2, HABITUAL_LATE: 1 };
  alerts.sort((a, b) => (riskPriority[b.riskLevel] || 0) - (riskPriority[a.riskLevel] || 0));

  return {
    windowSize: recentSessions.length,
    totalSessionsEvaluated: recentSessions.length,
    alerts,
    stats: { totalEnrolled: enrolledStudents.length, atRiskCount: alerts.length }
  };
}

export function getSectionAnalytics(sectionId) {
  const section = db.prepare(`
    SELECT s.*, sub.code as subject_code, sub.title as subject_title, u.name as instructor_name
    FROM sections s
    JOIN subjects sub ON s.subject_id = sub.id
    LEFT JOIN users u ON s.instructor_id = u.id
    WHERE s.id = ?
  `).get(sectionId);

  if (!section) return null;

  const sessions = db.prepare(`
    SELECT id, date, start_time, end_time, status
    FROM class_sessions
    WHERE section_id = ?
    ORDER BY date ASC, start_time ASC
  `).all(sectionId);

  const enrolled = db.prepare(`
    SELECT u.id, u.id_number, u.name, u.email, u.avatar_url
    FROM enrollments e
    JOIN users u ON e.student_id = u.id
    WHERE e.section_id = ?
    ORDER BY u.name ASC
  `).all(sectionId);

  const totalEnrolled = enrolled.length;
  const sessionIds = sessions.map(s => s.id);

  // FIXED N+1: One query for all attendance records across all sessions
  const allRecords = sessionIds.length > 0
    ? db.prepare(`
        SELECT session_id, student_id, status
        FROM attendance_records
        WHERE session_id IN (${sessionIds.map(() => '?').join(',')})
      `).all(...sessionIds)
    : [];

  // Group by session_id for trend calculations
  const recordsBySession = new Map();
  for (const rec of allRecords) {
    if (!recordsBySession.has(rec.session_id)) recordsBySession.set(rec.session_id, []);
    recordsBySession.get(rec.session_id).push(rec);
  }

  // Group by student_id for roster calculations
  const recordsByStudent = new Map();
  for (const rec of allRecords) {
    if (!recordsByStudent.has(rec.student_id)) recordsByStudent.set(rec.student_id, []);
    recordsByStudent.get(rec.student_id).push(rec);
  }

  const closedSessions = sessions.filter(s => s.status === 'closed');
  const closedCount = closedSessions.length;

  // Session trend statistics — no DB call per session
  const sessionTrends = sessions.map(sess => {
    const records = recordsBySession.get(sess.id) || [];
    let present = 0, late = 0, absent = 0, excused = 0;
    records.forEach(r => {
      if (r.status === 'present') present++;
      else if (r.status === 'late') late++;
      else if (r.status === 'absent') absent++;
      else if (r.status === 'excused') excused++;
    });
    const totalRecorded = present + late + absent + excused;
    if (sess.status === 'closed' && totalRecorded < totalEnrolled) {
      absent += (totalEnrolled - totalRecorded);
    }
    const attendanceRate = totalEnrolled > 0
      ? Math.round(((present + late + excused) / totalEnrolled) * 100)
      : 0;
    return { sessionId: sess.id, date: sess.date, status: sess.status, present, late, absent, excused, totalEnrolled, attendanceRate };
  });

  // Student roster breakdown — no DB call per student
  const studentRoster = enrolled.map(st => {
    const records = (recordsByStudent.get(st.id) || []).filter(r =>
      closedSessions.some(s => s.id === r.session_id)
    );
    let present = 0, late = 0, absent = 0, excused = 0;
    records.forEach(r => {
      if (r.status === 'present') present++;
      else if (r.status === 'late') late++;
      else if (r.status === 'absent') absent++;
      else if (r.status === 'excused') excused++;
    });
    const recordedTotal = present + late + absent + excused;
    if (closedCount > recordedTotal) absent += (closedCount - recordedTotal);
    const rate = closedCount > 0
      ? Math.round(((present + late + excused) / closedCount) * 100)
      : 100;
    return { ...st, presentCount: present, lateCount: late, absentCount: absent, excusedCount: excused, totalSessions: closedCount, ratePercent: rate };
  });

  return {
    section,
    totalEnrolled,
    totalSessions: sessions.length,
    closedSessions: closedCount,
    sessionTrends,
    studentRoster
  };
}

export function getStudentAttendanceHistory(studentId) {
  const student = db.prepare('SELECT id, id_number, name, email, department FROM users WHERE id = ?').get(studentId);
  if (!student) return null;

  // Enrolled sections
  const enrolledSections = db.prepare(`
    SELECT s.id, s.name, s.room, s.schedule, s.academic_term,
           sub.code as subject_code, sub.title as subject_title,
           u.name as instructor_name
    FROM enrollments e
    JOIN sections s ON e.section_id = s.id
    JOIN subjects sub ON s.subject_id = sub.id
    LEFT JOIN users u ON s.instructor_id = u.id
    WHERE e.student_id = ?
  `).all(studentId);

  const sectionsWithStats = enrolledSections.map(sec => {
    const closedSessions = db.prepare(`
      SELECT id FROM class_sessions WHERE section_id = ? AND status = 'closed'
    `).all(sec.id);

    const records = db.prepare(`
      SELECT ar.status
      FROM attendance_records ar
      JOIN class_sessions cs ON ar.session_id = cs.id
      WHERE ar.student_id = ? AND cs.section_id = ? AND cs.status = 'closed'
    `).all(studentId, sec.id);

    let present = 0, late = 0, absent = 0, excused = 0;
    records.forEach(r => {
      if (r.status === 'present') present++;
      else if (r.status === 'late') late++;
      else if (r.status === 'absent') absent++;
      else if (r.status === 'excused') excused++;
    });

    const totalClosed = closedSessions.length;
    const recordedCount = present + late + absent + excused;
    if (totalClosed > recordedCount) {
      absent += (totalClosed - recordedCount);
    }

    const rate = totalClosed > 0 
      ? Math.round(((present + late + excused) / totalClosed) * 100) 
      : 100;

    return {
      ...sec,
      present,
      late,
      absent,
      excused,
      totalSessions: totalClosed,
      ratePercent: rate
    };
  });

  // Recent attendance logs
  const recentLogs = db.prepare(`
    SELECT ar.id, ar.scanned_at, ar.status, ar.method,
           cs.date, cs.start_time,
           sec.name as section_name, sec.room,
           sub.code as subject_code, sub.title as subject_title
    FROM attendance_records ar
    JOIN class_sessions cs ON ar.session_id = cs.id
    JOIN sections sec ON cs.section_id = sec.id
    JOIN subjects sub ON sec.subject_id = sub.id
    WHERE ar.student_id = ?
    ORDER BY ar.scanned_at DESC
    LIMIT 30
  `).all(studentId);

  return {
    student,
    sections: sectionsWithStats,
    recentLogs
  };
}

export function getAdminGlobalStats() {
  const totalStudents = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'student'").get().count;
  const totalInstructors = db.prepare("SELECT COUNT(*) as count FROM users WHERE role = 'instructor'").get().count;
  const totalSections = db.prepare("SELECT COUNT(*) as count FROM sections").get().count;
  const totalSessions = db.prepare("SELECT COUNT(*) as count FROM class_sessions").get().count;
  const activeSessions = db.prepare("SELECT COUNT(*) as count FROM class_sessions WHERE status = 'active'").get().count;

  // Average attendance rate across all closed sessions
  const totalScans = db.prepare(`
    SELECT status, COUNT(*) as count 
    FROM attendance_records 
    GROUP BY status
  `).all();

  let presentCount = 0, lateCount = 0, absentCount = 0;
  totalScans.forEach(s => {
    if (s.status === 'present') presentCount = s.count;
    if (s.status === 'late') lateCount = s.count;
    if (s.status === 'absent') absentCount = s.count;
  });

  const grandTotal = presentCount + lateCount + absentCount;
  const overallRate = grandTotal > 0 ? Math.round(((presentCount + lateCount) / grandTotal) * 100) : 0;

  // Recent active/closed sessions
  const recentSessions = db.prepare(`
    SELECT cs.id, cs.date, cs.start_time, cs.status,
           sec.name as section_name, sub.code as subject_code, sub.title as subject_title,
           u.name as instructor_name
    FROM class_sessions cs
    JOIN sections sec ON cs.section_id = sec.id
    JOIN subjects sub ON sec.subject_id = sub.id
    LEFT JOIN users u ON cs.instructor_id = u.id
    ORDER BY cs.created_at DESC
    LIMIT 10
  `).all();

  return {
    totalStudents,
    totalInstructors,
    totalSections,
    totalSessions,
    activeSessions,
    overallRate,
    scanBreakdown: {
      present: presentCount,
      late: lateCount,
      absent: absentCount
    },
    recentSessions
  };
}

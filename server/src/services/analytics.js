import db from '../config/db.js';

export function getSectionPatternAlerts(sectionId, threshold = 3, windowSize = 5) {
  // 1. Get the last M completed/closed sessions for this section
  const recentSessions = db.prepare(`
    SELECT id, date, start_time 
    FROM class_sessions 
    WHERE section_id = ? AND status = 'closed'
    ORDER BY date DESC, start_time DESC
    LIMIT ?
  `).all(sectionId, windowSize);

  if (!recentSessions || recentSessions.length === 0) {
    return {
      windowSize,
      totalSessionsEvaluated: 0,
      alerts: [],
      stats: { totalEnrolled: 0, atRiskCount: 0 }
    };
  }

  const sessionIds = recentSessions.map(s => s.id);
  const enrolledStudents = db.prepare(`
    SELECT u.id, u.id_number, u.name, u.email, u.avatar_url
    FROM enrollments e
    JOIN users u ON e.student_id = u.id
    WHERE e.section_id = ?
    ORDER BY u.name ASC
  `).all(sectionId);

  // All closed sessions for this section to calculate overall term rate
  const allClosedSessions = db.prepare(`
    SELECT id FROM class_sessions WHERE section_id = ? AND status = 'closed'
  `).all(sectionId);
  const totalClosedCount = allClosedSessions.length;

  const alerts = [];

  for (const student of enrolledStudents) {
    // Attendance in the evaluation window
    const placeholders = sessionIds.map(() => '?').join(',');
    const windowRecords = db.prepare(`
      SELECT session_id, status, scanned_at, method
      FROM attendance_records
      WHERE student_id = ? AND session_id IN (${placeholders})
    `).all(student.id, ...sessionIds);

    const recordMap = new Map();
    windowRecords.forEach(r => recordMap.set(r.session_id, r));

    let windowAbsences = 0;
    let windowLates = 0;
    let windowPresents = 0;
    let windowExcused = 0;
    const historyInWindow = [];

    // Order from oldest to newest within window
    const chronologicalSessions = [...recentSessions].reverse();
    for (const sess of chronologicalSessions) {
      const rec = recordMap.get(sess.id);
      const status = rec ? rec.status : 'absent';
      if (status === 'absent') windowAbsences++;
      else if (status === 'late') windowLates++;
      else if (status === 'present') windowPresents++;
      else if (status === 'excused') windowExcused++;

      historyInWindow.push({
        sessionId: sess.id,
        date: sess.date,
        status,
        method: rec?.method || 'unrecorded'
      });
    }

    // Overall term attendance for this student in this section
    const overallRecords = db.prepare(`
      SELECT ar.status
      FROM attendance_records ar
      JOIN class_sessions cs ON ar.session_id = cs.id
      WHERE ar.student_id = ? AND cs.section_id = ? AND cs.status = 'closed'
    `).all(student.id, sectionId);

    const totalPresentOrLate = overallRecords.filter(r => r.status === 'present' || r.status === 'late' || r.status === 'excused').length;
    const overallRate = totalClosedCount > 0 
      ? Math.round((totalPresentOrLate / totalClosedCount) * 100) 
      : 100;

    // Pattern criteria
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
        student: {
          id: student.id,
          idNumber: student.id_number,
          name: student.name,
          email: student.email,
          avatarUrl: student.avatar_url
        },
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
        overallStats: {
          totalSessions: totalClosedCount,
          attendedSessions: totalPresentOrLate,
          overallRatePercent: overallRate
        }
      });
    }
  }

  // Sort critical first
  const riskPriority = { CRITICAL: 4, HIGH: 3, WARNING: 2, HABITUAL_LATE: 1 };
  alerts.sort((a, b) => (riskPriority[b.riskLevel] || 0) - (riskPriority[a.riskLevel] || 0));

  return {
    windowSize: recentSessions.length,
    totalSessionsEvaluated: recentSessions.length,
    alerts,
    stats: {
      totalEnrolled: enrolledStudents.length,
      atRiskCount: alerts.length
    }
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

  // Session trend statistics
  const sessionTrends = sessions.map(sess => {
    const records = db.prepare(`
      SELECT status, COUNT(*) as count 
      FROM attendance_records 
      WHERE session_id = ? 
      GROUP BY status
    `).all(sess.id);

    let present = 0, late = 0, absent = 0, excused = 0;
    records.forEach(r => {
      if (r.status === 'present') present = r.count;
      if (r.status === 'late') late = r.count;
      if (r.status === 'absent') absent = r.count;
      if (r.status === 'excused') excused = r.count;
    });

    // If session is closed and records < total enrolled, difference is absent
    const totalRecorded = present + late + absent + excused;
    if (sess.status === 'closed' && totalRecorded < totalEnrolled) {
      absent += (totalEnrolled - totalRecorded);
    }

    const attendanceRate = totalEnrolled > 0 
      ? Math.round(((present + late + excused) / totalEnrolled) * 100) 
      : 0;

    return {
      sessionId: sess.id,
      date: sess.date,
      status: sess.status,
      present,
      late,
      absent,
      excused,
      totalEnrolled,
      attendanceRate
    };
  });

  // Calculate student roster detailed breakdown
  const studentRoster = enrolled.map(st => {
    const records = db.prepare(`
      SELECT ar.status, ar.method
      FROM attendance_records ar
      JOIN class_sessions cs ON ar.session_id = cs.id
      WHERE ar.student_id = ? AND cs.section_id = ? AND cs.status = 'closed'
    `).all(st.id, sectionId);

    let present = 0, late = 0, absent = 0, excused = 0;
    records.forEach(r => {
      if (r.status === 'present') present++;
      else if (r.status === 'late') late++;
      else if (r.status === 'absent') absent++;
      else if (r.status === 'excused') excused++;
    });

    const closedCount = sessions.filter(s => s.status === 'closed').length;
    // Missing entries in closed sessions count as absent
    const recordedTotal = present + late + absent + excused;
    if (closedCount > recordedTotal) {
      absent += (closedCount - recordedTotal);
    }

    const rate = closedCount > 0 
      ? Math.round(((present + late + excused) / closedCount) * 100) 
      : 100;

    return {
      ...st,
      presentCount: present,
      lateCount: late,
      absentCount: absent,
      excusedCount: excused,
      totalSessions: closedCount,
      ratePercent: rate
    };
  });

  return {
    section,
    totalEnrolled,
    totalSessions: sessions.length,
    closedSessions: sessions.filter(s => s.status === 'closed').length,
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

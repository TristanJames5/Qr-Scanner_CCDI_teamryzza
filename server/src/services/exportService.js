import db from '../config/db.js';

export function generateSectionAttendanceCSV(sectionId) {
  const section = db.prepare(`
    SELECT s.name as section_name, s.room, s.schedule, s.academic_term,
           sub.code as subject_code, sub.title as subject_title,
           u.name as instructor_name
    FROM sections s
    JOIN subjects sub ON s.subject_id = sub.id
    LEFT JOIN users u ON s.instructor_id = u.id
    WHERE s.id = ?
  `).get(sectionId);

  if (!section) return null;

  const sessions = db.prepare(`
    SELECT id, date, start_time, status
    FROM class_sessions
    WHERE section_id = ? AND status = 'closed'
    ORDER BY date ASC, start_time ASC
  `).all(sectionId);

  const enrolled = db.prepare(`
    SELECT u.id, u.id_number, u.name, u.email
    FROM enrollments e
    JOIN users u ON e.student_id = u.id
    WHERE e.section_id = ?
    ORDER BY u.name ASC
  `).all(sectionId);

  // Headers
  const dateHeaders = sessions.map(s => `"${s.date}"`).join(',');
  let csv = `CCDI - Computer Communication Development Institute\n`;
  csv += `OFFICIAL CLASS ATTENDANCE ROSTER REPORT\n`;
  csv += `Subject:,"${section.subject_code} - ${section.subject_title}"\n`;
  csv += `Section:,"${section.section_name}",Room:,"${section.room}"\n`;
  csv += `Instructor:,"${section.instructor_name || 'N/A'}",Term:,"${section.academic_term}"\n`;
  csv += `Generated On:,"${new Date().toLocaleString()}"\n\n`;

  csv += `"Student ID","Full Name","Email",${dateHeaders},"Present","Late","Absent","Excused","Attendance Rate (%)"\n`;

  for (const st of enrolled) {
    const records = db.prepare(`
      SELECT ar.session_id, ar.status
      FROM attendance_records ar
      JOIN class_sessions cs ON ar.session_id = cs.id
      WHERE ar.student_id = ? AND cs.section_id = ? AND cs.status = 'closed'
    `).all(st.id, sectionId);

    const recMap = new Map();
    records.forEach(r => recMap.set(r.session_id, r.status));

    let pCount = 0, lCount = 0, aCount = 0, eCount = 0;
    const sessionStatuses = sessions.map(sess => {
      const status = recMap.get(sess.id) || 'absent';
      if (status === 'present') { pCount++; return 'P'; }
      if (status === 'late') { lCount++; return 'L'; }
      if (status === 'excused') { eCount++; return 'E'; }
      aCount++;
      return 'A';
    });

    const total = sessions.length;
    const rate = total > 0 ? Math.round(((pCount + lCount + eCount) / total) * 100) : 100;

    csv += `"${st.id_number}","${st.name}","${st.email}",${sessionStatuses.map(s => `"${s}"`).join(',')},${pCount},${lCount},${aCount},${eCount},${rate}%\n`;
  }

  csv += `\nLegend: P = Present, L = Late, A = Absent, E = Excused\n`;

  return {
    filename: `Attendance_${section.section_name}_${section.subject_code}_${new Date().toISOString().slice(0, 10)}.csv`,
    content: csv
  };
}

export function generateSessionRosterCSV(sessionId) {
  const session = db.prepare(`
    SELECT cs.id, cs.date, cs.start_time, cs.status,
           s.name as section_name, s.room,
           sub.code as subject_code, sub.title as subject_title,
           u.name as instructor_name
    FROM class_sessions cs
    JOIN sections s ON cs.section_id = s.id
    JOIN subjects sub ON s.subject_id = sub.id
    LEFT JOIN users u ON cs.instructor_id = u.id
    WHERE cs.id = ?
  `).get(sessionId);

  if (!session) return null;

  const records = db.prepare(`
    SELECT u.id_number, u.name, u.email,
           ar.status, ar.scanned_at, ar.method, ar.ip_address
    FROM enrollments e
    JOIN users u ON e.student_id = u.id
    LEFT JOIN attendance_records ar ON ar.student_id = u.id AND ar.session_id = ?
    JOIN class_sessions cs ON cs.id = ?
    WHERE e.section_id = cs.section_id
    ORDER BY u.name ASC
  `).all(sessionId, sessionId);

  let csv = `CCDI - Class Session Attendance Record\n`;
  csv += `Subject:,"${session.subject_code} - ${session.subject_title}"\n`;
  csv += `Section:,"${session.section_name}",Room:,"${session.room}",Date:,"${session.date}"\n`;
  csv += `Instructor:,"${session.instructor_name || 'N/A'}",Session Status:,"${session.status.toUpperCase()}"\n\n`;

  csv += `"Student ID","Full Name","Email","Attendance Status","Timestamp","Method","IP Address"\n`;

  records.forEach(r => {
    const status = (r.status || (session.status === 'closed' ? 'absent' : 'pending')).toUpperCase();
    const time = r.scanned_at ? new Date(r.scanned_at).toLocaleTimeString() : 'N/A';
    const method = r.method ? r.method.replace('_', ' ').toUpperCase() : 'N/A';
    const ip = r.ip_address || 'N/A';

    csv += `"${r.id_number}","${r.name}","${r.email}","${status}","${time}","${method}","${ip}"\n`;
  });

  return {
    filename: `Session_${session.section_name}_${session.date}.csv`,
    content: csv
  };
}

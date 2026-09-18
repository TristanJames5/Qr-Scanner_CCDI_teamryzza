import cron from 'node-cron';
import db from '../config/db.js';

/**
 * Initializes all background jobs.
 * This should be called once when the server starts.
 */
export function initCronJobs() {
  console.log('[CRON] Initializing background jobs...');

  // ── S-Class: Early Warning System ──────────────────────────────────────────
  // Runs every Friday at 17:00 (5:00 PM)
  // Cron syntax: minute hour dayOfMonth month dayOfWeek
  cron.schedule('0 17 * * 5', () => {
    console.log('[CRON] Running Early Warning System...');
    runEarlyWarningSystem();
  });

  // For testing/demonstration purposes, if NODE_ENV is development,
  // we can also run it immediately on startup to prove it works.
  if (process.env.NODE_ENV !== 'production') {
    console.log('[CRON] Dev mode detected: Running Early Warning System on startup for testing.');
    setTimeout(() => {
      runEarlyWarningSystem();
    }, 5000); // delay 5 seconds after boot
  }
}

function runEarlyWarningSystem() {
  const CRITICAL_ABSENCE_THRESHOLD_PERCENT = 20;

  try {
    // 1. Get all active sections
    const sections = db.prepare(`
      SELECT s.id, s.name, s.room, sub.code as subject_code, sub.title as subject_title, u.name as instructor_name, u.email as instructor_email
      FROM sections s
      JOIN subjects sub ON s.subject_id = sub.id
      JOIN users u ON s.instructor_id = u.id
    `).all();

    let totalAlerts = 0;

    for (const section of sections) {
      // 2. Get all closed sessions for this section
      const closedSessions = db.prepare(`
        SELECT id FROM class_sessions 
        WHERE section_id = ? AND status = 'closed'
      `).all(section.id);

      const totalSessions = closedSessions.length;
      
      // If there are less than 3 sessions, it's too early in the semester to send panicked emails
      if (totalSessions < 3) continue;

      const sessionIds = closedSessions.map(s => s.id);
      const sessionPlaceholders = sessionIds.map(() => '?').join(',');

      // 3. Get all enrolled students
      const students = db.prepare(`
        SELECT u.id, u.name, u.email, u.id_number
        FROM enrollments e
        JOIN users u ON e.student_id = u.id
        WHERE e.section_id = ?
      `).all(section.id);

      // 4. Get all attendance records for these sessions
      const records = db.prepare(`
        SELECT student_id, status
        FROM attendance_records
        WHERE session_id IN (${sessionPlaceholders})
      `).all(...sessionIds);

      // Group records by student
      const recordsByStudent = new Map();
      for (const rec of records) {
        if (!recordsByStudent.has(rec.student_id)) {
          recordsByStudent.set(rec.student_id, { present: 0, late: 0, absent: 0, excused: 0 });
        }
        const counts = recordsByStudent.get(rec.student_id);
        if (counts[rec.status] !== undefined) {
          counts[rec.status]++;
        }
      }

      // 5. Evaluate each student
      for (const student of students) {
        const counts = recordsByStudent.get(student.id) || { present: 0, late: 0, absent: 0, excused: 0 };
        
        // In this system, missing a record means absent
        const recordedCount = counts.present + counts.late + counts.absent + counts.excused;
        const missingCount = totalSessions - recordedCount;
        const totalAbsences = counts.absent + missingCount;

        const absenceRate = Math.round((totalAbsences / totalSessions) * 100);

        if (absenceRate >= CRITICAL_ABSENCE_THRESHOLD_PERCENT) {
          totalAlerts++;
          sendMockEmailAlert(student, section, totalAbsences, totalSessions, absenceRate);
        }
      }
    }

    console.log(`[CRON] Early Warning System finished. Fired ${totalAlerts} alerts.`);

  } catch (error) {
    console.error('[CRON] Failed to run Early Warning System:', error);
  }
}

function sendMockEmailAlert(student, section, absences, total, rate) {
  const divider = '-------------------------------------------------------';
  console.log(`\n${divider}`);
  console.log(`🚨 AUTOMATED EARLY WARNING ALERT`);
  console.log(`To: ${student.email}, ${section.instructor_email}, guidance@ccdi.edu.ph`);
  console.log(`Subject: Urgent: Attendance Warning for ${student.name} in ${section.subject_code}`);
  console.log(divider);
  console.log(`Dear ${student.name},`);
  console.log(`\nYou have reached a critical absence rate of ${rate}% in ${section.subject_code} - ${section.subject_title}.`);
  console.log(`You have accumulated ${absences} absences out of ${total} total class sessions.`);
  console.log(`\nPlease meet with your instructor, ${section.instructor_name}, or the Guidance Office immediately to discuss your standing in the class.`);
  console.log(`\nFailure to attend subsequent classes may result in being dropped from the course.`);
  console.log(`\n- CCDI QRScan Automated System`);
  console.log(`${divider}\n`);
}

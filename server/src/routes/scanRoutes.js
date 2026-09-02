import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/db.js';
import { authenticate } from '../middleware/auth.js';
import { verifyQRToken, verifyBackupCode } from '../services/qrService.js';
import { broadcastSessionEvent } from '../socket/socketHandler.js';

const router = express.Router();

router.post('/', authenticate, async (req, res) => {
  try {
    const student = req.user;
    if (student.role !== 'student') {
      return res.status(403).json({ error: 'Only registered students can record attendance scans.' });
    }

    const { token, sessionId: directSessionId, backupCode } = req.body;
    let targetSessionId = directSessionId;
    let scanMethod = 'qr_scan';

    // 1. Verify Token or Backup Code
    if (token) {
      const verifyResult = verifyQRToken(token, directSessionId);
      if (!verifyResult.valid) {
        return res.status(400).json({ error: verifyResult.error });
      }
      targetSessionId = verifyResult.sessionId;
      scanMethod = 'qr_scan';
    } else if (backupCode && directSessionId) {
      const backupResult = verifyBackupCode(directSessionId, backupCode);
      if (!backupResult.valid) {
        return res.status(400).json({ error: backupResult.error });
      }
      targetSessionId = backupResult.sessionId;
      scanMethod = 'backup_code';
    } else {
      return res.status(400).json({ error: 'Missing QR scan token or session backup code.' });
    }

    // 2. Fetch Session & Section Info
    const session = db.prepare(`
      SELECT cs.*, 
             s.name as section_name, s.room,
             sub.code as subject_code, sub.title as subject_title,
             u.name as instructor_name
      FROM class_sessions cs
      JOIN sections s ON cs.section_id = s.id
      JOIN subjects sub ON s.subject_id = sub.id
      LEFT JOIN users u ON cs.instructor_id = u.id
      WHERE cs.id = ?
    `).get(targetSessionId);

    if (!session) {
      return res.status(404).json({ error: 'Class session not found.' });
    }

    if (session.status !== 'active') {
      return res.status(400).json({ error: 'Class session is closed or finalized.' });
    }

    // 3. Verify Student Enrollment in Section
    const enrollment = db.prepare(`
      SELECT id FROM enrollments WHERE student_id = ? AND section_id = ?
    `).get(student.id, session.section_id);

    if (!enrollment) {
      return res.status(403).json({
        error: `You are not enrolled in ${session.section_name} (${session.subject_code} - ${session.subject_title}).`
      });
    }

    // 4. Verify Single Active Scan Per Student (Anti-Proxy / No duplicate)
    const existingRecord = db.prepare(`
      SELECT id, status, scanned_at, method FROM attendance_records 
      WHERE session_id = ? AND student_id = ?
    `).get(targetSessionId, student.id);

    if (existingRecord) {
      return res.status(409).json({
        error: `You have already scanned for this session (${existingRecord.status.toUpperCase()}) at ${new Date(existingRecord.scanned_at).toLocaleTimeString()}.`,
        alreadyRecorded: true,
        record: existingRecord
      });
    }

    // 5. Determine Present vs Late based on Cutoff Window (Timezone-safe)
    const now = new Date();
    const nowIso = now.toISOString();

    const startRaw = session.start_time;
    const sessionStart = new Date(startRaw.includes('T') || startRaw.includes('Z') ? startRaw : startRaw.replace(' ', 'T') + 'Z');
    const cutoffMinutes = session.late_cutoff_minutes || 15;
    const diffMinutes = Math.max(0, (now.getTime() - sessionStart.getTime()) / (1000 * 60));

    const attendanceStatus = diffMinutes <= cutoffMinutes ? 'present' : 'late';

    const clientIp = req.headers['x-forwarded-for'] || req.socket.remoteAddress || '127.0.0.1';
    const userAgent = req.headers['user-agent'] || 'Web Browser';

    // 6. Record Attendance
    const recordId = uuidv4();
    db.prepare(`
      INSERT INTO attendance_records (id, session_id, student_id, scanned_at, status, method, ip_address, user_agent)
      VALUES (?, ?, ?, ?, ?, ?, ?, ?)
    `).run(recordId, targetSessionId, student.id, nowIso, attendanceStatus, scanMethod, String(clientIp), String(userAgent));

    // 7. Calculate updated stats for real-time broadcast
    const totalEnrolled = db.prepare('SELECT COUNT(*) as count FROM enrollments WHERE section_id = ?').get(session.section_id).count;
    const records = db.prepare('SELECT status, COUNT(*) as count FROM attendance_records WHERE session_id = ? GROUP BY status').all(targetSessionId);

    let presentCount = 0, lateCount = 0, absentCount = 0, excusedCount = 0;
    records.forEach(r => {
      if (r.status === 'present') presentCount = r.count;
      if (r.status === 'late') lateCount = r.count;
      if (r.status === 'absent') absentCount = r.count;
      if (r.status === 'excused') excusedCount = r.count;
    });

    const recordedCount = presentCount + lateCount + absentCount + excusedCount;
    const pendingCount = Math.max(0, totalEnrolled - recordedCount);

    const stats = {
      totalEnrolled,
      present: presentCount,
      late: lateCount,
      absent: absentCount,
      excused: excusedCount,
      pending: pendingCount,
      attendanceRate: totalEnrolled > 0 ? Math.round(((presentCount + lateCount + excusedCount) / totalEnrolled) * 100) : 0
    };

    // 8. Broadcast Live Real-Time Scan to Instructor Screen
    broadcastSessionEvent(targetSessionId, 'student_scanned', {
      student: {
        id: student.id,
        idNumber: student.id_number,
        name: student.name,
        email: student.email,
        avatarUrl: student.avatar_url
      },
      recordId,
      status: attendanceStatus,
      scannedAt: nowIso,
      method: scanMethod,
      stats
    });

    // 9. Return success to student
    res.status(201).json({
      success: true,
      message: `Attendance marked as ${attendanceStatus.toUpperCase()}!`,
      status: attendanceStatus,
      scannedAt: nowIso,
      session: {
        id: targetSessionId,
        subjectCode: session.subject_code,
        subjectTitle: session.subject_title,
        sectionName: session.section_name,
        room: session.room,
        instructorName: session.instructor_name
      },
      student: {
        idNumber: student.id_number,
        name: student.name
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'Failed to process attendance scan: ' + err.message });
  }
});

export default router;

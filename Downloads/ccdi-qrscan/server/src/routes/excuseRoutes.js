import express from 'express';
import { v4 as uuidv4 } from 'uuid';
import db from '../config/db.js';
import { authenticate, authorize } from '../middleware/auth.js';

const router = express.Router();

// ── Cloudinary Upload Signature ─────────────────────────────────────────────
// This is the "Direct Upload" pattern — the client uploads directly to
// Cloudinary using this signed payload, so our Node server never buffers
// the image in memory. This is critical for Render Free Tier stability.
router.get('/signature', authenticate, (req, res) => {
  const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
  const apiKey = process.env.CLOUDINARY_API_KEY;
  const apiSecret = process.env.CLOUDINARY_API_SECRET;

  if (!cloudName || !apiKey || !apiSecret) {
    return res.status(503).json({ 
      error: 'File upload service is not configured. Please contact your administrator.' 
    });
  }

  const timestamp = Math.round(Date.now() / 1000);
  const folder = 'ccdi_excuses';

  // Generate HMAC-SHA256 signature for Cloudinary direct upload
  import('crypto').then(({ createHmac }) => {
    const params = `folder=${folder}&timestamp=${timestamp}`;
    const signature = createHmac('sha256', apiSecret)
      .update(params)
      .digest('hex');

    res.json({ timestamp, signature, apiKey, cloudName, folder });
  });
});

// ── Student: Submit an Excuse Letter ────────────────────────────────────────
router.post('/', authenticate, (req, res) => {
  const student = req.user;
  if (student.role !== 'student') {
    return res.status(403).json({ error: 'Only students can submit excuse letters.' });
  }

  const { attendance_record_id, reason, attachment_url } = req.body;

  if (!attendance_record_id || !reason || !attachment_url) {
    return res.status(400).json({ error: 'attendance_record_id, reason, and attachment_url are required.' });
  }

  // Validate the attendance record belongs to this student and is 'absent'
  const record = db.prepare(`
    SELECT ar.id, ar.status, cs.section_id
    FROM attendance_records ar
    JOIN class_sessions cs ON ar.session_id = cs.id
    WHERE ar.id = ? AND ar.student_id = ?
  `).get(attendance_record_id, student.id);

  if (!record) {
    return res.status(404).json({ error: 'Attendance record not found or does not belong to you.' });
  }

  if (record.status !== 'absent') {
    return res.status(400).json({ error: `You can only submit an excuse for an 'absent' record. Your current status is '${record.status}'.` });
  }

  // UNIQUE constraint handles double-submit automatically — we just catch the error
  try {
    const id = uuidv4();
    db.prepare(`
      INSERT INTO excuse_requests (id, attendance_record_id, student_id, reason, attachment_url)
      VALUES (?, ?, ?, ?, ?)
    `).run(id, attendance_record_id, student.id, reason.trim(), attachment_url);

    res.status(201).json({ message: 'Excuse letter submitted successfully. Awaiting instructor review.', id });
  } catch (err) {
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE' || err.message?.includes('UNIQUE')) {
      return res.status(409).json({ error: 'You have already submitted an excuse letter for this absence.' });
    }
    throw err;
  }
});

// ── Instructor: Get Pending Excuse Requests for My Sections ─────────────────
router.get('/', authenticate, authorize('instructor', 'admin'), (req, res) => {
  const { status = 'pending' } = req.query;

  let query;
  let params;

  if (req.user.role === 'admin') {
    query = `
      SELECT er.*, u.name as student_name, u.id_number, u.email,
             cs.date as session_date, s.name as section_name,
             sub.code as subject_code
      FROM excuse_requests er
      JOIN users u ON er.student_id = u.id
      JOIN attendance_records ar ON er.attendance_record_id = ar.id
      JOIN class_sessions cs ON ar.session_id = cs.id
      JOIN sections s ON cs.section_id = s.id
      JOIN subjects sub ON s.subject_id = sub.id
      WHERE er.status = ?
      ORDER BY er.created_at DESC
    `;
    params = [status];
  } else {
    // Instructor only sees their own sections
    query = `
      SELECT er.*, u.name as student_name, u.id_number, u.email,
             cs.date as session_date, s.name as section_name,
             sub.code as subject_code
      FROM excuse_requests er
      JOIN users u ON er.student_id = u.id
      JOIN attendance_records ar ON er.attendance_record_id = ar.id
      JOIN class_sessions cs ON ar.session_id = cs.id
      JOIN sections s ON cs.section_id = s.id
      JOIN subjects sub ON s.subject_id = sub.id
      WHERE er.status = ? AND s.instructor_id = ?
      ORDER BY er.created_at DESC
    `;
    params = [status, req.user.id];
  }

  const requests = db.prepare(query).all(...params);
  res.json({ requests });
});

// ── Instructor: Approve or Reject an Excuse ─────────────────────────────────
router.put('/:id/review', authenticate, authorize('instructor', 'admin'), (req, res) => {
  const { decision, notes } = req.body; // decision: 'approved' | 'rejected'

  if (!['approved', 'rejected'].includes(decision)) {
    return res.status(400).json({ error: "Decision must be 'approved' or 'rejected'." });
  }

  const excuseRequest = db.prepare(`
    SELECT er.*, ar.student_id, cs.section_id
    FROM excuse_requests er
    JOIN attendance_records ar ON er.attendance_record_id = ar.id
    JOIN class_sessions cs ON ar.session_id = cs.id
    WHERE er.id = ?
  `).get(req.params.id);

  if (!excuseRequest) {
    return res.status(404).json({ error: 'Excuse request not found.' });
  }

  if (excuseRequest.status !== 'pending') {
    return res.status(409).json({ error: 'This excuse request has already been reviewed.' });
  }

  // Authorize instructors to only review their own sections
  if (req.user.role === 'instructor') {
    const section = db.prepare('SELECT instructor_id FROM sections WHERE id = ?').get(excuseRequest.section_id);
    if (!section || section.instructor_id !== req.user.id) {
      return res.status(403).json({ error: 'You are not authorized to review this request.' });
    }
  }

  // S-Class: ATOMIC TRANSACTION — both rows update or neither does
  const updateBoth = db.transaction(() => {
    db.prepare(`
      UPDATE excuse_requests 
      SET status = ?, reviewed_by = ?, reviewed_at = CURRENT_TIMESTAMP
      WHERE id = ?
    `).run(decision, req.user.id, excuseRequest.id);

    if (decision === 'approved') {
      // Flip the attendance record from 'absent' to 'excused'
      db.prepare(`
        UPDATE attendance_records SET status = 'excused' WHERE id = ?
      `).run(excuseRequest.attendance_record_id);

      // Log this override to the audit trail that already exists in the system
      db.prepare(`
        INSERT INTO attendance_audit_logs (id, session_id, student_id, changed_by, previous_status, new_status, reason)
        VALUES (?, 
          (SELECT session_id FROM attendance_records WHERE id = ?),
          ?, ?, 'absent', 'excused', ?)
      `).run(uuidv4(), excuseRequest.attendance_record_id, excuseRequest.student_id, req.user.id, 
             `Excuse letter approved. ${notes || ''}`);
    }
  });

  updateBoth();

  res.json({ message: `Excuse request successfully ${decision}.` });
});

export default router;

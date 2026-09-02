import crypto from 'crypto';
import QRCode from 'qrcode';
import db from '../config/db.js';

const QR_HMAC_SECRET = process.env.QR_HMAC_SECRET || 'ccdi_qr_rotation_hmac_signing_key_987654321';
const ROTATION_INTERVAL_MS = 30000; // 30 seconds
const GRACE_PERIOD_MS = 5000;       // 5 seconds network transit tolerance

// Generates a random 6-character uppercase alphanumeric backup code
function generateBackupCode() {
  const chars = '23456789ABCDEFGHJKLMNPQRSTUVWXYZ'; // Exclude 0, 1, I, O to prevent confusion
  let code = '';
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length));
  }
  return code;
}

export async function generateSessionQRToken(sessionId, version = 1) {
  const now = Date.now();
  const expiresAt = now + ROTATION_INTERVAL_MS;
  const backupCode = generateBackupCode();

  const payloadString = `${sessionId}:${version}:${expiresAt}:${backupCode}`;
  const signature = crypto
    .createHmac('sha256', QR_HMAC_SECRET)
    .update(payloadString)
    .digest('hex')
    .substring(0, 32); // 32 hex chars

  const tokenObject = {
    s: sessionId,
    v: version,
    e: expiresAt,
    b: backupCode,
    sig: signature
  };

  const rawToken = Buffer.from(JSON.stringify(tokenObject)).toString('base64');

  // Generate high quality QR code data URL
  const qrDataUrl = await QRCode.toDataURL(rawToken, {
    errorCorrectionLevel: 'M',
    margin: 2,
    scale: 8,
    color: {
      dark: '#0f172a', // Slate 900
      light: '#ffffff'
    }
  });

  // Update session record with active token and backup code
  db.prepare(`
    UPDATE class_sessions 
    SET current_token = ?, current_backup_code = ?, token_version = ?
    WHERE id = ?
  `).run(rawToken, backupCode, version, sessionId);

  return {
    rawToken,
    qrDataUrl,
    backupCode,
    version,
    expiresAt,
    durationMs: ROTATION_INTERVAL_MS
  };
}

export function verifyQRToken(rawToken, targetSessionId) {
  try {
    const jsonStr = Buffer.from(rawToken, 'base64').toString('utf-8');
    const tokenObj = JSON.parse(jsonStr);

    const { s: sessionId, v: version, e: expiresAt, b: backupCode, sig } = tokenObj;

    if (!sessionId || !version || !expiresAt || !sig) {
      return { valid: false, error: 'Invalid QR token structure' };
    }

    if (targetSessionId && sessionId !== targetSessionId) {
      return { valid: false, error: 'Token is for a different class session' };
    }

    // Verify HMAC signature
    const payloadString = `${sessionId}:${version}:${expiresAt}:${backupCode}`;
    const expectedSig = crypto
      .createHmac('sha256', QR_HMAC_SECRET)
      .update(payloadString)
      .digest('hex')
      .substring(0, 32);

    if (sig !== expectedSig) {
      return { valid: false, error: 'Cryptographic signature mismatch (tampered token)' };
    }

    // Check expiration with 5-second grace period
    const now = Date.now();
    if (now > expiresAt + GRACE_PERIOD_MS) {
      return { valid: false, error: 'QR Code expired! Please scan the current code on screen.' };
    }

    // Check database session state
    const session = db.prepare('SELECT id, status, token_version FROM class_sessions WHERE id = ?').get(sessionId);
    if (!session) {
      return { valid: false, error: 'Class session not found' };
    }

    if (session.status !== 'active') {
      return { valid: false, error: 'Class session has already been closed or cancelled' };
    }

    // Anti-replay: verify token version is current or within 1 version tolerance for active grace period
    if (Math.abs(session.token_version - version) > 1) {
      return { valid: false, error: 'Outdated QR code version. Please rescan the refreshed code.' };
    }

    return {
      valid: true,
      sessionId,
      version,
      backupCode
    };
  } catch (err) {
    return { valid: false, error: 'Malformed token data: ' + err.message };
  }
}

export function verifyBackupCode(sessionId, inputCode) {
  if (!inputCode || !sessionId) {
    return { valid: false, error: 'Session ID and 6-character backup code required' };
  }

  const session = db.prepare('SELECT id, status, current_backup_code FROM class_sessions WHERE id = ?').get(sessionId);
  if (!session) {
    return { valid: false, error: 'Class session not found' };
  }

  if (session.status !== 'active') {
    return { valid: false, error: 'Class session is closed' };
  }

  if (!session.current_backup_code || session.current_backup_code.toUpperCase() !== inputCode.trim().toUpperCase()) {
    return { valid: false, error: 'Invalid or expired 6-character backup code. Check projector screen.' };
  }

  return { valid: true, sessionId };
}

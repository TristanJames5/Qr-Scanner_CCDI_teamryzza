import { DatabaseSync } from 'node:sqlite';
import path from 'path';
import fs from 'fs';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const isVercel = process.env.VERCEL === '1' || process.env.VERCEL === 'true';
const dbDir = isVercel ? '/tmp' : path.resolve(__dirname, '../../database');

if (!fs.existsSync(dbDir)) {
  fs.mkdirSync(dbDir, { recursive: true });
}

const dbPath = path.join(dbDir, 'ccdi_qrscan.db');
const db = new DatabaseSync(dbPath);

// Enable WAL mode and Foreign Keys for high concurrency and referential integrity
db.exec('PRAGMA foreign_keys = ON;');
db.exec('PRAGMA journal_mode = WAL;');

export function initDatabase() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id TEXT PRIMARY KEY,
      id_number TEXT UNIQUE NOT NULL,
      name TEXT NOT NULL,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT CHECK(role IN ('admin', 'instructor', 'student')) NOT NULL,
      department TEXT DEFAULT 'College of Information & Communications Technology',
      avatar_url TEXT,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS subjects (
      id TEXT PRIMARY KEY,
      code TEXT UNIQUE NOT NULL,
      title TEXT NOT NULL,
      units INTEGER DEFAULT 3,
      description TEXT
    );

    CREATE TABLE IF NOT EXISTS sections (
      id TEXT PRIMARY KEY,
      name TEXT NOT NULL,
      subject_id TEXT REFERENCES subjects(id) ON DELETE CASCADE,
      instructor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      academic_term TEXT NOT NULL,
      room TEXT NOT NULL,
      schedule TEXT NOT NULL,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS enrollments (
      id TEXT PRIMARY KEY,
      student_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      section_id TEXT REFERENCES sections(id) ON DELETE CASCADE,
      enrolled_at DATETIME DEFAULT CURRENT_TIMESTAMP,
      UNIQUE(student_id, section_id)
    );

    CREATE TABLE IF NOT EXISTS class_sessions (
      id TEXT PRIMARY KEY,
      section_id TEXT REFERENCES sections(id) ON DELETE CASCADE,
      instructor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
      date TEXT NOT NULL,
      start_time DATETIME NOT NULL,
      end_time DATETIME,
      late_cutoff_minutes INTEGER DEFAULT 15,
      status TEXT CHECK(status IN ('active', 'closed', 'cancelled')) DEFAULT 'active',
      current_token TEXT,
      current_backup_code TEXT,
      token_version INTEGER DEFAULT 1,
      created_at DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE TABLE IF NOT EXISTS attendance_records (
      id TEXT PRIMARY KEY,
      session_id TEXT REFERENCES class_sessions(id) ON DELETE CASCADE,
      student_id TEXT REFERENCES users(id) ON DELETE CASCADE,
      scanned_at DATETIME NOT NULL,
      status TEXT CHECK(status IN ('present', 'late', 'absent', 'excused')) NOT NULL,
      method TEXT CHECK(method IN ('qr_scan', 'manual_override', 'backup_code')) DEFAULT 'qr_scan',
      ip_address TEXT,
      user_agent TEXT,
      UNIQUE(session_id, student_id)
    );

    CREATE TABLE IF NOT EXISTS attendance_audit_logs (
      id TEXT PRIMARY KEY,
      attendance_record_id TEXT,
      session_id TEXT NOT NULL,
      student_id TEXT NOT NULL,
      changed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
      previous_status TEXT,
      new_status TEXT NOT NULL,
      reason TEXT NOT NULL,
      timestamp DATETIME DEFAULT CURRENT_TIMESTAMP
    );

    CREATE INDEX IF NOT EXISTS idx_attendance_session ON attendance_records(session_id);
    CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance_records(student_id);
    CREATE INDEX IF NOT EXISTS idx_sessions_section ON class_sessions(section_id);
    CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
    CREATE INDEX IF NOT EXISTS idx_enrollments_section ON enrollments(section_id);
  `);
  console.log('Database tables initialized successfully with foreign keys and WAL mode.');
}

export default db;

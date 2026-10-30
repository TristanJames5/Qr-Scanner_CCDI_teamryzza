-- =============================================================================
-- CCDI QRScan System - Supabase PostgreSQL Schema
-- Run this script inside your Supabase Project -> SQL Editor
-- =============================================================================

-- Enable UUID extension if needed
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- 1. Users Table
CREATE TABLE IF NOT EXISTS users (
    id TEXT PRIMARY KEY,
    id_number TEXT UNIQUE NOT NULL,
    name TEXT NOT NULL,
    email TEXT UNIQUE NOT NULL,
    password_hash TEXT NOT NULL,
    role TEXT CHECK(role IN ('admin', 'instructor', 'student')) NOT NULL,
    department TEXT DEFAULT 'College of Information & Communications Technology',
    avatar_url TEXT,
    total_xp INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 2. Subjects Table
CREATE TABLE IF NOT EXISTS subjects (
    id TEXT PRIMARY KEY,
    code TEXT UNIQUE NOT NULL,
    title TEXT NOT NULL,
    units INTEGER DEFAULT 3,
    description TEXT
);

-- 3. Sections Table
CREATE TABLE IF NOT EXISTS sections (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    subject_id TEXT REFERENCES subjects(id) ON DELETE CASCADE,
    instructor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    academic_term TEXT NOT NULL,
    room TEXT NOT NULL,
    schedule TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 4. Enrollments Table
CREATE TABLE IF NOT EXISTS enrollments (
    id TEXT PRIMARY KEY,
    student_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    section_id TEXT REFERENCES sections(id) ON DELETE CASCADE,
    enrolled_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, section_id)
);

-- 5. Class Sessions Table
CREATE TABLE IF NOT EXISTS class_sessions (
    id TEXT PRIMARY KEY,
    section_id TEXT REFERENCES sections(id) ON DELETE CASCADE,
    instructor_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    date TEXT NOT NULL,
    start_time TIMESTAMPTZ NOT NULL,
    end_time TIMESTAMPTZ,
    late_cutoff_minutes INTEGER DEFAULT 15,
    status TEXT CHECK(status IN ('active', 'closed', 'cancelled')) DEFAULT 'active',
    current_token TEXT,
    current_backup_code TEXT,
    token_version INTEGER DEFAULT 1,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 6. Attendance Records Table
CREATE TABLE IF NOT EXISTS attendance_records (
    id TEXT PRIMARY KEY,
    session_id TEXT REFERENCES class_sessions(id) ON DELETE CASCADE,
    student_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    scanned_at TIMESTAMPTZ NOT NULL,
    status TEXT CHECK(status IN ('present', 'late', 'absent', 'excused')) NOT NULL,
    method TEXT CHECK(method IN ('qr_scan', 'manual_override', 'backup_code')) DEFAULT 'qr_scan',
    ip_address TEXT,
    user_agent TEXT,
    UNIQUE(session_id, student_id)
);

-- 7. Attendance Audit Logs Table
CREATE TABLE IF NOT EXISTS attendance_audit_logs (
    id TEXT PRIMARY KEY,
    attendance_record_id TEXT,
    session_id TEXT NOT NULL,
    student_id TEXT NOT NULL,
    changed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    previous_status TEXT,
    new_status TEXT NOT NULL,
    reason TEXT NOT NULL,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 8. Session Prompts (Active Presence / Pop Quizzes)
CREATE TABLE IF NOT EXISTS session_prompts (
    id TEXT PRIMARY KEY,
    session_id TEXT NOT NULL REFERENCES class_sessions(id) ON DELETE CASCADE,
    group_id TEXT,
    question_text TEXT NOT NULL,
    image_url TEXT,
    options_json TEXT NOT NULL,
    correct_option TEXT NOT NULL,
    time_limit_seconds INTEGER DEFAULT 20,
    status TEXT CHECK(status IN ('draft', 'active', 'completed')) DEFAULT 'draft',
    end_time BIGINT,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 9. Prompt Responses Table
CREATE TABLE IF NOT EXISTS prompt_responses (
    id TEXT PRIMARY KEY,
    prompt_id TEXT NOT NULL REFERENCES session_prompts(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    selected_option TEXT NOT NULL,
    is_correct BOOLEAN NOT NULL,
    points_awarded INTEGER DEFAULT 0,
    created_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(prompt_id, student_id)
);

-- 10. Excuse Requests Table
CREATE TABLE IF NOT EXISTS excuse_requests (
    id TEXT PRIMARY KEY,
    attendance_record_id TEXT NOT NULL UNIQUE REFERENCES attendance_records(id) ON DELETE CASCADE,
    student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    attachment_url TEXT NOT NULL,
    status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 11. Admin Audit Logs Table
CREATE TABLE IF NOT EXISTS admin_audit_logs (
    id TEXT PRIMARY KEY,
    admin_id TEXT NOT NULL,
    admin_name TEXT NOT NULL,
    action TEXT NOT NULL,
    target_type TEXT NOT NULL,
    target_id TEXT,
    details TEXT,
    timestamp TIMESTAMPTZ DEFAULT NOW()
);

-- 12. Announcements Table
CREATE TABLE IF NOT EXISTS announcements (
    id TEXT PRIMARY KEY,
    author_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    author_name TEXT NOT NULL,
    title TEXT NOT NULL,
    content TEXT NOT NULL,
    target_audience TEXT DEFAULT 'all',
    priority TEXT DEFAULT 'normal',
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 13. Absence Excuse Requests Table
CREATE TABLE IF NOT EXISTS absence_excuse_requests (
    id TEXT PRIMARY KEY,
    student_id TEXT REFERENCES users(id) ON DELETE CASCADE,
    session_id TEXT REFERENCES class_sessions(id) ON DELETE CASCADE,
    reason TEXT NOT NULL,
    documentation_url TEXT,
    status TEXT CHECK(status IN ('pending', 'approved', 'rejected')) DEFAULT 'pending',
    reviewed_by TEXT REFERENCES users(id) ON DELETE SET NULL,
    review_notes TEXT,
    reviewed_at TIMESTAMPTZ,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 14. Notification Logs Table
CREATE TABLE IF NOT EXISTS notification_logs (
    id TEXT PRIMARY KEY,
    recipient_id TEXT REFERENCES users(id) ON DELETE SET NULL,
    recipient_name TEXT,
    recipient_contact TEXT,
    channel TEXT DEFAULT 'email',
    subject TEXT,
    message TEXT NOT NULL,
    status TEXT DEFAULT 'sent',
    sent_at TIMESTAMPTZ DEFAULT NOW(),
    read_at TIMESTAMPTZ
);

-- 15. Student XP Table (Gamification)
CREATE TABLE IF NOT EXISTS student_xp (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    section_id TEXT REFERENCES sections(id) ON DELETE SET NULL,
    session_id TEXT REFERENCES class_sessions(id) ON DELETE SET NULL,
    attendance_record_id TEXT,
    xp_earned INTEGER NOT NULL,
    reason TEXT NOT NULL,
    created_at TIMESTAMPTZ DEFAULT NOW()
);

-- 16. Student Badges Table (Gamification)
CREATE TABLE IF NOT EXISTS student_badges (
    id TEXT PRIMARY KEY,
    student_id TEXT NOT NULL REFERENCES users(id) ON DELETE CASCADE,
    badge_key TEXT NOT NULL,
    badge_name TEXT NOT NULL,
    badge_description TEXT,
    badge_xp INTEGER DEFAULT 0,
    badge_tier INTEGER DEFAULT 1,
    badge_emoji TEXT,
    earned_at TIMESTAMPTZ DEFAULT NOW(),
    UNIQUE(student_id, badge_key)
);

-- =============================================================================
-- Performance Indexes
-- =============================================================================
CREATE INDEX IF NOT EXISTS idx_attendance_session ON attendance_records(session_id);
CREATE INDEX IF NOT EXISTS idx_attendance_student ON attendance_records(student_id);
CREATE INDEX IF NOT EXISTS idx_sessions_section ON class_sessions(section_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_student ON enrollments(student_id);
CREATE INDEX IF NOT EXISTS idx_enrollments_section ON enrollments(section_id);
CREATE UNIQUE INDEX IF NOT EXISTS idx_attendance_session_student ON attendance_records(session_id, student_id);
CREATE INDEX IF NOT EXISTS idx_sessions_section_status ON class_sessions(section_id, status);
CREATE INDEX IF NOT EXISTS idx_session_prompts ON session_prompts(session_id);
CREATE INDEX IF NOT EXISTS idx_prompt_responses_student ON prompt_responses(student_id);
CREATE INDEX IF NOT EXISTS idx_excuse_status ON excuse_requests(status);
CREATE INDEX IF NOT EXISTS idx_excuse_student ON excuse_requests(student_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_timestamp ON admin_audit_logs(timestamp);
CREATE INDEX IF NOT EXISTS idx_excuse_requests_status ON absence_excuse_requests(status);
CREATE INDEX IF NOT EXISTS idx_student_xp_student ON student_xp(student_id);
CREATE INDEX IF NOT EXISTS idx_student_xp_session ON student_xp(session_id);
CREATE INDEX IF NOT EXISTS idx_student_badges_student ON student_badges(student_id);


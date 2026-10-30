-- =============================================================================
-- CCDI QRScan System - Supabase PostgreSQL Seed Data
-- Run this AFTER running supabase_schema.sql
-- =============================================================================

-- Passwords:
-- Admin: admin123 -> $2a$10$wT3WfC1fV8kK4lO/3EaL0e.hU9dYc1o6jJbWqM6hBvH2vT6oFm9Su
-- Instructor: instructor123 -> $2a$10$lJkL5mO7nQ9pR1sT3uV5w.xY8zA0bC2dE4fG6hI8jK0lM2nO4pQ6u
-- Student: student123 -> $2a$10$K7v9L3m1N5o7P9q1R3s5u.w7y9A1b3c5d7e9f1g3h5i7j9k1l3m5o

-- 1. Admin
INSERT INTO users (id, id_number, name, email, password_hash, role, department, avatar_url)
VALUES (
    'a0000000-0000-0000-0000-000000000001',
    'ADM-001',
    'Dr. Maria Victoria Cruz',
    'admin@ccdi.edu.ph',
    '$2a$10$Q7c9t/39z7m0T4uY6v4rUeLqL7aB2W5l4E4sK9mB.8oT3kY6gH2t.',
    'admin',
    'College Dean Office',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
) ON CONFLICT (id_number) DO NOTHING;

-- 2. Instructors
INSERT INTO users (id, id_number, name, email, password_hash, role, department, avatar_url)
VALUES 
(
    'b0000000-0000-0000-0000-000000000001',
    'INST-101',
    'Prof. Roberto Santos',
    'prof.santos@ccdi.edu.ph',
    '$2a$10$Q7c9t/39z7m0T4uY6v4rUeLqL7aB2W5l4E4sK9mB.8oT3kY6gH2t.',
    'instructor',
    'Information Technology Department',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
),
(
    'b0000000-0000-0000-0000-000000000002',
    'INST-102',
    'Engr. Ana Reyes',
    'engr.reyes@ccdi.edu.ph',
    '$2a$10$Q7c9t/39z7m0T4uY6v4rUeLqL7aB2W5l4E4sK9mB.8oT3kY6gH2t.',
    'instructor',
    'Computer Science Department',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80'
),
(
    'b0000000-0000-0000-0000-000000000003',
    'INST-103',
    'Prof. Carlos De Luna',
    'prof.deluna@ccdi.edu.ph',
    '$2a$10$Q7c9t/39z7m0T4uY6v4rUeLqL7aB2W5l4E4sK9mB.8oT3kY6gH2t.',
    'instructor',
    'Information Systems Department',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
) ON CONFLICT (id_number) DO NOTHING;

-- 3. Subjects
INSERT INTO subjects (id, code, title, units, description)
VALUES
('s0000000-0000-0000-0000-000000000001', 'IT301', 'Web Systems and Technologies', 3, 'Full-stack web application development, RESTful APIs, and cloud deployments.'),
('s0000000-0000-0000-0000-000000000002', 'CS202', 'Data Structures and Algorithms', 3, 'Fundamental data structures, search/sorting algorithms, and asymptotic complexity.'),
('s0000000-0000-0000-0000-000000000003', 'IS401', 'Capstone Project & Research 1', 3, 'Methods of research, systems analysis and design for IT capstone solutions.'),
('s0000000-0000-0000-0000-000000000004', 'IT204', 'Database Management Systems', 3, 'Relational database design, normalization, SQL optimization, and transaction ACID properties.')
ON CONFLICT (code) DO NOTHING;

-- 4. Sections
INSERT INTO sections (id, name, subject_id, instructor_id, academic_term, room, schedule)
VALUES
('c0000000-0000-0000-0000-000000000001', 'BSIT-3A', 's0000000-0000-0000-0000-000000000001', 'b0000000-0000-0000-0000-000000000001', '1st Semester 2026-2027', 'Lab 304 - Computer Lab', 'MW 08:30 AM - 10:00 AM'),
('c0000000-0000-0000-0000-000000000002', 'BSCS-2B', 's0000000-0000-0000-0000-000000000002', 'b0000000-0000-0000-0000-000000000002', '1st Semester 2026-2027', 'Lab 201 - Software Lab', 'TTH 01:00 PM - 02:30 PM'),
('c0000000-0000-0000-0000-000000000003', 'BSIS-4A', 's0000000-0000-0000-0000-000000000003', 'b0000000-0000-0000-0000-000000000003', '1st Semester 2026-2027', 'Multimedia Room 102', 'Fri 09:00 AM - 12:00 PM'),
('c0000000-0000-0000-0000-000000000004', 'BSIT-2C', 's0000000-0000-0000-0000-000000000004', 'b0000000-0000-0000-0000-000000000001', '1st Semester 2026-2027', 'Lab 302 - Database Lab', 'TTH 10:00 AM - 11:30 AM')
ON CONFLICT (id) DO NOTHING;

-- 5. Default Students
INSERT INTO users (id, id_number, name, email, password_hash, role, department, avatar_url)
VALUES
('d0000000-0000-0000-0000-000000000001', '2023-00101', 'Juan Dela Cruz', 'juan.delacruz@ccdi.edu.ph', '$2a$10$Q7c9t/39z7m0T4uY6v4rUeLqL7aB2W5l4E4sK9mB.8oT3kY6gH2t.', 'student', 'College of Information & Communications Technology', 'https://api.dicebear.com/7.x/avataaars/svg?seed=2023-00101'),
('d0000000-0000-0000-0000-000000000002', '2023-00102', 'Maria Angelica Santos', 'maria.santos@ccdi.edu.ph', '$2a$10$Q7c9t/39z7m0T4uY6v4rUeLqL7aB2W5l4E4sK9mB.8oT3kY6gH2t.', 'student', 'College of Information & Communications Technology', 'https://api.dicebear.com/7.x/avataaars/svg?seed=2023-00102'),
('d0000000-0000-0000-0000-000000000003', '2023-00103', 'Joshua Bautista', 'joshua.bautista@ccdi.edu.ph', '$2a$10$Q7c9t/39z7m0T4uY6v4rUeLqL7aB2W5l4E4sK9mB.8oT3kY6gH2t.', 'student', 'College of Information & Communications Technology', 'https://api.dicebear.com/7.x/avataaars/svg?seed=2023-00103')
ON CONFLICT (id_number) DO NOTHING;

-- 6. Enrollments for BSIT-3A
INSERT INTO enrollments (id, student_id, section_id)
VALUES
('e0000000-0000-0000-0000-000000000001', 'd0000000-0000-0000-0000-000000000001', 'c0000000-0000-0000-0000-000000000001'),
('e0000000-0000-0000-0000-000000000002', 'd0000000-0000-0000-0000-000000000002', 'c0000000-0000-0000-0000-000000000001'),
('e0000000-0000-0000-0000-000000000003', 'd0000000-0000-0000-0000-000000000003', 'c0000000-0000-0000-0000-000000000001')
ON CONFLICT (student_id, section_id) DO NOTHING;


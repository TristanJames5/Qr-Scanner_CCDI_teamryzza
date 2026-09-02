import bcrypt from 'bcryptjs';
import { v4 as uuidv4 } from 'uuid';
import db, { initDatabase } from './db.js';

export function seedDatabase() {
  initDatabase();

  const userCount = db.prepare('SELECT COUNT(*) as count FROM users').get().count;
  if (userCount > 0) {
    console.log('Database already has data. Skipping seed.');
    return;
  }

  console.log('Seeding database with realistic CCDI college data...');

  const passwordHashAdmin = bcrypt.hashSync('admin123', 10);
  const passwordHashInst = bcrypt.hashSync('instructor123', 10);
  const passwordHashStudent = bcrypt.hashSync('student123', 10);

  const insertUser = db.prepare(`
    INSERT INTO users (id, id_number, name, email, password_hash, role, department, avatar_url)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // 1. Admin
  const adminId = uuidv4();
  insertUser.run(
    adminId,
    'ADM-001',
    'Dr. Maria Victoria Cruz',
    'admin@ccdi.edu.ph',
    passwordHashAdmin,
    'admin',
    'College Dean Office',
    'https://images.unsplash.com/photo-1573496359142-b8d87734a5a2?w=150&auto=format&fit=crop&q=80'
  );

  // 2. Instructors
  const inst1Id = uuidv4();
  insertUser.run(
    inst1Id,
    'INST-101',
    'Prof. Roberto Santos',
    'prof.santos@ccdi.edu.ph',
    passwordHashInst,
    'instructor',
    'Information Technology Department',
    'https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150&auto=format&fit=crop&q=80'
  );

  const inst2Id = uuidv4();
  insertUser.run(
    inst2Id,
    'INST-102',
    'Engr. Ana Reyes',
    'engr.reyes@ccdi.edu.ph',
    passwordHashInst,
    'instructor',
    'Computer Science Department',
    'https://images.unsplash.com/photo-1580489944761-15a19d654956?w=150&auto=format&fit=crop&q=80'
  );

  const inst3Id = uuidv4();
  insertUser.run(
    inst3Id,
    'INST-103',
    'Prof. Carlos De Luna',
    'prof.deluna@ccdi.edu.ph',
    passwordHashInst,
    'instructor',
    'Information Systems Department',
    'https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150&auto=format&fit=crop&q=80'
  );

  // 3. Subjects
  const insertSubject = db.prepare(`
    INSERT INTO subjects (id, code, title, units, description)
    VALUES (?, ?, ?, ?, ?)
  `);

  const sub1Id = uuidv4();
  insertSubject.run(sub1Id, 'IT301', 'Web Systems and Technologies', 3, 'Full-stack web application development, RESTful APIs, and cloud deployments.');

  const sub2Id = uuidv4();
  insertSubject.run(sub2Id, 'CS202', 'Data Structures and Algorithms', 3, 'Fundamental data structures, search/sorting algorithms, and asymptotic complexity.');

  const sub3Id = uuidv4();
  insertSubject.run(sub3Id, 'IS401', 'Capstone Project & Research 1', 3, 'Methods of research, systems analysis and design for IT capstone solutions.');

  const sub4Id = uuidv4();
  insertSubject.run(sub4Id, 'IT204', 'Database Management Systems', 3, 'Relational database design, normalization, SQL optimization, and transaction ACID properties.');

  // 4. Sections
  const insertSection = db.prepare(`
    INSERT INTO sections (id, name, subject_id, instructor_id, academic_term, room, schedule)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `);

  const sec1Id = uuidv4(); // BSIT-3A
  insertSection.run(sec1Id, 'BSIT-3A', sub1Id, inst1Id, '1st Semester 2026-2027', 'Lab 304 - Computer Lab', 'MW 08:30 AM - 10:00 AM');

  const sec2Id = uuidv4(); // BSCS-2B
  insertSection.run(sec2Id, 'BSCS-2B', sub2Id, inst2Id, '1st Semester 2026-2027', 'Lab 201 - Software Lab', 'TTH 01:00 PM - 02:30 PM');

  const sec3Id = uuidv4(); // BSIS-4A
  insertSection.run(sec3Id, 'BSIS-4A', sub3Id, inst3Id, '1st Semester 2026-2027', 'Multimedia Room 102', 'Fri 09:00 AM - 12:00 PM');

  const sec4Id = uuidv4(); // BSIT-2C
  insertSection.run(sec4Id, 'BSIT-2C', sub4Id, inst1Id, '1st Semester 2026-2027', 'Lab 302 - Database Lab', 'TTH 10:00 AM - 11:30 AM');

  // 5. Students (30 realistic students)
  const studentData = [
    { idNum: '2023-00101', name: 'Juan Dela Cruz', email: 'juan.delacruz@ccdi.edu.ph' },
    { idNum: '2023-00102', name: 'Maria Angelica Santos', email: 'maria.santos@ccdi.edu.ph' },
    { idNum: '2023-00103', name: 'Joshua Bautista', email: 'joshua.bautista@ccdi.edu.ph' },
    { idNum: '2023-00104', name: 'Christine Joy Reyes', email: 'christine.reyes@ccdi.edu.ph' },
    { idNum: '2023-00105', name: 'Angelo Miguel Garcia', email: 'angelo.garcia@ccdi.edu.ph' },
    { idNum: '2023-00106', name: 'Patricia Nicole Mendoza', email: 'patricia.mendoza@ccdi.edu.ph' },
    { idNum: '2023-00107', name: 'Mark Anthony Ramos', email: 'mark.ramos@ccdi.edu.ph' }, // Chronic absentee for pattern detection test
    { idNum: '2023-00108', name: 'Bea Alonzo Hernandez', email: 'bea.hernandez@ccdi.edu.ph' },
    { idNum: '2023-00109', name: 'Jerome Flores', email: 'jerome.flores@ccdi.edu.ph' },
    { idNum: '2023-00110', name: 'Aira Nicole Soriano', email: 'aira.soriano@ccdi.edu.ph' },
    { idNum: '2023-00111', name: 'Christian Paul Diaz', email: 'christian.diaz@ccdi.edu.ph' },
    { idNum: '2023-00112', name: 'Kimberly Aquino', email: 'kimberly.aquino@ccdi.edu.ph' },
    { idNum: '2023-00113', name: 'John Lloyd Tolentino', email: 'john.tolentino@ccdi.edu.ph' },
    { idNum: '2023-00114', name: 'Princess Mae Villanueva', email: 'princess.villanueva@ccdi.edu.ph' }, // High risk student
    { idNum: '2023-00115', name: 'Gabriel Castillo', email: 'gabriel.castillo@ccdi.edu.ph' },
    { idNum: '2023-00116', name: 'Kathryn Bernardo Ramos', email: 'kathryn.ramos@ccdi.edu.ph' },
    { idNum: '2023-00117', name: 'Daniel John Padilla', email: 'daniel.padilla@ccdi.edu.ph' },
    { idNum: '2023-00118', name: 'Liza Soberano Tan', email: 'liza.tan@ccdi.edu.ph' },
    { idNum: '2023-00119', name: 'Enrique Gil Navarro', email: 'enrique.navarro@ccdi.edu.ph' },
    { idNum: '2023-00120', name: 'Nadine Lustre Panganiban', email: 'nadine.panganiban@ccdi.edu.ph' },
    { idNum: '2023-00121', name: 'James Reid Fernandez', email: 'james.fernandez@ccdi.edu.ph' },
    { idNum: '2023-00122', name: 'Andrea Brillantes Gomez', email: 'andrea.gomez@ccdi.edu.ph' },
    { idNum: '2023-00123', name: 'Kyle Echarri Salvador', email: 'kyle.salvador@ccdi.edu.ph' },
    { idNum: '2023-00124', name: 'Francine Diaz Perez', email: 'francine.perez@ccdi.edu.ph' },
    { idNum: '2023-00125', name: 'Seth Fedelin Miranda', email: 'seth.miranda@ccdi.edu.ph' }
  ];

  const studentIds = [];
  studentData.forEach((s) => {
    const sId = uuidv4();
    studentIds.push({ id: sId, ...s });
    insertUser.run(
      sId,
      s.idNum,
      s.name,
      s.email,
      passwordHashStudent,
      'student',
      'College of Information & Communications Technology',
      `https://api.dicebear.com/7.x/avataaars/svg?seed=${s.idNum}`
    );
  });

  // 6. Enrollments
  const insertEnrollment = db.prepare(`
    INSERT INTO enrollments (id, student_id, section_id)
    VALUES (?, ?, ?)
  `);

  // Enroll all 25 students into BSIT-3A (sec1Id)
  studentIds.forEach((s) => {
    insertEnrollment.run(uuidv4(), s.id, sec1Id);
  });

  // Enroll first 15 students into BSCS-2B (sec2Id)
  studentIds.slice(0, 15).forEach((s) => {
    insertEnrollment.run(uuidv4(), s.id, sec2Id);
  });

  // Enroll students 10-25 into BSIS-4A (sec3Id)
  studentIds.slice(10, 25).forEach((s) => {
    insertEnrollment.run(uuidv4(), s.id, sec3Id);
  });

  // 7. Historical Sessions for BSIT-3A to demonstrate Pattern Detection
  const insertSession = db.prepare(`
    INSERT INTO class_sessions (id, section_id, instructor_id, date, start_time, end_time, late_cutoff_minutes, status, created_at)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAttendance = db.prepare(`
    INSERT INTO attendance_records (id, session_id, student_id, scanned_at, status, method, ip_address, user_agent)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?)
  `);

  const insertAudit = db.prepare(`
    INSERT INTO attendance_audit_logs (id, attendance_record_id, session_id, student_id, changed_by, previous_status, new_status, reason, timestamp)
    VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)
  `);

  // Create 5 completed past sessions
  const pastDates = [
    '2026-08-11',
    '2026-08-13',
    '2026-08-18',
    '2026-08-20',
    '2026-08-25'
  ];

  pastDates.forEach((dateStr, sessionIdx) => {
    const sessId = uuidv4();
    const startTime = `${dateStr} 08:30:00`;
    const endTime = `${dateStr} 10:00:00`;
    insertSession.run(
      sessId,
      sec1Id,
      inst1Id,
      dateStr,
      startTime,
      endTime,
      15,
      'closed',
      startTime
    );

    studentIds.forEach((s, sIdx) => {
      let status = 'present';
      let method = 'qr_scan';

      // Specific patterns for demonstration:
      if (s.idNum === '2023-00107') {
        // Mark Anthony Ramos: Absent in 4 of last 5 sessions (sessions 1, 2, 3, 4)
        status = sessionIdx === 0 ? 'present' : 'absent';
      } else if (s.idNum === '2023-00114') {
        // Princess Mae Villanueva: Absent in 3 of 5, Late in 1
        if (sessionIdx === 1 || sessionIdx === 3 || sessionIdx === 4) {
          status = 'absent';
        } else if (sessionIdx === 2) {
          status = 'late';
        } else {
          status = 'present';
        }
      } else if (sIdx % 7 === (sessionIdx % 7)) {
        // Occasional late or absent for variance
        status = sessionIdx % 2 === 0 ? 'late' : 'present';
      } else if (sIdx === 8 && sessionIdx === 2) {
        // Jerome Flores: Manual Override test
        status = 'excused';
        method = 'manual_override';
      }

      const scanTime = status === 'absent' 
        ? `${dateStr} 10:00:00`
        : status === 'late' 
          ? `${dateStr} 08:48:12`
          : `${dateStr} 08:32:05`;

      const attId = uuidv4();
      insertAttendance.run(
        attId,
        sessId,
        s.id,
        scanTime,
        status,
        method,
        '192.168.1.100',
        'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X)'
      );

      if (method === 'manual_override') {
        insertAudit.run(
          uuidv4(),
          attId,
          sessId,
          s.id,
          inst1Id,
          'absent',
          'excused',
          'Medical certificate submitted for dental appointment',
          `${dateStr} 09:15:00`
        );
      }
    });
  });

  console.log('✅ Seed completed successfully with 1 Admin, 3 Instructors, 4 Sections, 25 Students, and 5 Historical Sessions with Pattern Data!');
}

// If run directly
if (process.argv[1] && process.argv[1].endsWith('seed.js')) {
  seedDatabase();
  process.exit(0);
}

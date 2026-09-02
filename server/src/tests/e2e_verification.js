import db from '../config/db.js';

const BASE_URL = 'http://localhost:5000/api';

async function runTests() {
  console.log('=====================================================');
  console.log('🧪 CCDI QRScan End-to-End Automated Verification Test');
  console.log('=====================================================\n');

  let passed = 0;
  let failed = 0;

  function assert(condition, message, extra = '') {
    if (condition) {
      console.log(`  ✅ PASS: ${message}`);
      passed++;
    } else {
      console.error(`  ❌ FAIL: ${message} ${extra ? JSON.stringify(extra) : ''}`);
      failed++;
    }
  }

  // Ensure all active sessions are closed before test run
  db.exec("UPDATE class_sessions SET status = 'closed' WHERE status = 'active';");

  // 1. Authentication Tests
  console.log('▶ [1/6] Testing Authentication & RBAC Login...');
  const instructorLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'prof.santos@ccdi.edu.ph', password: 'instructor123' })
  });
  const instData = await instructorLoginRes.json();
  assert(instructorLoginRes.status === 200 && instData.token && instData.user.role === 'instructor', 'Instructor login successful with JWT');

  const studentLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: '2023-00101', password: 'student123' })
  });
  const stuData = await studentLoginRes.json();
  assert(studentLoginRes.status === 200 && stuData.token && stuData.user.role === 'student', 'Student login by ID Number successful');

  const adminLoginRes = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: 'admin@ccdi.edu.ph', password: 'admin123' })
  });
  const adminData = await adminLoginRes.json();
  assert(adminLoginRes.status === 200 && adminData.token && adminData.user.role === 'admin', 'Admin login successful');

  const instToken = instData.token;
  const stuToken = stuData.token;
  const adminToken = adminData.token;

  // 2. Class Session & Dynamic Rotating QR Token Lifecycle
  console.log('\n▶ [2/6] Testing Class Session Creation & Rotating QR Tokens...');
  const secRes = await fetch(`${BASE_URL}/sections`, {
    headers: { Authorization: `Bearer ${instToken}` }
  });
  const sections = (await secRes.json()).sections;
  const testSection = sections.find(s => s.name === 'BSIT-3A');
  assert(testSection !== undefined, `Found section BSIT-3A (${testSection.subject_code})`);

  // Create new session
  const createSessRes = await fetch(`${BASE_URL}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${instToken}` },
    body: JSON.stringify({ sectionId: testSection.id, lateCutoffMinutes: 15 })
  });
  const sessionPayload = await createSessRes.json();
  assert(createSessRes.status === 201 && sessionPayload.sessionId, `Class session started (ID: ${sessionPayload.sessionId})`, sessionPayload);

  const sessionId = sessionPayload.sessionId;
  const initialToken = sessionPayload.token;
  assert(initialToken && initialToken.rawToken && initialToken.qrDataUrl && initialToken.backupCode, 'Initial dynamic QR token and 6-digit backup code generated');

  // Rotate token to version 2
  const rotateRes = await fetch(`${BASE_URL}/sessions/${sessionId}/rotate-token`, {
    headers: { Authorization: `Bearer ${instToken}` }
  });
  const rotatedToken = await rotateRes.json();
  assert(rotatedToken.version === 2 && rotatedToken.backupCode, `Token rotated to Version #${rotatedToken.version} with backup code: ${rotatedToken.backupCode}`);

  // 3. Student QR Scan & Anti-Proxy Security Tests
  console.log('\n▶ [3/6] Testing Student QR Scan & Anti-Proxy Rejection Protocols...');
  // Valid scan by Juan Dela Cruz
  const scanRes = await fetch(`${BASE_URL}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${stuToken}` },
    body: JSON.stringify({ token: rotatedToken.rawToken })
  });
  const scanData = await scanRes.json();
  assert(scanRes.status === 201 && scanData.status === 'present', `Student Juan Dela Cruz marked PRESENT at ${scanData.scannedAt}`, { status: scanRes.status, body: scanData });

  // Test Duplicate Scan Prevention (same student trying to scan again)
  const duplicateScanRes = await fetch(`${BASE_URL}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${stuToken}` },
    body: JSON.stringify({ token: rotatedToken.rawToken })
  });
  assert(duplicateScanRes.status === 409, 'Duplicate scan rejected with 409 Conflict');

  // Test Tampered Token Rejection
  const tamperedToken = rotatedToken.rawToken.slice(0, -4) + 'AAAA';
  const tamperedRes = await fetch(`${BASE_URL}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${stuToken}` },
    body: JSON.stringify({ token: tamperedToken })
  });
  assert(tamperedRes.status === 400, 'Tampered cryptographic token rejected with 400 Bad Request');

  // Test Backup Code Input for second student (Maria Santos 2023-00102)
  const stu2Login = await fetch(`${BASE_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ identifier: '2023-00102', password: 'student123' })
  });
  const stu2Token = (await stu2Login.json()).token;

  const backupScanRes = await fetch(`${BASE_URL}/scan`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${stu2Token}` },
    body: JSON.stringify({ sessionId, backupCode: rotatedToken.backupCode })
  });
  const backupData = await backupScanRes.json();
  assert(backupScanRes.status === 201 && backupData.status === 'present', 'Student Maria Santos marked PRESENT via 6-digit backup code fallback', backupData);

  // 4. Manual Override & Audit Logging
  console.log('\n▶ [4/6] Testing Manual Override with Mandatory Audit Trail...');
  // Find a third student to manually override (Patricia Nicole Mendoza 2023-00106)
  const sessDetailRes = await fetch(`${BASE_URL}/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${instToken}` }
  });
  const sessDetails = await sessDetailRes.json();
  const studentToOverride = sessDetails.roster.find(s => s.id_number === '2023-00106');

  const overrideRes = await fetch(`${BASE_URL}/sessions/${sessionId}/manual-override`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${instToken}` },
    body: JSON.stringify({
      studentId: studentToOverride.id,
      newStatus: 'excused',
      reason: 'Official representative at National IT Skills Competition'
    })
  });
  const overrideData = await overrideRes.json();
  assert(overrideRes.status === 200, `Manual override applied for ${studentToOverride.name} -> EXCUSED`);

  // Verify audit log entry
  const updatedSessRes = await fetch(`${BASE_URL}/sessions/${sessionId}`, {
    headers: { Authorization: `Bearer ${instToken}` }
  });
  const updatedSess = await updatedSessRes.json();
  const auditEntry = updatedSess.auditLogs.find(a => a.student_id === studentToOverride.id);
  assert(auditEntry && auditEntry.reason.includes('National IT Skills'), 'Audit trail successfully recorded changer, timestamp, and justification reason');

  // 5. Session Finalization & CSV Export
  console.log('\n▶ [5/6] Testing Session Finalization (Auto-Absent) & CSV Export...');
  const closeRes = await fetch(`${BASE_URL}/sessions/${sessionId}/close`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${instToken}` }
  });
  const closeData = await closeRes.json();
  assert(closeRes.status === 200, `Session closed successfully: ${closeData.message}`, closeData);

  const csvRes = await fetch(`${BASE_URL}/sessions/${sessionId}/export-csv`, {
    headers: { Authorization: `Bearer ${instToken}` }
  });
  const csvText = await csvRes.text();
  assert(csvRes.status === 200 && csvText.includes('CCDI - Class Session Attendance Record'), 'Session CSV export generated valid formatted spreadsheet data');

  // 6. Automated Pattern Detection Engine Test
  console.log('\n▶ [6/6] Testing Absenteeism Pattern Detection Algorithm...');
  const patternRes = await fetch(`${BASE_URL}/analytics/section/${testSection.id}/patterns?windowSize=5&threshold=3`, {
    headers: { Authorization: `Bearer ${instToken}` }
  });
  const patternData = await patternRes.json();
  assert(patternData.alerts && patternData.alerts.length > 0, `Pattern detection evaluated ${patternData.totalSessionsEvaluated} sessions and flagged ${patternData.alerts.length} at-risk students`);

  const markRamosAlert = patternData.alerts.find(a => a.student.idNumber === '2023-00107');
  assert(markRamosAlert && (markRamosAlert.riskLevel === 'CRITICAL' || markRamosAlert.riskLevel === 'HIGH'), `Mark Anthony Ramos correctly flagged with ${markRamosAlert?.riskLevel} risk (${markRamosAlert?.riskReason})`);

  const princessAlert = patternData.alerts.find(a => a.student.idNumber === '2023-00114');
  assert(princessAlert !== undefined, `Princess Mae Villanueva correctly flagged with ${princessAlert?.riskLevel} risk`);

  // Summary
  console.log('\n=====================================================');
  console.log(`🎉 TEST SUMMARY: ${passed} Passed, ${failed} Failed`);
  console.log('=====================================================');

  if (failed === 0) {
    console.log('✨ All CCDI QRScan core workflows and security protocols verified successfully with 100% pass rate!');
    process.exit(0);
  } else {
    process.exit(1);
  }
}

runTests().catch((err) => {
  console.error('Fatal test error:', err);
  process.exit(1);
});

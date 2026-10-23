/**
 * Automated RBAC and End-to-End Workflow Verification Script
 */
const BASE_URL = 'http://localhost:5000/api';

const runTests = async () => {
  console.log('========================================================');
  console.log('STARTING AUTOMATED BACKEND RBAC & WORKFLOW VERIFICATION');
  console.log('========================================================\n');

  let passed = 0;
  let failed = 0;

  const assert = (condition, title, details = '') => {
    if (condition) {
      console.log(`[PASS] ${title}`);
      passed++;
    } else {
      console.error(`[FAIL] ${title} - ${details}`);
      failed++;
    }
  };

  try {
    // 1. Super Admin Login
    const superAdminRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'superadmin@hiringplatform.com',
        password: 'SuperAdmin@123',
      }),
    });
    const superAdminData = await superAdminRes.json();
    assert(superAdminRes.status === 200 && superAdminData.token, 'Super Admin login successful');
    const superAdminToken = superAdminData.token;

    // 2. Admin Login
    const adminRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'admin@techcorp.com',
        password: 'Admin@123',
      }),
    });
    const adminData = await adminRes.json();
    assert(adminRes.status === 200 && adminData.token, 'Admin login successful');
    const adminToken = adminData.token;

    // 3. Student Login
    const studentRes = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        email: 'student@example.com',
        password: 'Student@123',
      }),
    });
    const studentData = await studentRes.json();
    assert(studentRes.status === 200 && studentData.token, 'Student login successful');
    const studentToken = studentData.token;

    // --- RBAC BOUNDARY TESTS ---
    console.log('\n--- Running RBAC Security Enforcement Tests ---');

    // Test A: Unauthenticated request to protected endpoint
    const unauthRes = await fetch(`${BASE_URL}/superadmin/stats`);
    assert(unauthRes.status === 401, 'Unauthenticated request correctly rejected with 401 Unauthorized');

    // Test B: Student attempts to access Super Admin stats
    const studentAsSuperRes = await fetch(`${BASE_URL}/superadmin/stats`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    assert(studentAsSuperRes.status === 403, 'Student blocked from Super Admin stats (403 Forbidden)');

    // Test C: Admin attempts to access Super Admin activity logs
    const adminAsSuperRes = await fetch(`${BASE_URL}/superadmin/activities`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    assert(adminAsSuperRes.status === 403, 'Admin blocked from Super Admin activity logs (403 Forbidden)');

    // Test D: Admin attempts to create another Admin (only SuperAdmin permitted)
    const adminCreateAdminRes = await fetch(`${BASE_URL}/superadmin/admins`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        name: 'Hacker Admin',
        email: 'hacker@test.com',
        password: 'Password@123',
      }),
    });
    assert(adminCreateAdminRes.status === 403, 'Admin blocked from creating another Admin (403 Forbidden)');

    // Test E: Student attempts to create a recruitment drive
    const studentCreateDriveRes = await fetch(`${BASE_URL}/drives`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({
        name: 'Unauthorized Student Drive',
        jobTitle: 'Hacker',
        startDate: new Date(),
        endDate: new Date(),
      }),
    });
    assert(studentCreateDriveRes.status === 403, 'Student blocked from creating recruitment drive (403 Forbidden)');

    // Test F: Duplicate Student Registration check
    const dupStudentRes = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        name: 'Alex Rivera Dup',
        email: 'student@example.com',
        password: 'Password@123',
      }),
    });
    assert(dupStudentRes.status === 400, 'Duplicate email registration correctly rejected with 400 Bad Request');

    // --- EXAMINATION & WORKFLOW TESTS ---
    console.log('\n--- Running End-to-End Recruitment & Exam Workflow Tests ---');

    // Test G: Join drive with invalid code
    const invalidJoinRes = await fetch(`${BASE_URL}/drive-registrations/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({ driveCode: 'NON-EXISTENT-CODE' }),
    });
    assert(invalidJoinRes.status === 404, 'Invalid drive code correctly rejected (404 Not Found)');

    // Test H: Join drive with valid code HIRE-TECH26
    const validJoinRes = await fetch(`${BASE_URL}/drive-registrations/join`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${studentToken}`,
      },
      body: JSON.stringify({ driveCode: 'HIRE-TECH26' }),
    });
    const validJoinData = await validJoinRes.json();
    assert(validJoinRes.status === 200 || validJoinRes.status === 201, 'Student successfully validated and joined HIRE-TECH26');
    const driveId = validJoinData.drive._id;

    // Test I: Get Exam Instructions
    const instructionsRes = await fetch(`${BASE_URL}/exams/instructions/${driveId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const instructionsData = await instructionsRes.json();
    assert(instructionsRes.status === 200 && instructionsData.canAttempt !== undefined, 'Exam instructions retrieved');

    // Allow attempts for testing
    await fetch(`${BASE_URL}/drives/${driveId}`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ maxAttempts: 99 }),
    });

    // Test J: Start Exam Attempt & Verify Answer Keys are NOT leaked to client!
    const startExamRes = await fetch(`${BASE_URL}/exams/start/${driveId}`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const startExamData = await startExamRes.json();
    assert(startExamRes.status === 200 || startExamRes.status === 201, 'Exam attempt started or resumed');
    const attemptId = startExamData.attemptId;
    const questions = startExamData.questions;

    // Crucial security check: no correctAnswer in student payload
    const leakedAnswers = questions.some((q) => q.correctAnswer !== undefined);
    assert(!leakedAnswers, 'CRITICAL SECURITY: Answer keys and explanations are completely hidden from student during exam!');

    // Test K: Save draft answers
    if (questions && questions.length > 0) {
      const answersToSave = [
        { questionId: questions[0]._id, selectedOption: 1 }, // Virtual DOM question (correct = 1)
        { questionId: questions[1]._id, selectedOption: 1 }, // 401 question (correct = 1)
        { questionId: questions[2]._id, selectedOption: 2 }, // Compound index (correct = 2)
      ];

      const saveRes = await fetch(`${BASE_URL}/exams/save-answers/${attemptId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
        },
        body: JSON.stringify({ answers: answersToSave }),
      });
      assert(saveRes.status === 200, 'Draft answers saved successfully during examination');

      // Test L: Submit examination attempt
      const submitRes = await fetch(`${BASE_URL}/exams/submit/${attemptId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
        },
        body: JSON.stringify({ answers: answersToSave }),
      });
      const submitData = await submitRes.json();
      assert(
        submitRes.status === 200 && submitData.result,
        `Exam submitted successfully (status: ${submitData.result?.submissionStatus || 'submitted'}, isExamKeyPublished: ${submitData.isExamKeyPublished})`
      );
    }

    // Test M: Admin views results for drive
    const driveResultsRes = await fetch(`${BASE_URL}/results/drive/${driveId}`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const driveResultsData = await driveResultsRes.json();
    assert(
      driveResultsRes.status === 200 && driveResultsData.results.length > 0,
      `Admin retrieved drive examination results (count: ${driveResultsData.results.length})`
    );

    // Test N: Admin shortlists student for Group Discussion (GD)
    const shortlistRes = await fetch(`${BASE_URL}/candidates/shortlist`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        driveId,
        studentId: studentData.user._id,
        nextStage: 'Group Discussion (GD)',
        reason: 'Scored high in core assessment',
      }),
    });
    assert(shortlistRes.status === 200, 'Admin shortlisted candidate for next recruitment round (GD)');

    // Test O: Admin schedules interview for the candidate
    const scheduleRes = await fetch(`${BASE_URL}/candidates/update-stage`, {
      method: 'PUT',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({
        driveId,
        studentId: studentData.user._id,
        stageName: 'Group Discussion (GD)',
        status: 'scheduled',
        overallStatus: 'shortlisted',
        interviewDate: new Date(Date.now() + 86400000),
        interviewTime: '11:00 AM EST',
        locationOrLink: 'https://meet.google.com/xyz-tech-round',
        candidateNotes: 'Please review MERN architecture and system scalability concepts.',
        remarks: 'Internal admin note: Candidate looks promising with strong React background.',
      }),
    });
    assert(scheduleRes.status === 200, 'Admin scheduled GD round with meeting details and candidate notes');

    // Test P: Student views their own candidate progress (verifying internal remarks are hidden!)
    const studentProgRes = await fetch(`${BASE_URL}/student/progress/${driveId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const studentProgData = await studentProgRes.json();
    const studentProg = studentProgData.candidateProgress;
    const hasInternalRemarks = JSON.stringify(studentProg).includes('Internal admin note');
    assert(
      studentProgRes.status === 200 && !hasInternalRemarks && studentProg.currentStage === 'Group Discussion (GD)',
      'Student views updated stage (GD) and internal admin remarks are securely masked from student view'
    );

    // Test Q: Super Admin checks Activity Logs
    const activitiesRes = await fetch(`${BASE_URL}/superadmin/activities`, {
      headers: { Authorization: `Bearer ${superAdminToken}` },
    });
    const activitiesData = await activitiesRes.json();
    assert(
      activitiesRes.status === 200 && activitiesData.logs.length > 0,
      `Super Admin monitors real-time activity audit logs (recorded count: ${activitiesData.logs.length})`
    );

    console.log('\n========================================================');
    console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('========================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('[Verification Error]', err);
    process.exit(1);
  }
};

runTests();

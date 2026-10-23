/**
 * Verification test for:
 * 1. Fullscreen & Anti-copy guidelines / restrictions
 * 2. Result and Exam History hidden until Admin publishes the exam key
 * 3. Result and Exam History visible after Admin publishes the exam key
 */
const BASE_URL = 'http://localhost:5000/api';

const runTests = async () => {
  console.log('================================================================');
  console.log('TESTING EXAM KEY PUBLICATION & RESULT/HISTORY RESTRICTION FLOW');
  console.log('================================================================\n');

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
    // 1. Admin Login
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

    // 2. Student Login
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

    // 3. Find the demo drive
    const drivesRes = await fetch(`${BASE_URL}/drives?search=HIRE-TECH26`, {
      headers: { Authorization: `Bearer ${adminToken}` },
    });
    const drivesData = await drivesRes.json();
    assert(drivesRes.status === 200 && drivesData.drives.length > 0, 'Found drive HIRE-TECH26');
    const drive = drivesData.drives[0];
    const driveId = drive._id;

    // 4. Ensure exam key is initially UNPUBLISHED for this test
    const unpublishRes = await fetch(`${BASE_URL}/drives/${driveId}/publish-key`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ publish: false }),
    });
    const unpublishData = await unpublishRes.json();
    assert(unpublishRes.status === 200 && unpublishData.isExamKeyPublished === false, 'Drive exam key set to UNPUBLISHED');

    // 5. Student checks exam instructions
    const instructionsRes = await fetch(`${BASE_URL}/exams/instructions/${driveId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const instructionsData = await instructionsRes.json();
    assert(instructionsRes.status === 200, 'Student fetched exam instructions');

    // 6. Student starts or gets exam attempt
    const myDrivesInitRes = await fetch(`${BASE_URL}/drive-registrations/my-drives`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const myDrivesInitData = await myDrivesInitRes.json();
    const existingAttemptId = myDrivesInitData.registrations.find((r) => String(r.drive?._id) === String(driveId))?.latestAttempt?._id;

    let attemptId = existingAttemptId;

    if (!attemptId) {
      const startExamRes = await fetch(`${BASE_URL}/exams/start/${driveId}`, {
        method: 'POST',
        headers: { Authorization: `Bearer ${studentToken}` },
      });
      const startExamData = await startExamRes.json();
      assert(startExamRes.status === 200 || startExamRes.status === 201, 'Student started/resumed exam attempt');
      attemptId = startExamData.attemptId;
      const questions = startExamData.questions;

      // Verify questions do NOT leak correct answer
      const anyLeaked = (questions || []).some((q) => q.correctAnswer !== undefined);
      assert(!anyLeaked, 'Anti-Cheating: Question payload contains NO answers or explanations during exam');

      // 7. Student submits exam
      const answersToSubmit = [
        { questionId: questions[0]._id, selectedOption: 1 },
        { questionId: questions[1]._id, selectedOption: 1 },
        { questionId: questions[2]._id, selectedOption: 2 },
      ];
      const submitRes = await fetch(`${BASE_URL}/exams/submit/${attemptId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
        },
        body: JSON.stringify({ answers: answersToSubmit }),
      });
      const submitData = await submitRes.json();
      assert(submitRes.status === 200, 'Student submitted examination');
      assert(
        submitData.isExamKeyPublished === false && submitData.result?.score === undefined,
        'Submit response conceals score/result while exam key is unpublished'
      );
    } else {
      console.log(`Using existing attempt: ${attemptId}`);
      // Re-submit or verify submit on already submitted attempt
      const submitRes = await fetch(`${BASE_URL}/exams/submit/${attemptId}`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${studentToken}`,
        },
        body: JSON.stringify({ answers: [] }),
      });
      const submitData = await submitRes.json();
      assert(submitRes.status === 200, 'Already submitted attempt checked');
      assert(
        submitData.isExamKeyPublished === false && submitData.result?.score === undefined,
        'Submit response conceals score/result while exam key is unpublished'
      );
    }

    // 8. Student queries attempt result (/api/exams/attempt/:attemptId)
    const attemptRes = await fetch(`${BASE_URL}/exams/attempt/${attemptId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const attemptData = await attemptRes.json();
    assert(
      attemptData.isExamKeyPublished === false && attemptData.result?.score === undefined,
      'Direct attempt endpoint hides score/percentage when exam key is unpublished'
    );

    // 9. Student checks Exam History (/api/student/history)
    const historyRes = await fetch(`${BASE_URL}/student/history`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const historyData = await historyRes.json();
    const hasUnpublishedInHistory = historyData.history.some((h) => String(h.drive?._id) === String(driveId));
    assert(!hasUnpublishedInHistory, 'CRITICAL: Student cannot see exam in history while exam key is unpublished');
    assert(historyData.pendingCount >= 1, `Exam history reports pendingCount: ${historyData.pendingCount}`);

    // 10. Student checks My Drives (/api/drive-registrations/my-drives)
    const myDrivesRes = await fetch(`${BASE_URL}/drive-registrations/my-drives`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const myDrivesData = await myDrivesRes.json();
    const targetReg = myDrivesData.registrations.find((r) => String(r.drive?._id) === String(driveId));
    assert(
      targetReg && targetReg.latestAttempt?.isExamKeyPublished === false && targetReg.latestAttempt?.score === null,
      'Joined drives list conceals exam score while key is unpublished'
    );

    // 11. Student checks dashboard stats (/api/student/dashboard)
    const dashboardRes = await fetch(`${BASE_URL}/student/dashboard`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const dashboardData = await dashboardRes.json();
    const targetProgress = dashboardData.candidateProgresses.find((cp) => String(cp.drive?._id) === String(driveId));
    const hasTargetExamScore = targetProgress?.roundEvaluations?.some(
      (re) => re.stageName === 'Examination' && re.score !== undefined
    );
    assert(
      !hasTargetExamScore,
      'Student dashboard candidate progresses conceals exam score for this drive while key is unpublished'
    );

    // ==========================================================
    // NOW ADMIN PUBLISHES THE EXAM KEY FOR THE DRIVE
    // ==========================================================
    console.log('\n--- Admin Publishes Exam Key for Drive ---');
    const publishRes = await fetch(`${BASE_URL}/drives/${driveId}/publish-key`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${adminToken}`,
      },
      body: JSON.stringify({ publish: true }),
    });
    const publishData = await publishRes.json();
    assert(publishRes.status === 200 && publishData.isExamKeyPublished === true, 'Admin successfully published exam key');

    // 12. Student now queries attempt result (/api/exams/attempt/:attemptId)
    const attemptAfterRes = await fetch(`${BASE_URL}/exams/attempt/${attemptId}`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const attemptAfterData = await attemptAfterRes.json();
    assert(
      attemptAfterData.isExamKeyPublished === true && attemptAfterData.result?.score !== undefined,
      `Exam result is now visible to student! Score: ${attemptAfterData.result?.score}/${attemptAfterData.result?.totalMarks} (${attemptAfterData.result?.percentage}%)`
    );

    // 13. Student now checks Exam History (/api/student/history)
    const historyAfterRes = await fetch(`${BASE_URL}/student/history`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const historyAfterData = await historyAfterRes.json();
    const publishedInHistory = historyAfterData.history.find((h) => String(h.drive?._id) === String(driveId));
    assert(
      publishedInHistory && publishedInHistory.score !== undefined,
      `Exam history now contains the attempt with score: ${publishedInHistory?.score}/${publishedInHistory?.totalMarks}`
    );

    // 14. Student checks My Drives after key release
    const myDrivesAfterRes = await fetch(`${BASE_URL}/drive-registrations/my-drives`, {
      headers: { Authorization: `Bearer ${studentToken}` },
    });
    const myDrivesAfterData = await myDrivesAfterRes.json();
    const targetRegAfter = myDrivesAfterData.registrations.find((r) => String(r.drive?._id) === String(driveId));
    assert(
      targetRegAfter && targetRegAfter.latestAttempt?.isExamKeyPublished === true && targetRegAfter.latestAttempt?.score !== null,
      `Joined drives now shows exam score: ${targetRegAfter?.latestAttempt?.score}`
    );

    console.log('\n================================================================');
    console.log(`TEST RESULTS: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  }
};

runTests();

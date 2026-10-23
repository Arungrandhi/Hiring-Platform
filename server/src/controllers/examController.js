const mongoose = require('mongoose');
const RecruitmentDrive = require('../models/RecruitmentDrive');
const DriveRegistration = require('../models/DriveRegistration');
const QuestionPaper = require('../models/QuestionPaper');
const ExamAttempt = require('../models/ExamAttempt');
const CandidateProgress = require('../models/CandidateProgress');
const { logActivity } = require('../services/activityLogger');

/**
 * Sanitize questions for student client - removes correct answers and explanations!
 */
const sanitizeQuestionsForStudent = (questions) => {
  return (questions || []).map((q) => ({
    _id: q._id,
    questionText: q.questionText,
    options: q.options,
    marks: q.marks,
    negativeMarks: q.negativeMarks,
    order: q.order,
    paperId: q.paperId,
    paperTitle: q.paperTitle,
    subjectName: q.subjectName,
    subjectCode: q.subjectCode,
  }));
};

/**
 * Build snapshot from all selected question papers for a drive
 */
const buildMultiPaperSnapshot = (drive) => {
  const allQuestions = [];
  let totalMarks = 0;
  let globalOrder = 1;

  const papersSummary = (drive.selectedPapers || []).map((paper) => {
    const pMarks = (paper.questions || []).reduce((sum, q) => sum + (Number(q.marks) || 1), 0);
    return {
      _id: paper._id,
      title: paper.title,
      subjectName: paper.subject?.name || 'General',
      subjectCode: paper.subject?.code || '',
      questionCount: paper.questions ? paper.questions.length : 0,
      totalMarks: paper.totalMarks || pMarks,
    };
  });

  (drive.selectedPapers || []).forEach((paper) => {
    if (paper.questions && paper.questions.length > 0) {
      paper.questions.forEach((q) => {
        const qMarks = Number(q.marks) || 1;
        totalMarks += qMarks;
        const negMarks =
          Number(q.negativeMarks) !== undefined && Number(q.negativeMarks) > 0
            ? Number(q.negativeMarks)
            : (paper.negativeMarking?.enabled ? (paper.negativeMarking.perQuestionPenalty || 0) : 0);

        allQuestions.push({
          _id: q._id,
          questionText: q.questionText,
          options: q.options,
          correctAnswer: q.correctAnswer,
          marks: qMarks,
          negativeMarks: negMarks,
          order: globalOrder++,
          paperId: paper._id,
          paperTitle: paper.title,
          subjectName: paper.subject?.name || 'General',
          subjectCode: paper.subject?.code || '',
          explanation: q.explanation || '',
        });
      });
    }
  });

  const passingPercentage = drive.passingCriteria?.minPercentage || 50;
  const passingMarks = drive.passingCriteria?.minMarks || Math.ceil((totalMarks * passingPercentage) / 100);

  const title =
    drive.selectedPapers && drive.selectedPapers.length > 1
      ? drive.name || drive.selectedPapers.map((p) => p.title).join(' & ')
      : drive.selectedPapers?.[0]?.title || drive.name || 'Examination';

  return {
    title,
    duration: drive.totalDuration || 30,
    totalMarks,
    passingMarks,
    negativeMarking: {
      enabled: (drive.selectedPapers || []).some((p) => p.negativeMarking?.enabled),
      perQuestionPenalty: drive.selectedPapers?.[0]?.negativeMarking?.perQuestionPenalty || 0,
    },
    papers: papersSummary,
    questions: allQuestions,
  };
};

/**
 * Calculate scores based on attempt answers and paper snapshot
 */
const calculateAttemptScore = (paperSnapshot, answers = []) => {
  const answerMap = {};
  answers.forEach((ans) => {
    if (ans.questionId) {
      answerMap[String(ans.questionId)] = ans.selectedOption;
    }
  });

  let totalMarks = 0;
  let earnedScore = 0;
  let correctCount = 0;
  let wrongCount = 0;
  let unansweredCount = 0;

  const negativeEnabled = paperSnapshot?.negativeMarking?.enabled;
  const globalPenalty = paperSnapshot?.negativeMarking?.perQuestionPenalty || 0;

  paperSnapshot.questions.forEach((q) => {
    const qMarks = Number(q.marks) || 1;
    totalMarks += qMarks;

    const studentChoice = answerMap[String(q._id)];

    if (studentChoice === undefined || studentChoice === null || studentChoice === -1) {
      unansweredCount++;
    } else if (Number(studentChoice) === Number(q.correctAnswer)) {
      earnedScore += qMarks;
      correctCount++;
    } else {
      wrongCount++;
      if (negativeEnabled || (Number(q.negativeMarks) > 0)) {
        const penalty =
          Number(q.negativeMarks) !== undefined && Number(q.negativeMarks) > 0
            ? Number(q.negativeMarks)
            : globalPenalty;
        earnedScore -= penalty;
      }
    }
  });

  // Ensure score is not negative
  earnedScore = Math.max(0, Math.round(earnedScore * 100) / 100);
  const percentage = totalMarks > 0 ? Math.round((earnedScore / totalMarks) * 10000) / 100 : 0;
  const passingMarks = paperSnapshot.passingMarks || (totalMarks * 0.4);
  const isPassed = earnedScore >= passingMarks;

  return {
    score: earnedScore,
    totalMarks,
    percentage,
    isPassed,
    correctCount,
    wrongCount,
    unansweredCount,
  };
};

/**
 * Get exam instructions and verify student eligibility
 * GET /api/exams/instructions/:driveId
 */
const getExamInstructions = async (req, res, next) => {
  try {
    const { driveId } = req.params;

    const drive = await RecruitmentDrive.findById(driveId)
      .populate({
        path: 'selectedPapers',
        select: 'title subject duration totalMarks passingMarks difficulty instructions negativeMarking questions',
        populate: { path: 'subject', select: 'name code' },
      })
      .populate('createdBy', 'name');

    if (!drive) {
      return res.status(404).json({
        success: false,
        message: 'Recruitment drive not found',
      });
    }

    // Verify registration
    const registration = await DriveRegistration.findOne({
      student: req.user._id,
      drive: driveId,
      registrationStatus: 'registered',
    });

    if (!registration) {
      return res.status(403).json({
        success: false,
        message: 'You must register for this recruitment drive before attempting the exam.',
      });
    }

    if (drive.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: `This recruitment drive is currently ${drive.status}. Examinations cannot be initiated.`,
      });
    }

    // Check count of existing attempts
    const attemptCount = await ExamAttempt.countDocuments({
      student: req.user._id,
      drive: driveId,
    });

    const activeAttempt = await ExamAttempt.findOne({
      student: req.user._id,
      drive: driveId,
      submissionStatus: 'in-progress',
    });

    const canAttempt = Boolean(activeAttempt) || attemptCount < drive.maxAttempts;

    // Aggregate statistics across all selected examination papers
    let totalQuestions = 0;
    let totalMarks = 0;
    (drive.selectedPapers || []).forEach((p) => {
      totalQuestions += p.questions ? p.questions.length : 0;
      const paperMarks = (p.questions || []).reduce((sum, q) => sum + (Number(q.marks) || 1), 0);
      totalMarks += (p.totalMarks || paperMarks);
    });
    const passingPercentage = drive.passingCriteria?.minPercentage || 50;
    const passingMarks = drive.passingCriteria?.minMarks || Math.ceil((totalMarks * passingPercentage) / 100);

    res.status(200).json({
      success: true,
      drive: {
        _id: drive._id,
        name: drive.name,
        jobTitle: drive.jobTitle,
        jobDescription: drive.jobDescription,
        totalDuration: drive.totalDuration,
        passingCriteria: drive.passingCriteria,
        maxAttempts: drive.maxAttempts,
        startDate: drive.startDate,
        endDate: drive.endDate,
        selectedPapers: drive.selectedPapers,
        totalQuestions,
        totalMarks,
        passingMarks,
      },
      attemptCount,
      hasActiveAttempt: Boolean(activeAttempt),
      activeAttemptId: activeAttempt ? activeAttempt._id : null,
      canAttempt,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Start or resume examination attempt
 * POST /api/exams/start/:driveId
 */
const startExam = async (req, res, next) => {
  try {
    const { driveId } = req.params;

    const drive = await RecruitmentDrive.findById(driveId).populate({
      path: 'selectedPapers',
      populate: { path: 'subject', select: 'name code' },
    });
    if (!drive) {
      return res.status(404).json({
        success: false,
        message: 'Recruitment drive not found',
      });
    }

    if (drive.status !== 'active') {
      return res.status(400).json({
        success: false,
        message: `Drive is currently ${drive.status}. Cannot start exam.`,
      });
    }

    // Verify registration
    const registration = await DriveRegistration.findOne({
      student: req.user._id,
      drive: driveId,
      registrationStatus: 'registered',
    });

    if (!registration) {
      return res.status(403).json({
        success: false,
        message: 'You have not registered for this recruitment drive.',
      });
    }

    // Check if an in-progress attempt already exists
    let existingAttempt = await ExamAttempt.findOne({
      student: req.user._id,
      drive: driveId,
      submissionStatus: 'in-progress',
    });

    const now = new Date();

    if (existingAttempt) {
      // Check if deadline has passed
      if (now > new Date(existingAttempt.deadline)) {
        // Auto-submit expired attempt
        const result = calculateAttemptScore(existingAttempt.paperSnapshot, existingAttempt.answers);
        existingAttempt.score = result.score;
        existingAttempt.totalMarks = result.totalMarks;
        existingAttempt.percentage = result.percentage;
        existingAttempt.isPassed = result.isPassed;
        existingAttempt.submissionStatus = 'auto-submitted';
        existingAttempt.submittedAt = existingAttempt.deadline;
        await existingAttempt.save();

        // Continue to check if student can start a new attempt
      } else {
        // If attempt was created before multi-paper support was added, sync questions from all papers
        const totalDriveQuestions = (drive.selectedPapers || []).reduce(
          (sum, p) => sum + (p.questions?.length || 0),
          0
        );
        if (
          totalDriveQuestions > 0 &&
          (!existingAttempt.paperSnapshot?.questions ||
            existingAttempt.paperSnapshot.questions.length < totalDriveQuestions)
        ) {
          const freshSnapshot = buildMultiPaperSnapshot(drive);
          existingAttempt.paperSnapshot = freshSnapshot;
          existingAttempt.questionPapers = drive.selectedPapers.map((p) => p._id);
          await existingAttempt.save();
        }

        // Resume existing active attempt!
        return res.status(200).json({
          success: true,
          resumed: true,
          message: 'Resuming ongoing examination attempt',
          attemptId: existingAttempt._id,
          startTime: existingAttempt.startTime,
          deadline: existingAttempt.deadline,
          remainingSeconds: Math.max(0, Math.floor((new Date(existingAttempt.deadline) - now) / 1000)),
          questions: sanitizeQuestionsForStudent(existingAttempt.paperSnapshot.questions),
          paperTitle: existingAttempt.paperSnapshot.title,
          totalMarks: existingAttempt.paperSnapshot.totalMarks,
          papers: existingAttempt.paperSnapshot.papers || [],
          savedAnswers: existingAttempt.answers,
        });
      }
    }

    // Check attempt limit
    const totalCompletedAttempts = await ExamAttempt.countDocuments({
      student: req.user._id,
      drive: driveId,
    });

    if (totalCompletedAttempts >= drive.maxAttempts) {
      return res.status(400).json({
        success: false,
        message: `You have reached the maximum allowed attempts (${drive.maxAttempts}) for this recruitment drive.`,
      });
    }

    if (!drive.selectedPapers || drive.selectedPapers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'No question paper has been assigned to this drive yet.',
      });
    }

    // Build comprehensive snapshot of ALL selected papers
    const paperSnapshot = buildMultiPaperSnapshot(drive);

    const examDurationMinutes = paperSnapshot.duration || drive.totalDuration || 30;
    const startTime = new Date();
    const deadline = new Date(startTime.getTime() + examDurationMinutes * 60 * 1000);

    const newAttempt = await ExamAttempt.create({
      student: req.user._id,
      drive: driveId,
      questionPaper: drive.selectedPapers[0]?._id || null,
      questionPapers: drive.selectedPapers.map((p) => p._id),
      paperSnapshot,
      attemptNumber: totalCompletedAttempts + 1,
      startTime,
      deadline,
      answers: [],
      submissionStatus: 'in-progress',
    });

    await logActivity({
      actor: req.user,
      action: 'EXAM_STARTED',
      resourceType: 'ExamAttempt',
      resourceId: newAttempt._id,
      metadata: { driveName: drive.name, attemptNumber: newAttempt.attemptNumber },
      req,
    });

    res.status(201).json({
      success: true,
      resumed: false,
      message: 'Examination started successfully',
      attemptId: newAttempt._id,
      startTime: newAttempt.startTime,
      deadline: newAttempt.deadline,
      remainingSeconds: Math.floor((deadline - startTime) / 1000),
      questions: sanitizeQuestionsForStudent(paperSnapshot.questions),
      paperTitle: paperSnapshot.title,
      totalMarks: paperSnapshot.totalMarks,
      papers: paperSnapshot.papers || [],
      savedAnswers: [],
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get active exam attempt details (resuming state)
 * GET /api/exams/attempt/:attemptId
 */
const getActiveAttempt = async (req, res, next) => {
  try {
    const { attemptId } = req.params;

    const attempt = await ExamAttempt.findById(attemptId).populate({
      path: 'drive',
      populate: {
        path: 'selectedPapers',
        populate: { path: 'subject', select: 'name code' },
      },
    });
    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Exam attempt not found',
      });
    }

    if (String(attempt.student) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: attempt belongs to another student',
      });
    }

    const now = new Date();

    const isExamKeyPublished = Boolean(attempt.drive?.isExamKeyPublished);

    // Check if deadline passed
    if (attempt.submissionStatus === 'in-progress' && now > new Date(attempt.deadline)) {
      // Auto submit
      const result = calculateAttemptScore(attempt.paperSnapshot, attempt.answers);
      attempt.score = result.score;
      attempt.totalMarks = result.totalMarks;
      attempt.percentage = result.percentage;
      attempt.isPassed = result.isPassed;
      attempt.submissionStatus = 'auto-submitted';
      attempt.submittedAt = attempt.deadline;
      await attempt.save();

      return res.status(200).json({
        success: true,
        isExpired: true,
        submissionStatus: attempt.submissionStatus,
        isExamKeyPublished,
        message: isExamKeyPublished
          ? 'Exam time has expired and your answers have been automatically submitted.'
          : 'Exam time has expired and your answers have been automatically submitted. Results will be released once the administrator publishes the exam key.',
        result: isExamKeyPublished
          ? {
              score: attempt.score,
              totalMarks: attempt.totalMarks,
              percentage: attempt.percentage,
              isPassed: attempt.isPassed,
              submittedAt: attempt.submittedAt,
              isExamKeyPublished: true,
            }
          : {
              submissionStatus: attempt.submissionStatus,
              submittedAt: attempt.submittedAt,
              isExamKeyPublished: false,
              driveName: attempt.drive?.name,
            },
      });
    }

    // If attempt is already submitted or auto-submitted, return result state
    if (attempt.submissionStatus === 'submitted' || attempt.submissionStatus === 'auto-submitted') {
      let reviewQuestions = [];
      if (isExamKeyPublished) {
        const studentAnswersMap = {};
        (attempt.answers || []).forEach((a) => {
          if (a.questionId) {
            studentAnswersMap[String(a.questionId)] = a.selectedOption;
          }
        });

        reviewQuestions = (attempt.paperSnapshot?.questions || []).map((q) => {
          const studentChoice = studentAnswersMap[String(q._id)];
          const isAnswered = studentChoice !== undefined && studentChoice !== null && studentChoice !== -1;
          const isCorrect = isAnswered && Number(studentChoice) === Number(q.correctAnswer);

          return {
            _id: q._id,
            questionText: q.questionText,
            options: q.options,
            correctAnswer: q.correctAnswer,
            studentChoice: isAnswered ? Number(studentChoice) : null,
            isAnswered,
            isCorrect,
            marks: q.marks,
            negativeMarks: q.negativeMarks,
            explanation: q.explanation || '',
            order: q.order,
            subjectName: q.subjectName,
            paperTitle: q.paperTitle,
          };
        });
      }

      return res.status(200).json({
        success: true,
        attemptId: attempt._id,
        submissionStatus: attempt.submissionStatus,
        submittedAt: attempt.submittedAt,
        isExamKeyPublished,
        driveName: attempt.drive?.name,
        message: isExamKeyPublished
          ? 'Exam results retrieved.'
          : 'Examination submitted. The administrator has not published the exam key and results for this recruitment drive yet.',
        result: isExamKeyPublished
          ? {
              score: attempt.score,
              totalMarks: attempt.totalMarks,
              percentage: attempt.percentage,
              isPassed: attempt.isPassed,
              submissionStatus: attempt.submissionStatus,
              submittedAt: attempt.submittedAt,
              isExamKeyPublished: true,
              driveName: attempt.drive?.name,
              questions: reviewQuestions,
            }
          : {
              attemptId: attempt._id,
              submissionStatus: attempt.submissionStatus,
              submittedAt: attempt.submittedAt,
              isExamKeyPublished: false,
              driveName: attempt.drive?.name,
            },
      });
    }

    // If attempt is in-progress and was created before multi-paper support was added, sync questions
    if (attempt.submissionStatus === 'in-progress' && attempt.drive?.selectedPapers) {
      const totalDriveQuestions = attempt.drive.selectedPapers.reduce(
        (sum, p) => sum + (p.questions?.length || 0),
        0
      );
      if (
        totalDriveQuestions > 0 &&
        (!attempt.paperSnapshot?.questions || attempt.paperSnapshot.questions.length < totalDriveQuestions)
      ) {
        attempt.paperSnapshot = buildMultiPaperSnapshot(attempt.drive);
        attempt.questionPapers = attempt.drive.selectedPapers.map((p) => p._id);
        await attempt.save();
      }
    }

    res.status(200).json({
      success: true,
      attemptId: attempt._id,
      submissionStatus: attempt.submissionStatus,
      startTime: attempt.startTime,
      deadline: attempt.deadline,
      remainingSeconds: Math.max(0, Math.floor((new Date(attempt.deadline) - now) / 1000)),
      questions: sanitizeQuestionsForStudent(attempt.paperSnapshot.questions),
      paperTitle: attempt.paperSnapshot.title,
      totalMarks: attempt.paperSnapshot.totalMarks,
      papers: attempt.paperSnapshot.papers || [],
      savedAnswers: attempt.answers,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Save draft answers periodically during exam
 * POST /api/exams/save-answers/:attemptId
 */
const saveAnswers = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const { answers } = req.body;

    const attempt = await ExamAttempt.findById(attemptId);
    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Exam attempt not found',
      });
    }

    if (String(attempt.student) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    if (attempt.submissionStatus !== 'in-progress') {
      return res.status(400).json({
        success: false,
        message: `Attempt is already ${attempt.submissionStatus}. Cannot update answers.`,
      });
    }

    // Grace period of 15 seconds after deadline for in-flight requests
    const now = new Date();
    if (now > new Date(attempt.deadline.getTime() + 15000)) {
      return res.status(400).json({
        success: false,
        message: 'Exam deadline has expired.',
      });
    }

    if (Array.isArray(answers)) {
      attempt.answers = answers.map((a) => ({
        questionId: a.questionId,
        selectedOption: a.selectedOption,
        answeredAt: new Date(),
      }));
      await attempt.save();
    }

    res.status(200).json({
      success: true,
      message: 'Answers saved',
      savedCount: attempt.answers.length,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Submit examination attempt and calculate scores
 * POST /api/exams/submit/:attemptId
 */
const submitExam = async (req, res, next) => {
  try {
    const { attemptId } = req.params;
    const { answers } = req.body;

    const attempt = await ExamAttempt.findById(attemptId).populate('drive', 'name passingCriteria isExamKeyPublished');
    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Exam attempt not found',
      });
    }

    if (String(attempt.student) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied',
      });
    }

    const isExamKeyPublished = Boolean(attempt.drive?.isExamKeyPublished);

    // If already submitted, return existing result safely
    if (attempt.submissionStatus === 'submitted' || attempt.submissionStatus === 'auto-submitted') {
      return res.status(200).json({
        success: true,
        alreadySubmitted: true,
        isExamKeyPublished,
        message: isExamKeyPublished
          ? 'Exam was already submitted'
          : 'Exam was already submitted. Results will be released once the administrator publishes the exam key.',
        result: isExamKeyPublished
          ? {
              score: attempt.score,
              totalMarks: attempt.totalMarks,
              percentage: attempt.percentage,
              isPassed: attempt.isPassed,
              submittedAt: attempt.submittedAt,
              isExamKeyPublished: true,
            }
          : {
              submissionStatus: attempt.submissionStatus,
              submittedAt: attempt.submittedAt,
              isExamKeyPublished: false,
              driveName: attempt.drive?.name,
            },
      });
    }

    // Update with final answers if provided
    if (Array.isArray(answers)) {
      attempt.answers = answers.map((a) => ({
        questionId: a.questionId,
        selectedOption: a.selectedOption,
        answeredAt: new Date(),
      }));
    }

    const now = new Date();
    const isAutoSubmitted = now > new Date(attempt.deadline.getTime() + 10000);

    // Calculate score strictly on server using paper snapshot
    const scoreResult = calculateAttemptScore(attempt.paperSnapshot, attempt.answers);

    attempt.score = scoreResult.score;
    attempt.totalMarks = scoreResult.totalMarks;
    attempt.percentage = scoreResult.percentage;
    attempt.isPassed = scoreResult.isPassed;
    attempt.submissionStatus = isAutoSubmitted ? 'auto-submitted' : 'submitted';
    attempt.submittedAt = now;

    await attempt.save();

    // Update candidate progress recruitment pipeline
    await CandidateProgress.findOneAndUpdate(
      { student: req.user._id, drive: attempt.drive._id },
      {
        $set: {
          'roundEvaluations.0.score': scoreResult.score,
          'roundEvaluations.0.status': scoreResult.isPassed ? 'cleared' : 'pending',
          'roundEvaluations.0.evaluatedAt': now,
        },
        $push: {
          stageHistory: {
            fromStage: 'Examination',
            toStage: 'Examination',
            status: scoreResult.isPassed ? 'passed' : 'evaluated',
            changedBy: req.user._id,
            changedAt: now,
            reason: `Exam completed. Score: ${scoreResult.score}/${scoreResult.totalMarks} (${scoreResult.percentage}%)`,
          },
        },
      }
    );

    await logActivity({
      actor: req.user,
      action: 'EXAM_SUBMITTED',
      resourceType: 'ExamAttempt',
      resourceId: attempt._id,
      metadata: {
        score: scoreResult.score,
        totalMarks: scoreResult.totalMarks,
        isPassed: scoreResult.isPassed,
        submissionStatus: attempt.submissionStatus,
      },
      req,
    });

    res.status(200).json({
      success: true,
      isExamKeyPublished,
      message: isExamKeyPublished
        ? 'Examination submitted successfully'
        : 'Examination submitted successfully. Results will be released once the administrator publishes the exam key for this drive.',
      result: isExamKeyPublished
        ? {
            score: scoreResult.score,
            totalMarks: scoreResult.totalMarks,
            percentage: scoreResult.percentage,
            isPassed: scoreResult.isPassed,
            submittedAt: attempt.submittedAt,
            correctCount: scoreResult.correctCount,
            wrongCount: scoreResult.wrongCount,
            unansweredCount: scoreResult.unansweredCount,
            isExamKeyPublished: true,
          }
        : {
            submissionStatus: attempt.submissionStatus,
            submittedAt: attempt.submittedAt,
            isExamKeyPublished: false,
            driveName: attempt.drive?.name,
          },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get question-by-question review and answer key for an attempt
 * GET /api/exams/review/:attemptId
 * STRICTLY restricted: student must own attempt AND drive.isExamKeyPublished must be true!
 */
const getExamReview = async (req, res, next) => {
  try {
    const { attemptId } = req.params;

    const attempt = await ExamAttempt.findById(attemptId).populate({
      path: 'drive',
      select: 'name jobTitle isExamKeyPublished passingCriteria',
    });

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Exam attempt not found',
      });
    }

    if (String(attempt.student) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: attempt belongs to another student',
      });
    }

    if (attempt.submissionStatus === 'in-progress') {
      return res.status(400).json({
        success: false,
        message: 'Examination is still in-progress. Review is only available after submission.',
      });
    }

    if (!attempt.drive?.isExamKeyPublished) {
      return res.status(403).json({
        success: false,
        isExamKeyPublished: false,
        message: 'The administrator has not published the exam key for this recruitment drive yet. Question reviews and answers remain locked.',
      });
    }

    const studentAnswersMap = {};
    (attempt.answers || []).forEach((a) => {
      if (a.questionId) {
        studentAnswersMap[String(a.questionId)] = a.selectedOption;
      }
    });

    const reviewQuestions = (attempt.paperSnapshot?.questions || []).map((q) => {
      const studentChoice = studentAnswersMap[String(q._id)];
      const isAnswered = studentChoice !== undefined && studentChoice !== null && studentChoice !== -1;
      const isCorrect = isAnswered && Number(studentChoice) === Number(q.correctAnswer);

      return {
        _id: q._id,
        questionText: q.questionText,
        options: q.options,
        correctAnswer: q.correctAnswer,
        studentChoice: isAnswered ? Number(studentChoice) : null,
        isAnswered,
        isCorrect,
        marks: q.marks,
        negativeMarks: q.negativeMarks,
        explanation: q.explanation || '',
        order: q.order,
        subjectName: q.subjectName,
        paperTitle: q.paperTitle,
      };
    });

    res.status(200).json({
      success: true,
      isExamKeyPublished: true,
      drive: attempt.drive,
      attempt: {
        _id: attempt._id,
        score: attempt.score,
        totalMarks: attempt.totalMarks,
        percentage: attempt.percentage,
        isPassed: attempt.isPassed,
        submissionStatus: attempt.submissionStatus,
        submittedAt: attempt.submittedAt,
      },
      questions: reviewQuestions,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getExamInstructions,
  startExam,
  getActiveAttempt,
  saveAnswers,
  submitExam,
  getExamReview,
};

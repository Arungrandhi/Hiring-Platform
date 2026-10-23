const DriveRegistration = require('../models/DriveRegistration');
const ExamAttempt = require('../models/ExamAttempt');
const CandidateProgress = require('../models/CandidateProgress');
const RecruitmentDrive = require('../models/RecruitmentDrive');

/**
 * Get authenticated student dashboard summary
 * GET /api/student/dashboard
 */
const getStudentDashboard = async (req, res, next) => {
  try {
    const studentId = req.user._id;

    const [registrations, attempts, candidateProgresses] = await Promise.all([
      DriveRegistration.find({ student: studentId, registrationStatus: 'registered' })
        .populate({
          path: 'drive',
          select: 'name jobTitle status driveCode startDate endDate totalDuration isExamKeyPublished',
        })
        .lean(),
      ExamAttempt.find({ student: studentId })
        .populate('drive', 'name jobTitle isExamKeyPublished')
        .sort({ createdAt: -1 })
        .lean(),
      CandidateProgress.find({ student: studentId })
        .populate('drive', 'name jobTitle stages isExamKeyPublished')
        .lean(),
    ]);

    const totalJoinedDrives = registrations.length;
    // Only published attempts are counted towards completed exam results on dashboard
    const completedAttempts = attempts.filter(
      (a) =>
        (a.submissionStatus === 'submitted' || a.submissionStatus === 'auto-submitted') &&
        Boolean(a.drive?.isExamKeyPublished)
    );
    const qualifiedAttempts = completedAttempts.filter((a) => a.isPassed);

    // Filter active/in-progress attempt if any
    const activeAttempt = attempts.find((a) => a.submissionStatus === 'in-progress');

    // Sanitized candidate progresses (strip internal admin remarks & hide unreleased exam scores)
    const sanitizedProgresses = candidateProgresses.map((cp) => {
      const isKeyPublished = Boolean(cp.drive?.isExamKeyPublished);
      return {
        _id: cp._id,
        drive: cp.drive,
        currentStage: cp.currentStage,
        overallStatus: cp.overallStatus,
        roundEvaluations: (cp.roundEvaluations || []).map((re) => {
          const evalObj = {
            stageName: re.stageName,
            status: re.status,
            interviewDate: re.interviewDate,
            interviewTime: re.interviewTime,
            locationOrLink: re.locationOrLink,
            candidateNotes: re.candidateNotes,
          };
          if (re.stageName !== 'Examination' || isKeyPublished) {
            evalObj.score = re.score;
          }
          return evalObj;
        }),
        updatedAt: cp.updatedAt,
      };
    });

    res.status(200).json({
      success: true,
      stats: {
        totalJoinedDrives,
        totalExamsTaken: completedAttempts.length,
        qualifiedExams: qualifiedAttempts.length,
      },
      activeAttempt: activeAttempt || null,
      recentAttempts: completedAttempts.slice(0, 5),
      joinedDrives: registrations,
      candidateProgresses: sanitizedProgresses,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get full exam history for authenticated student
 * GET /api/student/history
 */
const getStudentExamHistory = async (req, res, next) => {
  try {
    const studentId = req.user._id;

    const attempts = await ExamAttempt.find({ student: studentId })
      .populate('drive', 'name jobTitle status driveCode passingCriteria isExamKeyPublished')
      .sort({ createdAt: -1 })
      .lean();

    // Student cannot see exam history and results until the admin has published the exam key
    const publishedAttempts = attempts.filter((a) => Boolean(a.drive?.isExamKeyPublished));
    const pendingCount = attempts.filter(
      (a) =>
        !a.drive?.isExamKeyPublished &&
        (a.submissionStatus === 'submitted' || a.submissionStatus === 'auto-submitted')
    ).length;

    const driveIds = publishedAttempts.map((a) => a.drive?._id).filter(Boolean);
    const progresses = await CandidateProgress.find({
      student: studentId,
      drive: { $in: driveIds },
    }).lean();

    const progressMap = {};
    progresses.forEach((p) => {
      progressMap[String(p.drive)] = {
        currentStage: p.currentStage,
        overallStatus: p.overallStatus,
      };
    });

    const history = publishedAttempts.map((a) => ({
      _id: a._id,
      drive: a.drive,
      paperTitle: a.paperSnapshot?.title || 'Examination',
      attemptNumber: a.attemptNumber,
      startTime: a.startTime,
      submittedAt: a.submittedAt,
      deadline: a.deadline,
      score: a.score,
      totalMarks: a.totalMarks,
      percentage: a.percentage,
      isPassed: a.isPassed,
      submissionStatus: a.submissionStatus,
      recruitmentStage: progressMap[String(a.drive?._id)]?.currentStage || 'Examination',
      overallStatus: progressMap[String(a.drive?._id)]?.overallStatus || 'pending',
      isExamKeyPublished: true,
    }));

    res.status(200).json({
      success: true,
      history,
      pendingCount,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get candidate recruitment progress for a specific drive (Student view, safe)
 * GET /api/student/progress/:driveId
 */
const getStudentCandidateProgress = async (req, res, next) => {
  try {
    const { driveId } = req.params;
    const studentId = req.user._id;

    const progress = await CandidateProgress.findOne({ drive: driveId, student: studentId })
      .populate('drive', 'name jobTitle stages isExamKeyPublished')
      .lean();

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'No recruitment progress record found for this drive',
      });
    }

    const isKeyPublished = Boolean(progress.drive?.isExamKeyPublished);

    // Sanitize to hide internal admin remarks and conceal exam score if unpublished
    const safeEvaluations = (progress.roundEvaluations || []).map((re) => {
      const evalObj = {
        stageName: re.stageName,
        status: re.status,
        interviewDate: re.interviewDate,
        interviewTime: re.interviewTime,
        locationOrLink: re.locationOrLink,
        candidateNotes: re.candidateNotes,
      };
      if (re.stageName !== 'Examination' || isKeyPublished) {
        evalObj.score = re.score;
      }
      return evalObj;
    });

    res.status(200).json({
      success: true,
      candidateProgress: {
        _id: progress._id,
        drive: progress.drive,
        currentStage: progress.currentStage,
        overallStatus: progress.overallStatus,
        roundEvaluations: safeEvaluations,
        updatedAt: progress.updatedAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getStudentDashboard,
  getStudentExamHistory,
  getStudentCandidateProgress,
};

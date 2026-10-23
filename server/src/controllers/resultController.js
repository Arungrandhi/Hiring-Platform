const ExamAttempt = require('../models/ExamAttempt');
const RecruitmentDrive = require('../models/RecruitmentDrive');
const CandidateProgress = require('../models/CandidateProgress');

/**
 * Get all exam results/attempts for a specific recruitment drive (Admin only)
 * GET /api/results/drive/:driveId
 */
const getDriveResults = async (req, res, next) => {
  try {
    const { driveId } = req.params;
    const { status, isPassed, search = '', sortBy = 'score', sortOrder = 'desc', page = 1, limit = 20 } = req.query;

    const drive = await RecruitmentDrive.findById(driveId);
    if (!drive) {
      return res.status(404).json({
        success: false,
        message: 'Recruitment drive not found',
      });
    }

    if (req.user.role === 'admin' && String(drive.createdBy) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: you can only view results for your own drives',
      });
    }

    const query = { drive: driveId };

    if (status) query.submissionStatus = status;
    if (isPassed !== undefined && isPassed !== '') query.isPassed = isPassed === 'true';

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const sortOption = {};
    if (sortBy === 'score') sortOption.score = sortOrder === 'asc' ? 1 : -1;
    else if (sortBy === 'submittedAt') sortOption.submittedAt = sortOrder === 'asc' ? 1 : -1;
    else sortOption.createdAt = -1;

    let [attempts, total] = await Promise.all([
      ExamAttempt.find(query)
        .populate('student', 'name email phone profile')
        .sort(sortOption)
        .skip(skip)
        .limit(limitNum)
        .lean(),
      ExamAttempt.countDocuments(query),
    ]);

    // Apply search filter on populated student name / email if provided
    if (search) {
      const searchLower = search.toLowerCase();
      attempts = attempts.filter(
        (a) =>
          a.student?.name?.toLowerCase().includes(searchLower) ||
          a.student?.email?.toLowerCase().includes(searchLower)
      );
    }

    // Attach candidate progression stage to each result
    const studentIds = attempts.map((a) => a.student?._id).filter(Boolean);
    const progresses = await CandidateProgress.find({
      drive: driveId,
      student: { $in: studentIds },
    }).lean();

    const progressMap = {};
    progresses.forEach((p) => {
      progressMap[String(p.student)] = p;
    });

    const enrichedAttempts = attempts.map((a) => ({
      ...a,
      candidateProgress: progressMap[String(a.student?._id)] || null,
    }));

    res.status(200).json({
      success: true,
      drive: {
        _id: drive._id,
        name: drive.name,
        jobTitle: drive.jobTitle,
        passingCriteria: drive.passingCriteria,
        isExamKeyPublished: drive.isExamKeyPublished,
        examKeyPublishedAt: drive.examKeyPublishedAt,
      },
      results: enrichedAttempts,
      pagination: {
        total,
        page: pageNum,
        limit: limitNum,
        totalPages: Math.ceil(total / limitNum),
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get detailed attempt evaluation for Admin review (includes question paper, student choices, and answer keys)
 * GET /api/results/attempt/:attemptId
 */
const getAttemptDetail = async (req, res, next) => {
  try {
    const { attemptId } = req.params;

    const attempt = await ExamAttempt.findById(attemptId)
      .populate('student', 'name email phone profile')
      .populate('drive', 'name jobTitle createdBy stages passingCriteria');

    if (!attempt) {
      return res.status(404).json({
        success: false,
        message: 'Exam attempt not found',
      });
    }

    // Authorization: Admin must own the drive or be SuperAdmin
    if (req.user.role === 'admin' && String(attempt.drive.createdBy) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: drive belongs to another administrator',
      });
    }

    const progress = await CandidateProgress.findOne({
      drive: attempt.drive._id,
      student: attempt.student._id,
    });

    res.status(200).json({
      success: true,
      attempt,
      candidateProgress: progress,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getDriveResults,
  getAttemptDetail,
};

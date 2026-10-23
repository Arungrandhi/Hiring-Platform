const RecruitmentDrive = require('../models/RecruitmentDrive');
const QuestionPaper = require('../models/QuestionPaper');
const DriveRegistration = require('../models/DriveRegistration');
const ExamAttempt = require('../models/ExamAttempt');
const CandidateProgress = require('../models/CandidateProgress');
const { generateUniqueDriveCode } = require('../utils/codeGenerator');
const { logActivity } = require('../services/activityLogger');

/**
 * Get all recruitment drives (scoped by role: Admin sees their own, SuperAdmin sees all)
 */
const getDrives = async (req, res, next) => {
  try {
    const { status, search = '', page = 1, limit = 20 } = req.query;

    const query = {};
    if (req.user.role === 'admin') {
      query.createdBy = req.user._id;
    }

    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { jobTitle: { $regex: search, $options: 'i' } },
        { driveCode: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const [drives, total] = await Promise.all([
      RecruitmentDrive.find(query)
        .populate('selectedPapers', 'title totalMarks duration questions')
        .populate('createdBy', 'name email')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      RecruitmentDrive.countDocuments(query),
    ]);

    // Attach statistics to each drive: registeredCount, attemptCount, qualifiedCount
    const driveIds = drives.map((d) => d._id);

    const [regCounts, attemptCounts, qualifiedCounts, shortlistedCounts] = await Promise.all([
      DriveRegistration.aggregate([
        { $match: { drive: { $in: driveIds }, registrationStatus: 'registered' } },
        { $group: { _id: '$drive', count: { $sum: 1 } } },
      ]),
      ExamAttempt.aggregate([
        { $match: { drive: { $in: driveIds } } },
        { $group: { _id: '$drive', count: { $sum: 1 } } },
      ]),
      ExamAttempt.aggregate([
        { $match: { drive: { $in: driveIds }, isPassed: true } },
        { $group: { _id: '$drive', count: { $sum: 1 } } },
      ]),
      CandidateProgress.aggregate([
        { $match: { drive: { $in: driveIds }, overallStatus: { $in: ['shortlisted', 'selected'] } } },
        { $group: { _id: '$drive', count: { $sum: 1 } } },
      ]),
    ]);

    const regMap = Object.fromEntries(regCounts.map((r) => [String(r._id), r.count]));
    const attemptMap = Object.fromEntries(attemptCounts.map((a) => [String(a._id), a.count]));
    const qualMap = Object.fromEntries(qualifiedCounts.map((q) => [String(q._id), q.count]));
    const shortMap = Object.fromEntries(shortlistedCounts.map((s) => [String(s._id), s.count]));

    const enrichedDrives = drives.map((d) => ({
      ...d,
      stats: {
        registeredCandidates: regMap[String(d._id)] || 0,
        totalAttempts: attemptMap[String(d._id)] || 0,
        qualifiedCandidates: qualMap[String(d._id)] || 0,
        shortlistedCandidates: shortMap[String(d._id)] || 0,
      },
    }));

    res.status(200).json({
      success: true,
      drives: enrichedDrives,
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
 * Get detailed drive by ID
 */
const getDriveById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const drive = await RecruitmentDrive.findById(id)
      .populate({
        path: 'selectedPapers',
        select: 'title subject duration totalMarks passingMarks difficulty questions status',
        populate: { path: 'subject', select: 'name code' },
      })
      .populate('createdBy', 'name email');

    if (!drive) {
      return res.status(404).json({
        success: false,
        message: 'Recruitment drive not found',
      });
    }

    if (req.user.role === 'admin' && String(drive.createdBy._id) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only view recruitment drives created by yourself',
      });
    }

    const [registeredCount, attemptCount, qualifiedCount, shortlistedCount] = await Promise.all([
      DriveRegistration.countDocuments({ drive: id, registrationStatus: 'registered' }),
      ExamAttempt.countDocuments({ drive: id }),
      ExamAttempt.countDocuments({ drive: id, isPassed: true }),
      CandidateProgress.countDocuments({ drive: id, overallStatus: { $in: ['shortlisted', 'selected'] } }),
    ]);

    res.status(200).json({
      success: true,
      drive: {
        ...drive.toObject(),
        stats: {
          registeredCandidates: registeredCount,
          totalAttempts: attemptCount,
          qualifiedCandidates: qualifiedCount,
          shortlistedCandidates: shortlistedCount,
        },
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Create a new recruitment drive with unique driveCode
 */
const createDrive = async (req, res, next) => {
  try {
    const {
      name,
      jobTitle,
      jobDescription,
      eligibility,
      selectedPapers,
      totalDuration,
      passingCriteria,
      maxAttempts,
      startDate,
      endDate,
      examStartTime,
      examEndTime,
      stages,
    } = req.body;

    if (!name || !jobTitle || !startDate || !endDate) {
      return res.status(400).json({
        success: false,
        message: 'Drive name, job title, start date, and end date are required',
      });
    }

    if (!selectedPapers || selectedPapers.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'At least one published question paper must be selected for the examination',
      });
    }

    // Verify all selected papers exist and are published
    const papers = await QuestionPaper.find({
      _id: { $in: selectedPapers },
    });

    if (papers.length !== selectedPapers.length) {
      return res.status(400).json({
        success: false,
        message: 'One or more selected question papers could not be found',
      });
    }

    if (req.user.role === 'admin') {
      const foreignPaper = papers.find((p) => String(p.createdBy) !== String(req.user._id));
      if (foreignPaper) {
        return res.status(403).json({
          success: false,
          message: `Access denied: question paper "${foreignPaper.title}" belongs to another administrator`,
        });
      }
    }

    const unpublished = papers.filter((p) => p.status !== 'published');
    if (unpublished.length > 0) {
      return res.status(400).json({
        success: false,
        message: `Paper "${unpublished[0].title}" is in "${unpublished[0].status}" status. Only published papers can be added to a drive.`,
      });
    }

    // Calculate total duration if not provided
    const calculatedDuration =
      totalDuration || papers.reduce((sum, p) => sum + (p.duration || 30), 0);

    // Generate unique, unpredictable drive code
    const driveCode = await generateUniqueDriveCode(RecruitmentDrive);

    const drive = await RecruitmentDrive.create({
      name: name.trim(),
      jobTitle: jobTitle.trim(),
      jobDescription: jobDescription ? jobDescription.trim() : '',
      eligibility: eligibility || {},
      selectedPapers,
      totalDuration: Number(calculatedDuration),
      passingCriteria: {
        minPercentage: Number(passingCriteria?.minPercentage || 50),
        minMarks: Number(passingCriteria?.minMarks || 0),
      },
      maxAttempts: maxAttempts ? Math.max(1, Number(maxAttempts)) : 1,
      driveCode,
      status: 'active', // default active or draft
      startDate: new Date(startDate),
      endDate: new Date(endDate),
      examStartTime: examStartTime ? new Date(examStartTime) : null,
      examEndTime: examEndTime ? new Date(examEndTime) : null,
      stages: Array.isArray(stages) && stages.length > 0 ? stages : undefined,
      createdBy: req.user._id,
    });

    await logActivity({
      actor: req.user,
      action: 'DRIVE_CREATED',
      resourceType: 'RecruitmentDrive',
      resourceId: drive._id,
      metadata: { name: drive.name, driveCode: drive.driveCode },
      req,
    });

    res.status(201).json({
      success: true,
      message: 'Recruitment drive created successfully',
      drive,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update an existing recruitment drive
 */
const updateDrive = async (req, res, next) => {
  try {
    const { id } = req.params;
    const drive = await RecruitmentDrive.findById(id);

    if (!drive) {
      return res.status(404).json({
        success: false,
        message: 'Recruitment drive not found',
      });
    }

    if (req.user.role === 'admin' && String(drive.createdBy) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit recruitment drives created by yourself',
      });
    }

    const {
      name,
      jobTitle,
      jobDescription,
      eligibility,
      selectedPapers,
      totalDuration,
      passingCriteria,
      maxAttempts,
      status,
      startDate,
      endDate,
      examStartTime,
      examEndTime,
      stages,
    } = req.body;

    if (name) drive.name = name.trim();
    if (jobTitle) drive.jobTitle = jobTitle.trim();
    if (jobDescription !== undefined) drive.jobDescription = jobDescription.trim();
    if (eligibility) drive.eligibility = { ...drive.eligibility, ...eligibility };
    if (selectedPapers) {
      const papers = await QuestionPaper.find({ _id: { $in: selectedPapers } });
      if (papers.length !== selectedPapers.length) {
        return res.status(400).json({
          success: false,
          message: 'One or more selected question papers could not be found',
        });
      }
      if (req.user.role === 'admin') {
        const foreignPaper = papers.find((p) => String(p.createdBy) !== String(req.user._id));
        if (foreignPaper) {
          return res.status(403).json({
            success: false,
            message: `Access denied: question paper "${foreignPaper.title}" belongs to another administrator`,
          });
        }
      }
      drive.selectedPapers = selectedPapers;
    }
    if (totalDuration !== undefined) drive.totalDuration = Number(totalDuration);
    if (passingCriteria) drive.passingCriteria = { ...drive.passingCriteria, ...passingCriteria };
    if (maxAttempts !== undefined) drive.maxAttempts = Math.max(1, Number(maxAttempts));
    if (status && ['draft', 'scheduled', 'active', 'closed'].includes(status)) {
      drive.status = status;
    }
    if (startDate) drive.startDate = new Date(startDate);
    if (endDate) drive.endDate = new Date(endDate);
    if (examStartTime !== undefined) drive.examStartTime = examStartTime ? new Date(examStartTime) : null;
    if (examEndTime !== undefined) drive.examEndTime = examEndTime ? new Date(examEndTime) : null;
    if (Array.isArray(stages) && stages.length > 0) drive.stages = stages;

    if (req.body.isExamKeyPublished !== undefined) {
      drive.isExamKeyPublished = Boolean(req.body.isExamKeyPublished);
      drive.examKeyPublishedAt = drive.isExamKeyPublished ? new Date() : null;
    }

    await drive.save();

    await logActivity({
      actor: req.user,
      action: 'DRIVE_UPDATED',
      resourceType: 'RecruitmentDrive',
      resourceId: drive._id,
      metadata: { name: drive.name, status: drive.status },
      req,
    });

    res.status(200).json({
      success: true,
      message: 'Recruitment drive updated successfully',
      drive,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Toggle or set publish status of exam key & results for a drive
 * PATCH /api/drives/:id/publish-key
 */
const toggleExamKeyPublish = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { publish } = req.body;

    const drive = await RecruitmentDrive.findById(id);
    if (!drive) {
      return res.status(404).json({
        success: false,
        message: 'Recruitment drive not found',
      });
    }

    if (req.user.role === 'admin' && String(drive.createdBy) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only publish exam keys for drives created by yourself',
      });
    }

    const newPublishState = typeof publish === 'boolean' ? publish : !drive.isExamKeyPublished;
    drive.isExamKeyPublished = newPublishState;
    drive.examKeyPublishedAt = newPublishState ? new Date() : null;
    await drive.save();

    await logActivity({
      actor: req.user,
      action: newPublishState ? 'EXAM_KEY_PUBLISHED' : 'EXAM_KEY_UNPUBLISHED',
      resourceType: 'RecruitmentDrive',
      resourceId: drive._id,
      metadata: { name: drive.name, isExamKeyPublished: newPublishState },
      req,
    });

    res.status(200).json({
      success: true,
      message: newPublishState
        ? 'Exam key and results published successfully! Students can now view their scores and history.'
        : 'Exam key and results unpublished. Student scores and exam history are now hidden.',
      drive,
      isExamKeyPublished: drive.isExamKeyPublished,
      examKeyPublishedAt: drive.examKeyPublishedAt,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Regenerate drive code
 */
const regenerateDriveCode = async (req, res, next) => {
  try {
    const { id } = req.params;
    const drive = await RecruitmentDrive.findById(id);

    if (!drive) {
      return res.status(404).json({
        success: false,
        message: 'Recruitment drive not found',
      });
    }

    if (req.user.role === 'admin' && String(drive.createdBy) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only regenerate codes for drives created by yourself',
      });
    }

    const oldCode = drive.driveCode;
    const newCode = await generateUniqueDriveCode(RecruitmentDrive);
    drive.driveCode = newCode;
    await drive.save();

    await logActivity({
      actor: req.user,
      action: 'DRIVE_CODE_REGENERATED',
      resourceType: 'RecruitmentDrive',
      resourceId: drive._id,
      metadata: { oldCode, newCode },
      req,
    });

    res.status(200).json({
      success: true,
      message: 'Drive code regenerated successfully',
      driveCode: newCode,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get registered students for a drive
 */
const getDriveRegisteredStudents = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { search = '', page = 1, limit = 20 } = req.query;

    const drive = await RecruitmentDrive.findById(id);
    if (!drive) {
      return res.status(404).json({
        success: false,
        message: 'Recruitment drive not found',
      });
    }

    if (req.user.role === 'admin' && String(drive.createdBy) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: drive belongs to another administrator',
      });
    }

    const regQuery = { drive: id, registrationStatus: 'registered' };

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const [registrations, total] = await Promise.all([
      DriveRegistration.find(regQuery)
        .populate('student', 'name email phone profile status')
        .sort({ registeredAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      DriveRegistration.countDocuments(regQuery),
    ]);

    // Attach exam attempt and candidate progress for each registered student
    const studentIds = registrations.map((r) => r.student?._id).filter(Boolean);

    const [attempts, progresses] = await Promise.all([
      ExamAttempt.find({ drive: id, student: { $in: studentIds } })
        .select('student score totalMarks percentage isPassed submissionStatus submittedAt attemptNumber')
        .lean(),
      CandidateProgress.find({ drive: id, student: { $in: studentIds } })
        .select('student currentStage overallStatus roundEvaluations stageHistory')
        .lean(),
    ]);

    const attemptMap = {};
    attempts.forEach((a) => {
      attemptMap[String(a.student)] = a;
    });

    const progressMap = {};
    progresses.forEach((p) => {
      progressMap[String(p.student)] = p;
    });

    const enriched = registrations.map((reg) => ({
      ...reg,
      examAttempt: attemptMap[String(reg.student?._id)] || null,
      candidateProgress: progressMap[String(reg.student?._id)] || null,
    }));

    res.status(200).json({
      success: true,
      students: enriched,
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

module.exports = {
  getDrives,
  getDriveById,
  createDrive,
  updateDrive,
  toggleExamKeyPublish,
  regenerateDriveCode,
  getDriveRegisteredStudents,
};

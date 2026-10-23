const RecruitmentDrive = require('../models/RecruitmentDrive');
const DriveRegistration = require('../models/DriveRegistration');
const CandidateProgress = require('../models/CandidateProgress');
const ExamAttempt = require('../models/ExamAttempt');
const { logActivity } = require('../services/activityLogger');

/**
 * Join a drive using unique drive access code
 * POST /api/drive-registrations/join
 */
const joinDriveByCode = async (req, res, next) => {
  try {
    const { driveCode } = req.body;

    if (!driveCode || !driveCode.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Please enter a recruitment drive code',
      });
    }

    const cleanCode = driveCode.trim().toUpperCase();

    // Find the drive
    const drive = await RecruitmentDrive.findOne({ driveCode: cleanCode })
      .populate('selectedPapers', 'title duration totalMarks')
      .populate('createdBy', 'name email');

    if (!drive) {
      return res.status(404).json({
        success: false,
        message: 'Invalid drive code. No matching recruitment drive found.',
      });
    }

    // Check drive status
    if (drive.status === 'draft') {
      return res.status(400).json({
        success: false,
        message: 'This recruitment drive is still in draft and not yet open for registration.',
      });
    }

    if (drive.status === 'closed') {
      return res.status(400).json({
        success: false,
        message: 'This recruitment drive has been closed.',
      });
    }

    // Check active date window
    const now = new Date();
    if (drive.startDate && now < new Date(drive.startDate)) {
      return res.status(400).json({
        success: false,
        message: `This recruitment drive will open on ${new Date(drive.startDate).toLocaleDateString()}.`,
      });
    }

    if (drive.endDate && now > new Date(drive.endDate)) {
      return res.status(400).json({
        success: false,
        message: `This recruitment drive ended on ${new Date(drive.endDate).toLocaleDateString()}.`,
      });
    }

    // Check if already registered
    const existingReg = await DriveRegistration.findOne({
      student: req.user._id,
      drive: drive._id,
    });

    if (existingReg) {
      return res.status(200).json({
        success: true,
        alreadyRegistered: true,
        message: 'You are already registered for this recruitment drive',
        drive,
        registration: existingReg,
      });
    }

    // Register student
    const registration = await DriveRegistration.create({
      student: req.user._id,
      drive: drive._id,
      registrationStatus: 'registered',
      registeredAt: new Date(),
    });

    // Initialize candidate recruitment pipeline progress
    const candidateProgress = await CandidateProgress.findOneAndUpdate(
      { student: req.user._id, drive: drive._id },
      {
        $setOnInsert: {
          student: req.user._id,
          drive: drive._id,
          currentStage: 'Examination',
          overallStatus: 'pending',
          roundEvaluations: [
            {
              stageName: 'Examination',
              status: 'pending',
            },
          ],
          stageHistory: [
            {
              fromStage: 'Registration',
              toStage: 'Examination',
              status: 'registered',
              changedBy: req.user._id,
              changedAt: new Date(),
              reason: 'Student joined recruitment drive with drive code',
            },
          ],
        },
      },
      { upsert: true, new: true }
    );

    await logActivity({
      actor: req.user,
      action: 'DRIVE_JOINED',
      resourceType: 'RecruitmentDrive',
      resourceId: drive._id,
      metadata: { driveName: drive.name, driveCode: drive.driveCode },
      req,
    });

    res.status(201).json({
      success: true,
      alreadyRegistered: false,
      message: `Successfully joined ${drive.name}!`,
      drive,
      registration,
      candidateProgress,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get all drives joined by authenticated student
 * GET /api/drive-registrations/my-drives
 */
const getMyJoinedDrives = async (req, res, next) => {
  try {
    const registrations = await DriveRegistration.find({
      student: req.user._id,
      registrationStatus: 'registered',
    })
      .populate({
        path: 'drive',
        populate: { path: 'selectedPapers', select: 'title duration totalMarks difficulty' },
      })
      .sort({ registeredAt: -1 })
      .lean();

    const driveIds = registrations.map((r) => r.drive?._id).filter(Boolean);

    // Fetch student's attempts and candidate progress for each drive
    const [attempts, progresses] = await Promise.all([
      ExamAttempt.find({
        student: req.user._id,
        drive: { $in: driveIds },
      })
        .select('drive attemptNumber score totalMarks percentage isPassed submissionStatus submittedAt deadline')
        .sort({ attemptNumber: -1 })
        .lean(),
      CandidateProgress.find({
        student: req.user._id,
        drive: { $in: driveIds },
      }).lean(),
    ]);

    const attemptMap = {};
    attempts.forEach((a) => {
      // keep latest attempt
      if (!attemptMap[String(a.drive)]) {
        attemptMap[String(a.drive)] = a;
      }
    });

    const progressMap = {};
    progresses.forEach((p) => {
      progressMap[String(p.drive)] = p;
    });

    const enriched = registrations.map((reg) => {
      const isKeyPublished = Boolean(reg.drive?.isExamKeyPublished);
      const rawAttempt = attemptMap[String(reg.drive?._id)] || null;
      let sanitizedAttempt = null;

      if (rawAttempt) {
        if (rawAttempt.submissionStatus === 'in-progress') {
          sanitizedAttempt = rawAttempt;
        } else if (!isKeyPublished) {
          sanitizedAttempt = {
            _id: rawAttempt._id,
            drive: rawAttempt.drive,
            attemptNumber: rawAttempt.attemptNumber,
            submissionStatus: rawAttempt.submissionStatus,
            submittedAt: rawAttempt.submittedAt,
            deadline: rawAttempt.deadline,
            isExamKeyPublished: false,
            score: null,
            totalMarks: null,
            percentage: null,
            isPassed: null,
          };
        } else {
          sanitizedAttempt = {
            ...rawAttempt,
            isExamKeyPublished: true,
          };
        }
      }

      return {
        ...reg,
        latestAttempt: sanitizedAttempt,
        candidateProgress: progressMap[String(reg.drive?._id)] || null,
      };
    });

    res.status(200).json({
      success: true,
      registrations: enriched,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  joinDriveByCode,
  getMyJoinedDrives,
};

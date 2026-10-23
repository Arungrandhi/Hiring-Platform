const CandidateProgress = require('../models/CandidateProgress');
const RecruitmentDrive = require('../models/RecruitmentDrive');
const ExamAttempt = require('../models/ExamAttempt');
const { logActivity } = require('../services/activityLogger');

/**
 * Get all candidates and their recruitment stages for a drive
 * GET /api/candidates/drive/:driveId
 */
const getCandidatesByDrive = async (req, res, next) => {
  try {
    const { driveId } = req.params;
    const { stage, status, search = '', minPercentage } = req.query;

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
        message: 'Access denied: drive belongs to another administrator',
      });
    }

    const stagesList = (drive.stages && drive.stages.length > 0) ? drive.stages : [
      'Examination',
      'Group Discussion (GD)',
      'Technical Interview',
      'HR Interview',
      'CEO Interview',
      'Selected or Rejected',
    ];

    // Fetch all candidates for this drive to calculate drive-wide stage counts
    const allProgresses = await CandidateProgress.find({ drive: driveId })
      .populate('student', 'name email phone profile status')
      .populate('updatedBy', 'name email')
      .sort({ updatedAt: -1 })
      .lean();

    // Compute stageCounts across all candidates in the drive
    const stageCounts = {};
    stagesList.forEach((stg, idx) => {
      if (idx === 0 || stg === 'Examination') {
        stageCounts[stg] = allProgresses.length;
      } else {
        stageCounts[stg] = allProgresses.filter((c) => {
          if (c.currentStage === stg) return true;
          if (c.roundEvaluations && c.roundEvaluations.some((r) => r.stageName === stg)) return true;
          return false;
        }).length;
      }
    });

    // Fetch exam scores for candidates in this drive
    const studentIds = allProgresses.map((c) => c.student?._id).filter(Boolean);
    const attempts = await ExamAttempt.find({
      drive: driveId,
      student: { $in: studentIds },
    })
      .select('student score totalMarks percentage isPassed submissionStatus submittedAt')
      .lean();

    const attemptMap = {};
    attempts.forEach((a) => {
      attemptMap[String(a.student)] = a;
    });

    // Filter by stage: candidate is included if they reached this stage or it is the initial examination stage
    let candidates = allProgresses;
    if (stage) {
      candidates = candidates.filter((c) => {
        if (c.currentStage === stage) return true;
        if (c.roundEvaluations && c.roundEvaluations.some((r) => r.stageName === stage)) return true;
        if (stage === stagesList[0] || stage === 'Examination') return true;
        return false;
      });
    }

    // Filter by status
    if (status) {
      candidates = candidates.filter((c) => c.overallStatus === status);
    }

    // Filter by search keyword
    if (search) {
      const s = search.toLowerCase();
      candidates = candidates.filter(
        (c) =>
          c.student?.name?.toLowerCase().includes(s) ||
          c.student?.email?.toLowerCase().includes(s)
      );
    }

    let enriched = candidates.map((c) => ({
      ...c,
      examAttempt: attemptMap[String(c.student?._id)] || null,
    }));

    if (minPercentage !== undefined && minPercentage !== '') {
      const minVal = Number(minPercentage);
      if (!isNaN(minVal)) {
        enriched = enriched.filter((c) => (c.examAttempt?.percentage || 0) >= minVal);
      }
    }

    res.status(200).json({
      success: true,
      drive: {
        _id: drive._id,
        name: drive.name,
        jobTitle: drive.jobTitle,
        stages: drive.stages,
      },
      stageCounts,
      totalCandidates: allProgresses.length,
      candidates: enriched,
    });
  } catch (err) {
    next(err);
  }
};


/**
 * Shortlist a candidate for next round
 * POST /api/candidates/shortlist
 */
const shortlistCandidate = async (req, res, next) => {
  try {
    const { driveId, studentId, nextStage, reason = 'Cleared qualification criteria' } = req.body;

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
        message: 'Access denied: unauthorized drive modification',
      });
    }

    let progress = await CandidateProgress.findOne({ drive: driveId, student: studentId });
    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'Candidate progress record not found',
      });
    }

    const previousStage = progress.currentStage;
    const targetStage = nextStage || (drive.stages && drive.stages[1]) || 'Group Discussion (GD)';

    progress.overallStatus = 'shortlisted';
    progress.currentStage = targetStage;
    progress.updatedBy = req.user._id;

    // Add stage history transition
    progress.stageHistory.push({
      fromStage: previousStage,
      toStage: targetStage,
      status: 'shortlisted',
      changedBy: req.user._id,
      changedAt: new Date(),
      reason,
    });

    // Ensure evaluation object for target stage exists
    const hasEvaluation = progress.roundEvaluations.some((r) => r.stageName === targetStage);
    if (!hasEvaluation) {
      progress.roundEvaluations.push({
        stageName: targetStage,
        status: 'pending',
      });
    }

    await progress.save();

    await logActivity({
      actor: req.user,
      action: 'CANDIDATE_SHORTLISTED',
      resourceType: 'CandidateProgress',
      resourceId: progress._id,
      metadata: { studentId, driveId, previousStage, targetStage },
      req,
    });

    res.status(200).json({
      success: true,
      message: `Candidate shortlisted and moved to ${targetStage}`,
      candidateProgress: progress,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Move candidate between stages and record evaluation / schedule
 * PUT /api/candidates/update-stage
 */
const updateCandidateStage = async (req, res, next) => {
  try {
    const {
      driveId,
      studentId,
      stageName,
      status, // 'pending', 'scheduled', 'cleared', 'rejected', 'on-hold'
      overallStatus, // 'pending', 'shortlisted', 'on-hold', 'selected', 'rejected'
      interviewDate,
      interviewTime,
      locationOrLink,
      score,
      remarks, // internal notes
      candidateNotes, // visible notes for student
      reason,
    } = req.body;

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
        message: 'Access denied: drive belongs to another administrator',
      });
    }

    let progress = await CandidateProgress.findOne({ drive: driveId, student: studentId });
    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'Candidate progress record not found',
      });
    }

    const previousStage = progress.currentStage;
    if (stageName) {
      progress.currentStage = stageName;
    }

    if (overallStatus && ['pending', 'shortlisted', 'on-hold', 'selected', 'rejected'].includes(overallStatus)) {
      progress.overallStatus = overallStatus;
    }

    // Locate or add round evaluation entry
    const activeStage = stageName || progress.currentStage;
    let evalIndex = progress.roundEvaluations.findIndex((r) => r.stageName === activeStage);

    if (evalIndex === -1) {
      progress.roundEvaluations.push({
        stageName: activeStage,
        status: status || 'pending',
        interviewDate: interviewDate ? new Date(interviewDate) : null,
        interviewTime: interviewTime || '',
        locationOrLink: locationOrLink || '',
        score: score !== undefined ? Number(score) : null,
        remarks: remarks || '',
        candidateNotes: candidateNotes || '',
        evaluatedBy: req.user._id,
        evaluatedAt: new Date(),
      });
    } else {
      const evaluation = progress.roundEvaluations[evalIndex];
      if (status) evaluation.status = status;
      if (interviewDate !== undefined) evaluation.interviewDate = interviewDate ? new Date(interviewDate) : null;
      if (interviewTime !== undefined) evaluation.interviewTime = interviewTime;
      if (locationOrLink !== undefined) evaluation.locationOrLink = locationOrLink;
      if (score !== undefined) evaluation.score = score !== null && score !== '' ? Number(score) : null;
      if (remarks !== undefined) evaluation.remarks = remarks;
      if (candidateNotes !== undefined) evaluation.candidateNotes = candidateNotes;
      evaluation.evaluatedBy = req.user._id;
      evaluation.evaluatedAt = new Date();
    }

    // Record stage history transition
    progress.stageHistory.push({
      fromStage: previousStage,
      toStage: progress.currentStage,
      status: overallStatus || status || 'updated',
      changedBy: req.user._id,
      changedAt: new Date(),
      reason: reason || `Updated stage evaluation for ${activeStage}`,
    });

    progress.updatedBy = req.user._id;
    await progress.save();

    await logActivity({
      actor: req.user,
      action: 'CANDIDATE_STAGE_UPDATED',
      resourceType: 'CandidateProgress',
      resourceId: progress._id,
      metadata: {
        studentId,
        driveId,
        currentStage: progress.currentStage,
        overallStatus: progress.overallStatus,
      },
      req,
    });

    res.status(200).json({
      success: true,
      message: 'Candidate progress and round evaluation updated successfully',
      candidateProgress: progress,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get detailed candidate recruitment progression (Admin view)
 * GET /api/candidates/detail/:driveId/:studentId
 */
const getCandidateProgressDetail = async (req, res, next) => {
  try {
    const { driveId, studentId } = req.params;

    const progress = await CandidateProgress.findOne({ drive: driveId, student: studentId })
      .populate('student', 'name email phone profile')
      .populate('drive', 'name jobTitle stages')
      .populate('stageHistory.changedBy', 'name role')
      .populate('roundEvaluations.evaluatedBy', 'name role');

    if (!progress) {
      return res.status(404).json({
        success: false,
        message: 'Candidate progress record not found',
      });
    }

    const examAttempts = await ExamAttempt.find({ drive: driveId, student: studentId })
      .sort({ attemptNumber: -1 })
      .lean();

    res.status(200).json({
      success: true,
      candidateProgress: progress,
      examAttempts,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Bulk advance candidates to a target stage (e.g. Group Discussion (GD))
 * POST /api/candidates/bulk-advance
 */
const bulkAdvanceCandidates = async (req, res, next) => {
  try {
    const { driveId, studentIds = [], targetStage, reason = 'Advanced to next stage based on evaluation criteria' } = req.body;

    if (!driveId || !Array.isArray(studentIds) || studentIds.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Drive ID and at least one candidate ID are required',
      });
    }

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
        message: 'Access denied: unauthorized drive modification',
      });
    }

    const nextStageName = targetStage || (drive.stages && drive.stages[1]) || 'Group Discussion (GD)';

    const progresses = await CandidateProgress.find({
      drive: driveId,
      student: { $in: studentIds },
    });

    const now = new Date();
    let updatedCount = 0;

    for (const progress of progresses) {
      const prevStage = progress.currentStage;
      progress.currentStage = nextStageName;
      progress.overallStatus = 'shortlisted';
      progress.updatedBy = req.user._id;

      // Add stage history transition
      progress.stageHistory.push({
        fromStage: prevStage,
        toStage: nextStageName,
        status: 'shortlisted',
        changedBy: req.user._id,
        changedAt: now,
        reason: `${reason} (${prevStage} -> ${nextStageName})`,
      });

      // Ensure previous stage evaluation is recorded as cleared
      const prevEval = progress.roundEvaluations.find((r) => r.stageName === prevStage);
      if (prevEval) {
        if (prevEval.status === 'pending' || !prevEval.status) {
          prevEval.status = 'cleared';
        }
        prevEval.evaluatedBy = req.user._id;
        prevEval.evaluatedAt = now;
      }

      // Ensure evaluation object for target stage exists
      const hasEvaluation = progress.roundEvaluations.some((r) => r.stageName === nextStageName);
      if (!hasEvaluation) {
        progress.roundEvaluations.push({
          stageName: nextStageName,
          status: 'pending',
        });
      }


      await progress.save();
      updatedCount++;
    }

    await logActivity({
      actor: req.user,
      action: 'CANDIDATES_BULK_ADVANCED',
      resourceType: 'CandidateProgress',
      resourceId: drive._id,
      metadata: { count: updatedCount, targetStage: nextStageName },
      req,
    });

    res.status(200).json({
      success: true,
      message: `Successfully advanced ${updatedCount} candidate(s) to ${nextStageName}`,
      updatedCount,
      targetStage: nextStageName,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getCandidatesByDrive,
  shortlistCandidate,
  updateCandidateStage,
  getCandidateProgressDetail,
  bulkAdvanceCandidates,
};

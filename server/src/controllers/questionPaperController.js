const QuestionPaper = require('../models/QuestionPaper');
const Subject = require('../models/Subject');
const { logActivity } = require('../services/activityLogger');

/**
 * Get question papers list with filters (subject, status, difficulty, search)
 */
const getQuestionPapers = async (req, res, next) => {
  try {
    const { subject, status, difficulty, search = '', page = 1, limit = 20 } = req.query;

    const query = {};

    // If Admin, show their own papers plus any published papers, or superadmin can view all
    if (req.user.role === 'admin') {
      // By default admins view papers they created
      query.createdBy = req.user._id;
    }

    if (subject) query.subject = subject;
    if (status) query.status = status;
    if (difficulty) query.difficulty = difficulty;

    if (search) {
      query.title = { $regex: search, $options: 'i' };
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const [papers, total] = await Promise.all([
      QuestionPaper.find(query)
        .populate('subject', 'name code')
        .populate('createdBy', 'name email')
        .select('-questions.correctAnswer -questions.explanation') // lightweight list
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      QuestionPaper.countDocuments(query),
    ]);

    // Attach question count
    const enriched = papers.map((p) => ({
      ...p,
      questionCount: p.questions ? p.questions.length : 0,
    }));

    res.status(200).json({
      success: true,
      papers: enriched,
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
 * Get single question paper details with full questions and answers (Admin only)
 */
const getQuestionPaperById = async (req, res, next) => {
  try {
    const { id } = req.params;

    const paper = await QuestionPaper.findById(id)
      .populate('subject', 'name code')
      .populate('createdBy', 'name email');

    if (!paper) {
      return res.status(404).json({
        success: false,
        message: 'Question paper not found',
      });
    }

    // Ownership check
    if (req.user.role === 'admin' && String(paper.createdBy._id) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only view details of question papers created by yourself',
      });
    }

    res.status(200).json({
      success: true,
      paper,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Create a new question paper
 */
const createQuestionPaper = async (req, res, next) => {
  try {
    const {
      title,
      subject,
      instructions,
      difficulty,
      duration,
      passingMarks,
      negativeMarking,
      questions = [],
    } = req.body;

    if (!title || !subject || !duration) {
      return res.status(400).json({
        success: false,
        message: 'Title, subject, and duration are required',
      });
    }

    const subDoc = await Subject.findById(subject);
    if (!subDoc) {
      return res.status(404).json({
        success: false,
        message: 'Referenced subject does not exist',
      });
    }

    if (req.user.role === 'admin' && String(subDoc.createdBy) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'Access denied: you can only assign question papers to your own subjects',
      });
    }

    // Calculate total marks from questions
    const totalMarks = questions.reduce((sum, q) => sum + (Number(q.marks) || 1), 0);

    const paper = await QuestionPaper.create({
      title: title.trim(),
      subject,
      instructions: instructions ? instructions.trim() : undefined,
      difficulty: difficulty || 'Medium',
      duration: Number(duration),
      totalMarks,
      passingMarks: passingMarks !== undefined ? Number(passingMarks) : Math.ceil(totalMarks * 0.4),
      negativeMarking: {
        enabled: negativeMarking?.enabled || false,
        perQuestionPenalty: Number(negativeMarking?.perQuestionPenalty || 0),
      },
      questions: questions.map((q, idx) => ({
        questionText: q.questionText.trim(),
        options: q.options.map((opt) => String(opt).trim()),
        correctAnswer: Number(q.correctAnswer),
        marks: Number(q.marks) || 1,
        negativeMarks: Number(q.negativeMarks) || 0,
        explanation: q.explanation ? q.explanation.trim() : '',
        order: q.order || idx + 1,
      })),
      status: 'draft',
      createdBy: req.user._id,
    });

    await logActivity({
      actor: req.user,
      action: 'QUESTION_PAPER_CREATED',
      resourceType: 'QuestionPaper',
      resourceId: paper._id,
      metadata: { title: paper.title, questionCount: paper.questions.length },
      req,
    });

    res.status(201).json({
      success: true,
      message: 'Question paper created in draft status',
      paper,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update an existing question paper
 */
const updateQuestionPaper = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      title,
      subject,
      instructions,
      difficulty,
      duration,
      passingMarks,
      negativeMarking,
      questions,
    } = req.body;

    const paper = await QuestionPaper.findById(id);
    if (!paper) {
      return res.status(404).json({
        success: false,
        message: 'Question paper not found',
      });
    }

    if (req.user.role === 'admin' && String(paper.createdBy) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit question papers created by yourself',
      });
    }

    if (title) paper.title = title.trim();
    if (subject) {
      const subDoc = await Subject.findById(subject);
      if (!subDoc) {
        return res.status(404).json({
          success: false,
          message: 'Referenced subject does not exist',
        });
      }
      if (req.user.role === 'admin' && String(subDoc.createdBy) !== String(req.user._id)) {
        return res.status(403).json({
          success: false,
          message: 'Access denied: you can only assign question papers to your own subjects',
        });
      }
      paper.subject = subject;
    }
    if (instructions !== undefined) paper.instructions = instructions.trim();
    if (difficulty) paper.difficulty = difficulty;
    if (duration !== undefined) paper.duration = Number(duration);
    if (passingMarks !== undefined) paper.passingMarks = Number(passingMarks);
    if (negativeMarking) {
      paper.negativeMarking = {
        enabled: Boolean(negativeMarking.enabled),
        perQuestionPenalty: Number(negativeMarking.perQuestionPenalty || 0),
      };
    }

    if (Array.isArray(questions)) {
      paper.questions = questions.map((q, idx) => ({
        questionText: q.questionText.trim(),
        options: q.options.map((opt) => String(opt).trim()),
        correctAnswer: Number(q.correctAnswer),
        marks: Number(q.marks) || 1,
        negativeMarks: Number(q.negativeMarks) || 0,
        explanation: q.explanation ? q.explanation.trim() : '',
        order: q.order || idx + 1,
      }));
      paper.totalMarks = paper.questions.reduce((sum, q) => sum + (q.marks || 0), 0);
    }

    paper.version = (paper.version || 1) + 1;
    await paper.save();

    await logActivity({
      actor: req.user,
      action: 'QUESTION_PAPER_UPDATED',
      resourceType: 'QuestionPaper',
      resourceId: paper._id,
      metadata: { title: paper.title, version: paper.version },
      req,
    });

    res.status(200).json({
      success: true,
      message: 'Question paper updated successfully',
      paper,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Publish a question paper
 */
const publishQuestionPaper = async (req, res, next) => {
  try {
    const { id } = req.params;

    const paper = await QuestionPaper.findById(id);
    if (!paper) {
      return res.status(404).json({
        success: false,
        message: 'Question paper not found',
      });
    }

    if (req.user.role === 'admin' && String(paper.createdBy) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only publish question papers created by yourself',
      });
    }

    // Validation before publishing
    if (!paper.questions || paper.questions.length === 0) {
      return res.status(400).json({
        success: false,
        message: 'Cannot publish a paper without questions. Please add at least 1 question.',
      });
    }

    for (let i = 0; i < paper.questions.length; i++) {
      const q = paper.questions[i];
      if (!q.options || q.options.length < 2) {
        return res.status(400).json({
          success: false,
          message: `Question #${i + 1} must have at least 2 options`,
        });
      }
      if (q.correctAnswer === undefined || q.correctAnswer < 0 || q.correctAnswer >= q.options.length) {
        return res.status(400).json({
          success: false,
          message: `Question #${i + 1} has an invalid correct answer index`,
        });
      }
    }

    paper.status = 'published';
    await paper.save();

    await logActivity({
      actor: req.user,
      action: 'QUESTION_PAPER_PUBLISHED',
      resourceType: 'QuestionPaper',
      resourceId: paper._id,
      metadata: { title: paper.title, totalMarks: paper.totalMarks },
      req,
    });

    res.status(200).json({
      success: true,
      message: 'Question paper published and ready for recruitment drives',
      paper,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Archive a question paper
 */
const archiveQuestionPaper = async (req, res, next) => {
  try {
    const { id } = req.params;

    const paper = await QuestionPaper.findById(id);
    if (!paper) {
      return res.status(404).json({
        success: false,
        message: 'Question paper not found',
      });
    }

    if (req.user.role === 'admin' && String(paper.createdBy) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only archive question papers created by yourself',
      });
    }

    paper.status = 'archived';
    await paper.save();

    await logActivity({
      actor: req.user,
      action: 'QUESTION_PAPER_ARCHIVED',
      resourceType: 'QuestionPaper',
      resourceId: paper._id,
      metadata: { title: paper.title },
      req,
    });

    res.status(200).json({
      success: true,
      message: 'Question paper archived',
      paper,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getQuestionPapers,
  getQuestionPaperById,
  createQuestionPaper,
  updateQuestionPaper,
  publishQuestionPaper,
  archiveQuestionPaper,
};

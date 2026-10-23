const Subject = require('../models/Subject');
const QuestionPaper = require('../models/QuestionPaper');
const { logActivity } = require('../services/activityLogger');

/**
 * Get all subjects with optional search and status filter
 */
const getSubjects = async (req, res, next) => {
  try {
    const { search = '', status = '', page = 1, limit = 50 } = req.query;

    const query = {};

    // Admins only view subjects they created; SuperAdmin can view all
    if (req.user.role === 'admin') {
      query.createdBy = req.user._id;
    }

    if (status) query.status = status;
    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { code: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const [subjects, total] = await Promise.all([
      Subject.find(query)
        .populate('createdBy', 'name email role')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      Subject.countDocuments(query),
    ]);

    // Attach count of papers per subject (scoped to this admin if role is admin)
    const subjectIds = subjects.map((s) => s._id);
    const paperMatch = { subject: { $in: subjectIds } };
    if (req.user.role === 'admin') {
      paperMatch.createdBy = req.user._id;
    }

    const paperCounts = await QuestionPaper.aggregate([
      { $match: paperMatch },
      { $group: { _id: '$subject', count: { $sum: 1 } } },
    ]);

    const countMap = {};
    paperCounts.forEach((pc) => {
      countMap[String(pc._id)] = pc.count;
    });

    const enrichedSubjects = subjects.map((s) => ({
      ...s,
      paperCount: countMap[String(s._id)] || 0,
    }));

    res.status(200).json({
      success: true,
      subjects: enrichedSubjects,
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
 * Create a new subject
 */
const createSubject = async (req, res, next) => {
  try {
    const { name, code, description } = req.body;

    if (!name || !name.trim()) {
      return res.status(400).json({
        success: false,
        message: 'Subject name is required',
      });
    }

    // Check duplicate per-admin
    const duplicateQuery = {
      name: { $regex: `^${name.trim()}$`, $options: 'i' },
      createdBy: req.user._id,
    };

    const existing = await Subject.findOne(duplicateQuery);

    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A subject with this name already exists in your workspace',
        errors: { name: 'Subject name must be unique' },
      });
    }

    const subject = await Subject.create({
      name: name.trim(),
      code: code ? code.trim().toUpperCase() : '',
      description: description ? description.trim() : '',
      status: 'active',
      createdBy: req.user._id,
    });

    await logActivity({
      actor: req.user,
      action: 'SUBJECT_CREATED',
      resourceType: 'Subject',
      resourceId: subject._id,
      metadata: { name: subject.name, code: subject.code },
      req,
    });

    res.status(201).json({
      success: true,
      message: 'Subject created successfully',
      subject,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update a subject
 */
const updateSubject = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, code, description, status } = req.body;

    const subject = await Subject.findById(id);
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found',
      });
    }

    // Authorization: only the creator Admin or Super Admin can edit
    if (req.user.role !== 'superadmin' && String(subject.createdBy) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only edit subjects created by yourself',
      });
    }

    if (name && name.trim().toLowerCase() !== subject.name.toLowerCase()) {
      const duplicateQuery = {
        _id: { $ne: id },
        name: { $regex: `^${name.trim()}$`, $options: 'i' },
        createdBy: subject.createdBy,
      };
      const existing = await Subject.findOne(duplicateQuery);
      if (existing) {
        return res.status(400).json({
          success: false,
          message: 'Another subject with this name already exists in your workspace',
        });
      }
      subject.name = name.trim();
    }

    if (code !== undefined) subject.code = code.trim().toUpperCase();
    if (description !== undefined) subject.description = description.trim();
    if (status && ['active', 'inactive'].includes(status)) subject.status = status;

    await subject.save();

    await logActivity({
      actor: req.user,
      action: 'SUBJECT_UPDATED',
      resourceType: 'Subject',
      resourceId: subject._id,
      metadata: { name: subject.name, status: subject.status },
      req,
    });

    res.status(200).json({
      success: true,
      message: 'Subject updated successfully',
      subject,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Toggle subject status (active/inactive)
 */
const toggleSubjectStatus = async (req, res, next) => {
  try {
    const { id } = req.params;

    const subject = await Subject.findById(id);
    if (!subject) {
      return res.status(404).json({
        success: false,
        message: 'Subject not found',
      });
    }

    if (req.user.role !== 'superadmin' && String(subject.createdBy) !== String(req.user._id)) {
      return res.status(403).json({
        success: false,
        message: 'You can only modify subjects created by yourself',
      });
    }

    subject.status = subject.status === 'active' ? 'inactive' : 'active';
    await subject.save();

    await logActivity({
      actor: req.user,
      action: 'SUBJECT_STATUS_TOGGLED',
      resourceType: 'Subject',
      resourceId: subject._id,
      metadata: { name: subject.name, status: subject.status },
      req,
    });

    res.status(200).json({
      success: true,
      message: `Subject marked as ${subject.status}`,
      subject,
    });
  } catch (err) {
    next(err);
  }
};

module.exports = {
  getSubjects,
  createSubject,
  updateSubject,
  toggleSubjectStatus,
};

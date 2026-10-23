const User = require('../models/User');
const RecruitmentDrive = require('../models/RecruitmentDrive');
const ExamAttempt = require('../models/ExamAttempt');
const Subject = require('../models/Subject');
const ActivityLog = require('../models/ActivityLog');
const { logActivity } = require('../services/activityLogger');

/**
 * Super Admin Dashboard summary stats
 */
const getDashboardStats = async (req, res, next) => {
  try {
    const [
      totalAdmins,
      activeAdmins,
      totalStudents,
      totalDrives,
      totalAttempts,
      recentActivities,
    ] = await Promise.all([
      User.countDocuments({ role: 'admin' }),
      User.countDocuments({ role: 'admin', status: 'active' }),
      User.countDocuments({ role: 'student' }),
      RecruitmentDrive.countDocuments(),
      ExamAttempt.countDocuments(),
      ActivityLog.find().sort({ createdAt: -1 }).limit(10).lean(),
    ]);

    res.status(200).json({
      success: true,
      stats: {
        totalAdmins,
        activeAdmins,
        totalStudents,
        totalDrives,
        totalAttempts,
      },
      recentActivities,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Super Admin creates a new Admin account
 */
const createAdmin = async (req, res, next) => {
  try {
    const { name, email, phone, password } = req.body;

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Name, email, and password are required',
      });
    }

    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'A user with this email already exists',
        errors: { email: 'Email is already registered' },
      });
    }

    const passwordHash = await User.hashPassword(password);

    const admin = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone ? phone.trim() : '',
      passwordHash,
      role: 'admin',
      status: 'active',
      createdBy: req.user._id,
    });

    await logActivity({
      actor: req.user,
      action: 'ADMIN_CREATED',
      resourceType: 'User',
      resourceId: admin._id,
      metadata: { adminName: admin.name, adminEmail: admin.email },
      req,
    });

    res.status(201).json({
      success: true,
      message: 'Admin account created successfully',
      admin: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        role: admin.role,
        status: admin.status,
        createdAt: admin.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * List Admins with pagination, search, and status filter
 */
const getAdmins = async (req, res, next) => {
  try {
    const { search = '', status = '', page = 1, limit = 10 } = req.query;

    const query = { role: 'admin' };

    if (status) {
      query.status = status;
    }

    if (search) {
      query.$or = [
        { name: { $regex: search, $options: 'i' } },
        { email: { $regex: search, $options: 'i' } },
        { phone: { $regex: search, $options: 'i' } },
      ];
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const [admins, total] = await Promise.all([
      User.find(query)
        .select('-passwordHash')
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limitNum)
        .lean(),
      User.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      admins,
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
 * Get detailed Admin info including their drives and activity count
 */
const getAdminDetails = async (req, res, next) => {
  try {
    const { id } = req.params;

    const admin = await User.findOne({ _id: id, role: 'admin' }).select('-passwordHash').lean();
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
      });
    }

    const [drives, subjectsCount] = await Promise.all([
      RecruitmentDrive.find({ createdBy: id }).select('name jobTitle status driveCode startDate endDate createdAt').lean(),
      Subject.countDocuments({ createdBy: id }),
    ]);

    res.status(200).json({
      success: true,
      admin: {
        ...admin,
        drives,
        subjectsCount,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update Admin status or details
 */
const updateAdmin = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, status } = req.body;

    const admin = await User.findOne({ _id: id, role: 'admin' });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
      });
    }

    if (name) admin.name = name.trim();
    if (phone !== undefined) admin.phone = phone.trim();
    if (status && ['active', 'inactive', 'suspended'].includes(status)) {
      admin.status = status;
    }

    await admin.save();

    await logActivity({
      actor: req.user,
      action: 'ADMIN_UPDATED',
      resourceType: 'User',
      resourceId: admin._id,
      metadata: { adminEmail: admin.email, updatedStatus: admin.status },
      req,
    });

    res.status(200).json({
      success: true,
      message: 'Admin updated successfully',
      admin: {
        _id: admin._id,
        name: admin.name,
        email: admin.email,
        phone: admin.phone,
        role: admin.role,
        status: admin.status,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Reset an Admin's password
 */
const resetAdminPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { newPassword } = req.body;

    if (!newPassword || newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters',
      });
    }

    const admin = await User.findOne({ _id: id, role: 'admin' });
    if (!admin) {
      return res.status(404).json({
        success: false,
        message: 'Admin not found',
      });
    }

    admin.passwordHash = await User.hashPassword(newPassword);
    await admin.save();

    await logActivity({
      actor: req.user,
      action: 'ADMIN_PASSWORD_RESET',
      resourceType: 'User',
      resourceId: admin._id,
      metadata: { adminEmail: admin.email },
      req,
    });

    res.status(200).json({
      success: true,
      message: `Password reset successfully for ${admin.name}`,
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get Activity Logs with search, filters, and pagination
 */
const getActivityLogs = async (req, res, next) => {
  try {
    const { actorRole, action, resourceType, startDate, endDate, page = 1, limit = 20 } = req.query;

    const query = {};

    if (actorRole) query.actorRole = actorRole;
    if (action) query.action = { $regex: action, $options: 'i' };
    if (resourceType) query.resourceType = resourceType;

    if (startDate || endDate) {
      query.createdAt = {};
      if (startDate) query.createdAt.$gte = new Date(startDate);
      if (endDate) query.createdAt.$lte = new Date(endDate);
    }

    const pageNum = Math.max(1, parseInt(page, 10));
    const limitNum = Math.max(1, parseInt(limit, 10));
    const skip = (pageNum - 1) * limitNum;

    const [logs, total] = await Promise.all([
      ActivityLog.find(query).sort({ createdAt: -1 }).skip(skip).limit(limitNum).lean(),
      ActivityLog.countDocuments(query),
    ]);

    res.status(200).json({
      success: true,
      logs,
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
  getDashboardStats,
  createAdmin,
  getAdmins,
  getAdminDetails,
  updateAdmin,
  resetAdminPassword,
  getActivityLogs,
};

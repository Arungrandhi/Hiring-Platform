const jwt = require('jsonwebtoken');
const User = require('../models/User');
const { logActivity } = require('../services/activityLogger');

const generateToken = (userId, role) => {
  const secret = process.env.JWT_SECRET || 'super_secure_jwt_secret_key_change_in_production_9876543210';
  const expiresIn = process.env.JWT_EXPIRES_IN || '30m';
  return jwt.sign({ userId, role }, secret, { expiresIn });
};

/**
 * Register a new Student account
 * Public endpoint
 */
const registerStudent = async (req, res, next) => {
  try {
    const { name, email, phone, password, college, qualification, graduationYear, department } = req.body;

    // Check if email already exists
    const existing = await User.findOne({ email: email.toLowerCase().trim() });
    if (existing) {
      return res.status(400).json({
        success: false,
        message: 'An account with this email already exists',
        errors: { email: 'Email is already registered' },
      });
    }

    const passwordHash = await User.hashPassword(password);

    const student = await User.create({
      name: name.trim(),
      email: email.toLowerCase().trim(),
      phone: phone ? phone.trim() : '',
      passwordHash,
      role: 'student',
      status: 'active',
      profile: {
        college: college ? college.trim() : '',
        qualification: qualification ? qualification.trim() : '',
        graduationYear: graduationYear ? Number(graduationYear) : null,
        department: department ? department.trim() : '',
      },
    });

    const token = generateToken(student._id, student.role);

    await logActivity({
      actor: student,
      action: 'STUDENT_REGISTERED',
      resourceType: 'User',
      resourceId: student._id,
      metadata: { email: student.email, name: student.name },
      req,
    });

    res.status(201).json({
      success: true,
      message: 'Student account registered successfully',
      token,
      user: {
        _id: student._id,
        name: student.name,
        email: student.email,
        phone: student.phone,
        role: student.role,
        status: student.status,
        profile: student.profile,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Login for Super Admin, Admin, and Student
 * Public endpoint
 */
const login = async (req, res, next) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({
        success: false,
        message: 'Please provide both email and password',
      });
    }

    const user = await User.findOne({ email: email.toLowerCase().trim() });
    if (!user) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    const isMatch = await user.comparePassword(password);
    if (!isMatch) {
      return res.status(401).json({
        success: false,
        message: 'Invalid email or password',
      });
    }

    if (user.status !== 'active') {
      return res.status(403).json({
        success: false,
        message: 'Your account is currently inactive or suspended. Please contact platform administration.',
      });
    }

    user.lastLoginAt = new Date();
    await user.save();

    const token = generateToken(user._id, user.role);

    await logActivity({
      actor: user,
      action: 'USER_LOGIN',
      resourceType: 'User',
      resourceId: user._id,
      metadata: { role: user.role, email: user.email },
      req,
    });

    res.status(200).json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        profile: user.profile,
        lastLoginAt: user.lastLoginAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Get current authenticated user profile
 */
const getCurrentUser = async (req, res, next) => {
  try {
    res.status(200).json({
      success: true,
      user: {
        _id: req.user._id,
        name: req.user.name,
        email: req.user.email,
        phone: req.user.phone,
        role: req.user.role,
        status: req.user.status,
        profile: req.user.profile,
        lastLoginAt: req.user.lastLoginAt,
        createdAt: req.user.createdAt,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Update authenticated user profile
 */
const updateProfile = async (req, res, next) => {
  try {
    const { name, phone, profile } = req.body;
    const user = req.user;

    if (name) user.name = name.trim();
    if (phone !== undefined) user.phone = phone.trim();
    if (profile) {
      user.profile = {
        ...user.profile,
        ...profile,
      };
    }

    await user.save();

    await logActivity({
      actor: user,
      action: 'PROFILE_UPDATED',
      resourceType: 'User',
      resourceId: user._id,
      metadata: { name: user.name },
      req,
    });

    res.status(200).json({
      success: true,
      message: 'Profile updated successfully',
      user: {
        _id: user._id,
        name: user.name,
        email: user.email,
        phone: user.phone,
        role: user.role,
        status: user.status,
        profile: user.profile,
      },
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Change password
 */
const changePassword = async (req, res, next) => {
  try {
    const { currentPassword, newPassword } = req.body;

    if (!currentPassword || !newPassword) {
      return res.status(400).json({
        success: false,
        message: 'Current password and new password are required',
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: 'New password must be at least 6 characters',
      });
    }

    const isMatch = await req.user.comparePassword(currentPassword);
    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: 'Current password does not match',
      });
    }

    req.user.passwordHash = await User.hashPassword(newPassword);
    await req.user.save();

    await logActivity({
      actor: req.user,
      action: 'PASSWORD_CHANGED',
      resourceType: 'User',
      resourceId: req.user._id,
      metadata: {},
      req,
    });

    res.status(200).json({
      success: true,
      message: 'Password changed successfully',
    });
  } catch (err) {
    next(err);
  }
};

/**
 * Logout
 */
const logout = async (req, res) => {
  if (req.user) {
    await logActivity({
      actor: req.user,
      action: 'USER_LOGOUT',
      resourceType: 'User',
      resourceId: req.user._id,
      metadata: {},
      req,
    });
  }
  res.status(200).json({
    success: true,
    message: 'Logged out successfully',
  });
};

module.exports = {
  registerStudent,
  login,
  getCurrentUser,
  updateProfile,
  changePassword,
  logout,
};

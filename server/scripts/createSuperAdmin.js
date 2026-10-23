const dotenv = require('dotenv');
const path = require('path');
dotenv.config({ path: path.join(__dirname, '../.env') });

const mongoose = require('mongoose');
const User = require('../src/models/User');
const { logActivity } = require('../src/services/activityLogger');

const createSuperAdmin = async () => {
  try {
    const mongoUri =
      process.env.MONGO_URI ||
      process.env.MONGODB_URI ||
      'mongodb+srv://arungrandhi:ARUN123@cluster0.k1xoqch.mongodb.net/Hiring-Platform?retryWrites=true&w=majority&appName=Cluster0';
    await mongoose.connect(mongoUri);
    console.log('[Script] Connected to MongoDB at', mongoUri);

    const email = (process.env.SUPERADMIN_EMAIL || 'superadmin@hiringplatform.com').toLowerCase().trim();
    const password = process.env.SUPERADMIN_PASSWORD || 'SuperAdmin@123';
    const name = process.env.SUPERADMIN_NAME || 'Platform Super Administrator';

    let superAdmin = await User.findOne({ email });

    if (superAdmin) {
      console.log(`[Script] Existing Super Admin found (${email}). Updating role and password...`);
      superAdmin.role = 'superadmin';
      superAdmin.status = 'active';
      superAdmin.passwordHash = await User.hashPassword(password);
      await superAdmin.save();
      console.log(`[Script] Super Admin credentials successfully updated!`);
    } else {
      const passwordHash = await User.hashPassword(password);
      superAdmin = await User.create({
        name,
        email,
        phone: '+1-555-0100',
        passwordHash,
        role: 'superadmin',
        status: 'active',
      });
      console.log(`[Script] Super Admin successfully created!`);
    }

    await logActivity({
      actor: superAdmin,
      action: 'SUPERADMIN_INITIALIZED',
      resourceType: 'User',
      resourceId: superAdmin._id,
      metadata: { email: superAdmin.email },
    });

    console.log('====================================================');
    console.log('Super Admin Credentials:');
    console.log(`Email:    ${email}`);
    console.log(`Password: ${password}`);
    console.log('Role:     superadmin');
    console.log('====================================================');

    await mongoose.disconnect();
    process.exit(0);
  } catch (err) {
    console.error('[Script Error]', err.message);
    process.exit(1);
  }
};

createSuperAdmin();

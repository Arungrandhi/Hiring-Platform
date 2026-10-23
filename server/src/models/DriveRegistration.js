const mongoose = require('mongoose');

const driveRegistrationSchema = new mongoose.Schema(
  {
    student: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
    drive: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'RecruitmentDrive',
      required: true,
      index: true,
    },
    registrationStatus: {
      type: String,
      enum: ['registered', 'cancelled'],
      default: 'registered',
    },
    registeredAt: {
      type: Date,
      default: Date.now,
    },
  },
  {
    timestamps: true,
  }
);

// Compound index to guarantee one registration per student per drive
driveRegistrationSchema.index({ student: 1, drive: 1 }, { unique: true });

module.exports = mongoose.model('DriveRegistration', driveRegistrationSchema);

const mongoose = require('mongoose');

const DEFAULT_STAGES = [
  'Examination',
  'Group Discussion (GD)',
  'Technical Interview',
  'HR Interview',
  'CEO Interview',
  'Selected or Rejected',
];

const recruitmentDriveSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Drive name is required'],
      trim: true,
      maxlength: [200, 'Drive name cannot exceed 200 characters'],
      index: true,
    },
    jobTitle: {
      type: String,
      required: [true, 'Job title/role is required'],
      trim: true,
      maxlength: [150, 'Job title cannot exceed 150 characters'],
    },
    jobDescription: {
      type: String,
      trim: true,
      default: '',
    },
    eligibility: {
      department: { type: String, default: 'Any' },
      minGraduationYear: { type: Number, default: null },
      maxGraduationYear: { type: Number, default: null },
      minimumPercentage: { type: Number, default: 0 },
      additionalNotes: { type: String, default: '' },
    },
    selectedPapers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'QuestionPaper',
        required: true,
      },
    ],
    totalDuration: {
      type: Number, // in minutes
      required: [true, 'Total exam duration is required'],
      min: [1, 'Duration must be at least 1 minute'],
    },
    passingCriteria: {
      minPercentage: { type: Number, default: 50 },
      minMarks: { type: Number, default: 0 },
    },
    maxAttempts: {
      type: Number,
      default: 1,
      min: [1, 'Maximum attempts must be at least 1'],
    },
    driveCode: {
      type: String,
      required: [true, 'Drive code is required'],
      unique: true,
      uppercase: true,
      trim: true,
      index: true,
    },
    status: {
      type: String,
      enum: ['draft', 'scheduled', 'active', 'closed'],
      default: 'draft',
      index: true,
    },
    startDate: {
      type: Date,
      required: [true, 'Start date is required'],
    },
    endDate: {
      type: Date,
      required: [true, 'End date is required'],
    },
    examStartTime: {
      type: Date,
      default: null,
    },
    examEndTime: {
      type: Date,
      default: null,
    },
    stages: {
      type: [String],
      default: DEFAULT_STAGES,
    },
    isExamKeyPublished: {
      type: Boolean,
      default: false,
      index: true,
    },
    examKeyPublishedAt: {
      type: Date,
      default: null,
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

module.exports = mongoose.model('RecruitmentDrive', recruitmentDriveSchema);
module.exports.DEFAULT_STAGES = DEFAULT_STAGES;

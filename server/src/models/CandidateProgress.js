const mongoose = require('mongoose');

const roundEvaluationSchema = new mongoose.Schema({
  stageName: {
    type: String,
    required: true,
  },
  status: {
    type: String,
    enum: ['pending', 'scheduled', 'cleared', 'rejected', 'on-hold'],
    default: 'pending',
  },
  interviewDate: {
    type: Date,
    default: null,
  },
  interviewTime: {
    type: String,
    default: '',
  },
  locationOrLink: {
    type: String,
    default: '',
  },
  score: {
    type: Number,
    default: null,
  },
  remarks: {
    type: String, // internal admin remarks
    default: '',
  },
  candidateNotes: {
    type: String, // notes visible to candidate (e.g. preparation guidelines)
    default: '',
  },
  evaluatedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
    default: null,
  },
  evaluatedAt: {
    type: Date,
    default: null,
  },
});

const stageHistorySchema = new mongoose.Schema({
  fromStage: String,
  toStage: String,
  status: String,
  changedBy: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'User',
  },
  changedAt: {
    type: Date,
    default: Date.now,
  },
  reason: {
    type: String,
    default: '',
  },
});

const candidateProgressSchema = new mongoose.Schema(
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
    currentStage: {
      type: String,
      default: 'Examination',
      index: true,
    },
    overallStatus: {
      type: String,
      enum: ['pending', 'shortlisted', 'on-hold', 'selected', 'rejected'],
      default: 'pending',
      index: true,
    },
    roundEvaluations: [roundEvaluationSchema],
    stageHistory: [stageHistorySchema],
    updatedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  },
  {
    timestamps: true,
  }
);

// One progress record per student per drive
candidateProgressSchema.index({ student: 1, drive: 1 }, { unique: true });

module.exports = mongoose.model('CandidateProgress', candidateProgressSchema);

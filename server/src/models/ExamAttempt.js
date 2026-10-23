const mongoose = require('mongoose');

const examAttemptSchema = new mongoose.Schema(
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
    questionPaper: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'QuestionPaper',
      default: null,
    },
    questionPapers: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'QuestionPaper',
      },
    ],
    paperSnapshot: {
      title: String,
      duration: Number,
      totalMarks: Number,
      passingMarks: Number,
      negativeMarking: {
        enabled: Boolean,
        perQuestionPenalty: Number,
      },
      papers: [
        {
          _id: mongoose.Schema.Types.ObjectId,
          title: String,
          subjectName: String,
          subjectCode: String,
          questionCount: Number,
          totalMarks: Number,
        },
      ],
      questions: [
        {
          _id: mongoose.Schema.Types.ObjectId,
          questionText: String,
          options: [String],
          correctAnswer: Number, // saved in snapshot for secure backend evaluation
          marks: Number,
          negativeMarks: Number,
          order: Number,
          paperId: mongoose.Schema.Types.ObjectId,
          paperTitle: String,
          subjectName: String,
          subjectCode: String,
          explanation: String,
        },
      ],
    },
    attemptNumber: {
      type: Number,
      required: true,
      default: 1,
    },
    startTime: {
      type: Date,
      required: true,
      default: Date.now,
    },
    deadline: {
      type: Date,
      required: true,
    },
    answers: [
      {
        questionId: {
          type: mongoose.Schema.Types.ObjectId,
          required: true,
        },
        selectedOption: {
          type: Number, // index 0, 1, 2, 3, or -1 for cleared
          default: null,
        },
        answeredAt: {
          type: Date,
          default: Date.now,
        },
      },
    ],
    score: {
      type: Number,
      default: 0,
    },
    totalMarks: {
      type: Number,
      default: 0,
    },
    percentage: {
      type: Number,
      default: 0,
    },
    isPassed: {
      type: Boolean,
      default: false,
    },
    submissionStatus: {
      type: String,
      enum: ['in-progress', 'submitted', 'auto-submitted', 'expired'],
      default: 'in-progress',
      index: true,
    },
    submittedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

examAttemptSchema.index({ student: 1, drive: 1, attemptNumber: 1 });
examAttemptSchema.index({ drive: 1, submissionStatus: 1 });

module.exports = mongoose.model('ExamAttempt', examAttemptSchema);

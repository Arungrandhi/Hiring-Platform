const mongoose = require('mongoose');

const questionSchema = new mongoose.Schema({
  questionText: {
    type: String,
    required: [true, 'Question text is required'],
    trim: true,
  },
  options: {
    type: [String],
    validate: {
      validator: function (val) {
        return Array.isArray(val) && val.length >= 2;
      },
      message: 'Question must have at least 2 options (standard is 4)',
    },
    required: true,
  },
  correctAnswer: {
    type: Number, // index 0, 1, 2, 3 corresponding to options array
    required: [true, 'Correct option index is required'],
    min: [0, 'Index cannot be negative'],
  },
  marks: {
    type: Number,
    required: [true, 'Marks are required'],
    default: 1,
    min: [0.5, 'Marks must be at least 0.5'],
  },
  negativeMarks: {
    type: Number,
    default: 0,
    min: [0, 'Negative marks cannot be negative value'],
  },
  explanation: {
    type: String,
    trim: true,
    default: '',
  },
  order: {
    type: Number,
    default: 1,
  },
});

const questionPaperSchema = new mongoose.Schema(
  {
    title: {
      type: String,
      required: [true, 'Paper title is required'],
      trim: true,
      maxlength: [200, 'Title cannot exceed 200 characters'],
      index: true,
    },
    subject: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Subject',
      required: [true, 'Subject reference is required'],
      index: true,
    },
    instructions: {
      type: String,
      trim: true,
      default: 'Read all questions carefully. Choose the best answer. Timed examination.',
    },
    difficulty: {
      type: String,
      enum: ['Easy', 'Medium', 'Hard'],
      default: 'Medium',
    },
    duration: {
      type: Number, // in minutes
      required: [true, 'Duration in minutes is required'],
      min: [1, 'Duration must be at least 1 minute'],
      default: 30,
    },
    totalMarks: {
      type: Number,
      default: 0,
    },
    passingMarks: {
      type: Number,
      required: [true, 'Passing marks are required'],
      default: 0,
    },
    negativeMarking: {
      enabled: { type: Boolean, default: false },
      perQuestionPenalty: { type: Number, default: 0 },
    },
    questions: [questionSchema],
    status: {
      type: String,
      enum: ['draft', 'published', 'archived'],
      default: 'draft',
      index: true,
    },
    version: {
      type: Number,
      default: 1,
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

// Pre-save hook to calculate totalMarks if questions are present
questionPaperSchema.pre('save', function (next) {
  if (this.questions && this.questions.length > 0) {
    this.totalMarks = this.questions.reduce((sum, q) => sum + (q.marks || 0), 0);
  }
  next();
});

module.exports = mongoose.model('QuestionPaper', questionPaperSchema);

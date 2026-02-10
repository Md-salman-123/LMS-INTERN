import mongoose from 'mongoose';

const testCaseSchema = new mongoose.Schema({
  input: { type: String, default: '' },
  expectedOutput: { type: String, required: true },
  isHidden: { type: Boolean, default: false },
  points: { type: Number, default: 1 },
});

const assignmentSchema = new mongoose.Schema(
  {
    course: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Course',
      required: true,
    },
    title: {
      type: String,
      required: [true, 'Please provide an assignment title'],
      trim: true,
    },
    description: {
      type: String,
      required: true,
    },
    instructions: String,
    // File attachments for assignment description
    attachments: [
      {
        type: {
          type: String,
          enum: ['file', 'link'],
        },
        url: String,
        name: String,
        size: Number,
      },
    ],
    // Submission settings
    dueDate: {
      type: Date,
      required: true,
    },
    allowLateSubmission: {
      type: Boolean,
      default: false,
    },
    latePenalty: {
      type: Number, // Percentage penalty per day late
      default: 0,
    },
    maxFileSize: {
      type: Number, // in MB
      default: 10,
    },
    allowedFileTypes: [String], // e.g., ['pdf', 'doc', 'docx']
    maxSubmissions: {
      type: Number,
      default: 1,
    },
    // Grading
    totalPoints: {
      type: Number,
      required: true,
      default: 100,
    },
    passingScore: {
      type: Number,
      default: 70,
    },
    gradingType: {
      type: String,
      enum: ['points', 'percentage', 'letter'],
      default: 'points',
    },
    rubric: [
      {
        criterion: String,
        points: Number,
        description: String,
      },
    ],
    testCases: [testCaseSchema],
    status: {
      type: String,
      enum: ['draft', 'published', 'closed'],
      default: 'draft',
    },
    createdBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      required: true,
    },
  },
  {
    timestamps: true,
  }
);

const Assignment = mongoose.model('Assignment', assignmentSchema);

export default Assignment;



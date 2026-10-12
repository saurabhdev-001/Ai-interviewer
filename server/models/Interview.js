import mongoose from "mongoose";

/**
 * Subdocument schema representing an individual interview question and its evaluation.
 */
const questionSchema = new mongoose.Schema(
  {
    question: {
      type: String,
      required: [true, "Question text is required"],
      trim: true,
    },
    userAnswer: {
      type: String,
      default: "",
      trim: true,
    },
    score: {
      type: Number,
      min: [0, "Question score cannot be negative"],
      max: [10, "Question score cannot exceed 10"],
      default: undefined,
    },
    accuracy: {
      type: String,
      enum: {
        values: ["High", "Medium", "Low", "None"],
        message: "Accuracy must be one of: High, Medium, Low, None",
      },
      default: undefined,
    },
    feedback: {
      type: String,
      default: "",
      trim: true,
    },
  },
  { _id: true }
);

/**
 * Interview document schema representing an interview session with 5 questions.
 */
const interviewSchema = new mongoose.Schema(
  {
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "User",
      required: [true, "userId is required"],
    },
    role: {
      type: String,
      required: [true, "Job role is required"],
      trim: true,
    },
    experience: {
      type: String,
      required: [true, "Experience level is required"],
      trim: true,
    },
    interviewType: {
      type: String,
      required: [true, "interviewType is required"],
      enum: {
        values: ["technical", "hr"],
        message: "interviewType must be either 'technical' or 'hr'",
      },
      trim: true,
      lowercase: true,
    },
    resumeSkills: {
      type: [String],
      default: [],
    },
    questions: {
      type: [questionSchema],
      required: [true, "Questions array is required"],
      validate: {
        validator: function (val) {
          return Array.isArray(val) && val.length === 5;
        },
        message: "An interview must contain exactly 5 questions",
      },
    },
    overallScore: {
      type: Number,
      min: [0, "overallScore cannot be negative"],
      max: [10, "overallScore cannot exceed 10"],
      default: undefined,
    },
    summaryFeedback: {
      type: String,
      default: "",
      trim: true,
    },
    status: {
      type: String,
      enum: {
        values: ["in_progress", "completed"],
        message: "status must be either 'in_progress' or 'completed'",
      },
      default: "in_progress",
      trim: true,
    },
  },
  { timestamps: true }
);

const Interview = mongoose.models.Interview || mongoose.model("Interview", interviewSchema);

export default Interview;

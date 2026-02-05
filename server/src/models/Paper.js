import mongoose from 'mongoose';

const SectionSchema = new mongoose.Schema({
  name: { type: String, required: true },
  marks: { type: Number, required: true },
  idealAnswer: { type: String }, // For answer key
  keywords: [String], // Important keywords
  concepts: [String] // Key concepts
}, { _id: false });

const PaperSchema = new mongoose.Schema({
  studentId: {
    type: String, // ID of the student this paper belongs to (if assigned)
    default: null
  },
  userId: {
    type: String,
    required: true
  },
  subject: {
    type: String,
    required: true
  },
  fileName: {
    type: String,
    required: true
  },
  originalFileName: {
    type: String,
    required: true
  },
  filePath: {
    type: String,
    required: true
  },
  processedFilePath: String,
  sections: [SectionSchema],
  totalMarks: {
    type: Number,
    required: true
  },
  gradingSettings: {
    autoDistribute: { type: Boolean, default: true },
    includeSubsections: { type: Boolean, default: false },
    negativeMarking: { type: Boolean, default: false },
    passingPercentage: { type: Number, default: 40 }
  },
  status: {
    type: String,
    enum: ['uploaded', 'processing', 'analyzed', 'error'],
    default: 'uploaded'
  },
  processingProgress: {
    type: Number,
    default: 0
  },
  processingSteps: [{
    name: String,
    status: {
      type: String,
      enum: ['pending', 'in-progress', 'completed', 'failed'],
      default: 'pending'
    },
    timestamp: Date
  }],
  analysisResults: {
    extractedText: String,
    handwritingScore: Number,
    readabilityScore: Number,
    estimatedTime: Number,
    wordCount: Number,
    sectionMarks: Object,
    overallFeedback: String,
    accuracyScore: Number,
    detailedAnalysis: mongoose.Schema.Types.Mixed // Stores the full structured AI grading response
  }
}, { timestamps: true });

const Paper = mongoose.model('Paper', PaperSchema);

export default Paper;

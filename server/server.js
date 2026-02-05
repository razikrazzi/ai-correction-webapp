// server.js
const express = require('express');
const cors = require('cors');
const multer = require('multer');
const path = require('path');
const fs = require('fs');
const mongoose = require('mongoose');
require('dotenv').config();

const app = express();
const PORT = process.env.PORT || 5000;

// Middleware
app.use(cors());
app.use(express.json());
app.use('/uploads', express.static('uploads'));

// MongoDB Connection
mongoose.connect(process.env.MONGODB_URI || 'mongodb+srv://razikrazi932005_db_user:CHbeWjV5AiTZi1WP@cluster0.dimzkj1.mongodb.net/mern-auth?retryWrites=true&w=majority', {
  useNewUrlParser: true,
  useUnifiedTopology: true,
});

// File Upload Configuration
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, 'uploads/');
  },
  filename: function (req, file, cb) {
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, file.fieldname + '-' + uniqueSuffix + path.extname(file.originalname));
  }
});

const upload = multer({ 
  storage: storage,
  limits: { fileSize: 10 * 1024 * 1024 }, // 10MB limit
  fileFilter: (req, file, cb) => {
    const allowedTypes = /jpeg|jpg|png|pdf|doc|docx/;
    const extname = allowedTypes.test(path.extname(file.originalname).toLowerCase());
    const mimetype = allowedTypes.test(file.mimetype);
    
    if (mimetype && extname) {
      return cb(null, true);
    } else {
      cb(new Error('Only image, PDF, and document files are allowed'));
    }
  }
});

// Models
const PaperSchema = new mongoose.Schema({
  userId: String,
  subject: String,
  fileName: String,
  originalFileName: String,
  filePath: String,
  processedFilePath: String,
  sections: [{
    name: String,
    marks: Number,
    questions: [{
      questionNumber: String,
      marks: Number,
      text: String,
      aiAnalysis: {
        keywords: [String],
        score: Number,
        feedback: String,
        confidence: Number
      }
    }]
  }],
  totalMarks: Number,
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
    status: String,
    timestamp: Date
  }],
  analysisResults: {
    extractedText: String,
    handwritingScore: Number,
    readabilityScore: Number,
    estimatedTime: Number,
    wordCount: Number,
    sectionMarks: Object,
    overallFeedback: String
  },
  createdAt: {
    type: Date,
    default: Date.now
  }
});

const Paper = mongoose.model('Paper', PaperSchema);

// Simulated AI Processing Functions
const simulateProcessingSteps = () => {
  return [
    { name: 'Uploading File', status: 'completed', timestamp: new Date() },
    { name: 'Image Preprocessing', status: 'completed', timestamp: new Date() },
    { name: 'Handwriting Detection', status: 'in-progress', timestamp: new Date() },
    { name: 'Text Extraction (OCR)', status: 'pending', timestamp: null },
    { name: 'Answer Analysis', status: 'pending', timestamp: null },
    { name: 'Section-wise Grading', status: 'pending', timestamp: null },
    { name: 'Finalizing Results', status: 'pending', timestamp: null }
  ];
};

// Routes

// Health check
app.get('/api/health', (req, res) => {
  res.json({ status: 'OK', message: 'Paper Analysis API is running' });
});

// Upload student papers
app.post('/api/upload/student-papers', upload.array('files', 10), async (req, res) => {
  try {
    const { userId, subject, sections, totalMarks, gradingSettings } = req.body;
    const files = req.files;

    if (!files || files.length === 0) {
      return res.status(400).json({ message: 'No files uploaded' });
    }

    const savedPapers = [];

    for (const file of files) {
      const paper = new Paper({
        userId,
        subject,
        fileName: file.filename,
        originalFileName: file.originalname,
        filePath: file.path,
        sections: JSON.parse(sections),
        totalMarks: parseInt(totalMarks),
        status: 'uploaded',
        processingSteps: simulateProcessingSteps()
      });

      await paper.save();
      savedPapers.push(paper);

      // Start background processing
      processPaperInBackground(paper._id);
    }

    res.status(200).json({
      message: 'Files uploaded successfully',
      papers: savedPapers.map(p => ({
        id: p._id,
        fileName: p.originalFileName,
        status: p.status,
        progress: p.processingProgress
      }))
    });

  } catch (error) {
    console.error('Upload error:', error);
    res.status(500).json({ message: 'Error uploading files', error: error.message });
  }
});

// Get paper processing status
app.get('/api/papers/:paperId/status', async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.paperId);
    
    if (!paper) {
      return res.status(404).json({ message: 'Paper not found' });
    }

    res.json({
      id: paper._id,
      fileName: paper.originalFileName,
      status: paper.status,
      progress: paper.processingProgress,
      steps: paper.processingSteps,
      analysisResults: paper.analysisResults,
      processedFilePath: paper.processedFilePath,
      createdAt: paper.createdAt
    });
  } catch (error) {
    res.status(500).json({ message: 'Error fetching paper status', error: error.message });
  }
});

// Get all papers for a user
app.get('/api/users/:userId/papers', async (req, res) => {
  try {
    const papers = await Paper.find({ userId: req.params.userId })
      .sort({ createdAt: -1 })
      .select('originalFileName subject status processingProgress createdAt analysisResults.totalMarks');

    res.json(papers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching papers', error: error.message });
  }
});

// Background processing simulation
async function processPaperInBackground(paperId) {
  try {
    const paper = await Paper.findById(paperId);
    
    if (!paper) return;

    // Update status to processing
    paper.status = 'processing';
    paper.processingProgress = 10;
    await paper.save();

    // Simulate processing steps
    const steps = [
      { name: 'Image Preprocessing', duration: 2000, progress: 20 },
      { name: 'Handwriting Detection', duration: 3000, progress: 35 },
      { name: 'Text Extraction (OCR)', duration: 4000, progress: 50 },
      { name: 'Answer Analysis', duration: 5000, progress: 70 },
      { name: 'Section-wise Grading', duration: 3000, progress: 85 },
      { name: 'Finalizing Results', duration: 2000, progress: 100 }
    ];

    for (let i = 0; i < steps.length; i++) {
      const step = steps[i];
      
      // Update step status
      paper.processingSteps[i + 1].status = 'in-progress';
      paper.processingSteps[i + 1].timestamp = new Date();
      await paper.save();

      // Simulate processing time
      await new Promise(resolve => setTimeout(resolve, step.duration));

      // Update progress
      paper.processingProgress = step.progress;
      paper.processingSteps[i + 1].status = 'completed';
      await paper.save();

      // Emit progress update (in real app, use WebSockets)
      // socket.emit('processing-progress', { paperId, progress: step.progress });
    }

    // Generate mock analysis results
    paper.analysisResults = {
      extractedText: `This is a simulated extracted text from the handwritten paper.\n\nSection A:\nQ1. The answer discusses the fundamental principles...\nQ2. The student demonstrates understanding of...\n\nSection B:\nQ3. Detailed analysis with appropriate examples...`,
      handwritingScore: Math.floor(Math.random() * 30) + 70, // 70-100
      readabilityScore: Math.floor(Math.random() * 30) + 70,
      estimatedTime: Math.floor(Math.random() * 10) + 5, // 5-15 minutes
      wordCount: Math.floor(Math.random() * 500) + 500,
      sectionMarks: paper.sections.reduce((acc, section, index) => {
        acc[section.name] = Math.floor(Math.random() * section.marks * 0.8) + section.marks * 0.2;
        return acc;
      }, {}),
      overallFeedback: 'Good attempt. Handwriting is clear and answers are well-structured. Shows understanding of key concepts.'
    };

    // Create processed file path (simulated)
    paper.processedFilePath = `uploads/processed/${paper.fileName}-processed.json`;
    
    // Update final status
    paper.status = 'analyzed';
    paper.processingProgress = 100;
    
    await paper.save();

    console.log(`Paper ${paperId} processing completed`);

  } catch (error) {
    console.error('Background processing error:', error);
    
    // Update paper status to error
    await Paper.findByIdAndUpdate(paperId, {
      status: 'error',
      processingSteps: paper.processingSteps.map(step => 
        step.status === 'in-progress' ? { ...step, status: 'failed' } : step
      )
    });
  }
}

// Get processed file (but don't allow download)
app.get('/api/papers/:paperId/processed-file', async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.paperId);
    
    if (!paper) {
      return res.status(404).json({ message: 'Paper not found' });
    }

    if (paper.status !== 'analyzed') {
      return res.status(400).json({ message: 'Paper processing not complete' });
    }

    // In real implementation, you would return the processed data
    // For security, we only return metadata, not the actual file
    res.json({
      message: 'File processed successfully',
      metadata: {
        fileName: paper.originalFileName,
        processedAt: new Date(),
        analysisComplete: true,
        canBeUsedForGrading: true
      },
      analysisSummary: {
        handwritingScore: paper.analysisResults.handwritingScore,
        readabilityScore: paper.analysisResults.readabilityScore,
        wordCount: paper.analysisResults.wordCount,
        estimatedGradingTime: paper.analysisResults.estimatedTime
      }
    });

  } catch (error) {
    res.status(500).json({ message: 'Error fetching processed file', error: error.message });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
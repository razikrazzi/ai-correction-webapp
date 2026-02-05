import Paper from '../models/Paper.js';
import { getProcessingSteps } from '../services/paperService.js';
import { processFileWithGroq } from '../services/groqService.js';
import fs from 'fs/promises';
import fsSync from 'fs';
import path from 'path';

// Helper function to update progress with batched saves (reduces DB writes)
const updateProgress = async (paper, progress, stepIndex, status) => {
  paper.processingProgress = progress;
  if (stepIndex >= 0 && paper.processingSteps[stepIndex]) {
    paper.processingSteps[stepIndex].status = status;
    paper.processingSteps[stepIndex].timestamp = new Date();
  }
  // Save at critical milestones (10%, 20%, 30%, ..., 100%) or when status changes, or at step transitions
  const shouldSave = progress % 10 === 0 || status === 'completed' || status === 'failed' || status === 'in-progress';
  if (shouldSave) {
    try {
      await paper.save();
      console.log(`Paper ${paper._id} progress updated: ${progress}% - Step ${stepIndex >= 0 ? stepIndex : 'N/A'} - ${status}`);
    } catch (saveError) {
      console.error(`Error saving progress for paper ${paper._id}:`, saveError);
      throw saveError;
    }
  }
};

// Process paper with Google Cloud Vision API
const processPaperInBackground = async (paperId) => {
  try {
    console.log(`Starting background processing for paper ${paperId}`);
    const paper = await Paper.findById(paperId);
    if (!paper) {
      console.error(`Paper ${paperId} not found`);
      return;
    }

    // Update status to processing (initial save)
    paper.status = 'processing';
    await updateProgress(paper, 10, 0, 'completed');
    console.log(`Paper ${paperId}: Upload step completed`);

    // Step 1: Image Preprocessing
    await updateProgress(paper, 20, 1, 'in-progress');
    console.log(`Paper ${paperId}: Starting image preprocessing`);

    // Check if file exists (async check)
    if (paper.filePath === 'config-only') {
      throw new Error('File not found for processing');
    }
    try {
      await fs.access(paper.filePath);
      console.log(`Paper ${paperId}: File found at ${paper.filePath}`);
    } catch (error) {
      console.error(`Paper ${paperId}: File access error:`, error);
      throw new Error(`File not found for processing: ${paper.filePath}`);
    }

    // Mark preprocessing as completed
    await updateProgress(paper, 20, 1, 'completed');
    console.log(`Paper ${paperId}: Image preprocessing completed`);

    // Step 2: Text Extraction (OCR) using Groq Vision
    await updateProgress(paper, 50, 2, 'in-progress');
    console.log(`Paper ${paperId}: Starting OCR processing with Groq Vision`);

    let ocrResults;
    try {
      console.log(`Paper ${paperId}: Calling Groq for ${paper.filePath}`);
      ocrResults = await processFileWithGroq(paper.filePath);
      console.log(`Paper ${paperId}: Groq extraction completed - extracted ${ocrResults.wordCount} words`);
    } catch (ocrError) {
      console.error(`Paper ${paperId}: Groq OCR error:`, ocrError);
      // Update step to failed before throwing
      await updateProgress(paper, 50, 2, 'failed');
      throw new Error(`OCR processing failed: ${ocrError.message}`);
    }

    // Mark OCR as completed
    await updateProgress(paper, 50, 2, 'completed');
    console.log(`Paper ${paperId}: OCR step completed`);

    // Step 3: Saving Results
    // Previously Step 5, now Step 3 (0-indexed)
    await updateProgress(paper, 90, 3, 'in-progress');
    console.log(`Paper ${paperId}: Starting Saving Results (Step 3)`);

    // Calculate estimated grading time (minutes) based on word count
    const estimatedTime = Math.max(5, Math.ceil(ocrResults.wordCount / 100));

    // Generate analysis results
    // CRITICAL: Ensure detailedAnalysis is null to prevent grading
    paper.analysisResults = {
      extractedText: ocrResults.extractedText,
      handwritingScore: Math.round(ocrResults.handwritingScore),
      readabilityScore: Math.round(ocrResults.readabilityScore),
      estimatedTime: estimatedTime,
      wordCount: ocrResults.wordCount,
      estimatedTime: estimatedTime,
      wordCount: ocrResults.wordCount,
      sectionMarks: {}, // No section marks
      overallFeedback: "Text extraction complete. Evaluation pending.", // Simplified feedback
      accuracyScore: Math.round(ocrResults.confidence),
      detailedAnalysis: null
    };

    // Create processed file (async)
    const processedDir = path.join(process.cwd(), 'uploads', 'processed');
    console.log(`Paper ${paperId}: Ensuring directory exists: ${processedDir}`);
    try {
      if (!fsSync.existsSync(processedDir)) {
        await fs.mkdir(processedDir, { recursive: true });
      }
    } catch (fsError) {
      console.error(`Paper ${paperId}: Error creating dir: ${fsError.message}`);
      // Don't throw, try to continue or save elsewhere? 
      // If we can't save the file, we should probably fail, but let's log it.
      throw fsError;
    }

    const processedFileName = `${paperId}_processed.json`;
    const processedFilePath = path.join(processedDir, processedFileName);
    console.log(`Paper ${paperId}: Saving processed file to ${processedFilePath}`);

    const processedData = {
      paperId: paper._id,
      originalFileName: paper.originalFileName,
      extractedText: ocrResults.extractedText,
      sections: paper.sections,
      analysisResults: paper.analysisResults,
      processedAt: new Date(),
      ocrResults: {
        provider: 'groq',
        confidence: ocrResults.confidence,
        wordCount: ocrResults.wordCount,
        pages: ocrResults.pages,
        hasHandwriting: ocrResults.hasHandwriting,
        model: ocrResults.raw?.model
      }
    };

    await fs.writeFile(processedFilePath, JSON.stringify(processedData, null, 2));
    console.log(`Paper ${paperId}: File saved successfully.`);

    paper.processedFilePath = processedFilePath;
    paper.status = 'analyzed';

    // Mark all steps as completed - explicitly iterate and ensure all pending are marked
    paper.processingSteps.forEach((step, idx) => {
      console.log(`Paper ${paperId}: Marking step ${idx} (${step.name}) as completed`);
      step.status = 'completed';
      if (!step.timestamp) step.timestamp = new Date();
    });

    // Final save with 100% progress
    console.log(`Paper ${paperId}: Performing final DB save with status='analyzed'`);
    await updateProgress(paper, 100, -1, 'completed');
    console.log(`Paper ${paperId}: Final save complete.`);

    console.log(`Paper ${paperId} processing completed using Groq Vision API.`);
  } catch (error) {
    console.error(`Background processing error for paper ${paperId}:`, error);
    console.error('Error stack:', error.stack);

    // Update paper status to error
    try {
      const paper = await Paper.findById(paperId);
      if (paper) {
        paper.status = 'error';
        paper.processingProgress = paper.processingProgress || 0;
        paper.processingSteps.forEach(step => {
          if (step.status === 'in-progress') {
            step.status = 'failed';
            step.timestamp = new Date();
          }
        });
        await paper.save();
        console.log(`Paper ${paperId} status updated to error`);
      } else {
        console.error(`Paper ${paperId} not found when trying to update error status`);
      }
    } catch (saveError) {
      console.error(`Failed to save error status for paper ${paperId}:`, saveError);
    }
  }
};

// Upload student papers
export const uploadPapers = async (req, res) => {
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
        gradingSettings: JSON.parse(gradingSettings),
        status: 'uploaded',
        processingSteps: getProcessingSteps()
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
};

// Save paper configuration (without files)
export const savePaperConfig = async (req, res) => {
  try {
    const { userId, subject, sections, totalMarks, gradingSettings } = req.body;

    if (!userId || !subject || !sections || !totalMarks) {
      return res.status(400).json({ message: 'Missing required fields' });
    }

    // Create a paper record without file (for saving configuration)
    const paper = new Paper({
      userId,
      subject,
      fileName: 'config-only',
      originalFileName: `${subject}-config`,
      filePath: 'config-only',
      sections: Array.isArray(sections) ? sections : JSON.parse(sections),
      totalMarks: parseInt(totalMarks),
      gradingSettings: gradingSettings || {
        autoDistribute: true,
        includeSubsections: false,
        negativeMarking: false,
        passingPercentage: 40
      },
      status: 'uploaded',
      processingSteps: getProcessingSteps()
    });

    await paper.save();

    res.status(201).json({
      message: 'Paper configuration saved successfully',
      paper: {
        id: paper._id,
        subject: paper.subject,
        sections: paper.sections,
        totalMarks: paper.totalMarks,
        gradingSettings: paper.gradingSettings
      }
    });
  } catch (error) {
    console.error('Save config error:', error);
    res.status(500).json({ message: 'Error saving configuration', error: error.message });
  }
};

// Get paper processing status
export const getPaperStatus = async (req, res) => {
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
};

// Get all papers for a user
export const getUserPapers = async (req, res) => {
  try {
    const papers = await Paper.find({
      $or: [
        { userId: req.params.userId },
        { studentId: req.params.userId }
      ]
    })
      .sort({ createdAt: -1 })
      .select('originalFileName subject status processingProgress createdAt updatedAt analysisResults sections totalMarks gradingSettings studentId userId');

    res.json(papers);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching papers', error: error.message });
  }
};

// Delete a paper
export const deletePaper = async (req, res) => {
  try {
    const paper = await Paper.findById(req.params.paperId);

    if (!paper) {
      return res.status(404).json({ message: 'Paper not found' });
    }

    // Delete files from storage (async)
    if (paper.filePath && paper.filePath !== 'config-only') {
      try {
        await fs.unlink(paper.filePath);
      } catch (error) {
        console.warn('Error deleting original file:', error.message);
      }
    }
    if (paper.processedFilePath) {
      try {
        await fs.unlink(paper.processedFilePath);
      } catch (error) {
        console.warn('Error deleting processed file:', error.message);
      }
    }

    await Paper.findByIdAndDelete(req.params.paperId);

    res.json({ message: 'Paper deleted successfully' });
  } catch (error) {
    res.status(500).json({ message: 'Error deleting paper', error: error.message });
  }
};


// Save grading result
export const saveGradingResult = async (req, res) => {
  try {
    const { paperId } = req.params;
    const { result, studentId } = req.body;

    const paper = await Paper.findById(paperId);
    if (!paper) {
      return res.status(404).json({ message: 'Paper not found' });
    }

    // Update paper with grading results
    paper.analysisResults.detailedAnalysis = result;
    if (studentId) {
      paper.studentId = studentId;
    }

    paper.status = 'analyzed';
    paper.markModified('analysisResults');

    await paper.save();

    res.json({ message: 'Grading result saved successfully', paper });
  } catch (error) {
    console.error('Error saving grading result:', error);
    res.status(500).json({ message: 'Error saving grading result', error: error.message });
  }
};

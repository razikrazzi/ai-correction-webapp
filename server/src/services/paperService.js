import Paper from '../models/Paper.js';

export const getProcessingSteps = () => {
  return [
    { name: 'Uploading File', status: 'completed', timestamp: new Date() },
    { name: 'Image Preprocessing', status: 'pending', timestamp: null },
    { name: 'Text Extraction (OCR)', status: 'pending', timestamp: null },
    { name: 'Saving Results', status: 'pending', timestamp: null }
  ];
};

export const updateProcessingStep = async (paperId, stepIndex, status) => {
  const paper = await Paper.findById(paperId);
  if (!paper) return;

  paper.processingSteps[stepIndex].status = status;
  paper.processingSteps[stepIndex].timestamp = new Date();

  // Calculate progress
  const completedSteps = paper.processingSteps.filter(step => step.status === 'completed').length;
  paper.processingProgress = Math.round((completedSteps / paper.processingSteps.length) * 100);

  await paper.save();
  return paper;
};

export const generateAnalysisResults = (paper) => {
  return {
    extractedText: `This is simulated extracted text from ${paper.originalFileName}\n\nSection analysis completed.`,
    handwritingScore: Math.floor(Math.random() * 30) + 70, // 70-100
    readabilityScore: Math.floor(Math.random() * 30) + 70,
    estimatedTime: Math.floor(Math.random() * 10) + 5, // 5-15 minutes
    wordCount: Math.floor(Math.random() * 500) + 500,
    accuracyScore: Math.floor(Math.random() * 30) + 70,
    sectionMarks: paper.sections.reduce((acc, section) => {
      acc[section.name] = Math.floor(Math.random() * section.marks * 0.8) + section.marks * 0.2;
      return acc;
    }, {}),
    overallFeedback: 'Good attempt. Handwriting is clear and answers are well-structured. Shows understanding of key concepts.'
  };
};

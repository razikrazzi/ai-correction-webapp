import express from 'express';
import { evaluatePaperWithGroq } from '../services/groqService.js';

const router = express.Router();

router.post('/grade', async (req, res) => {
    try {
        // Adapt the request body to match what evaluatePaperWithGemini expects
        // geminiService expects (extractedText, paperConfig)
        // The current body likely has { subject, totalMarks, sections, answerKey, studentAnswers }
        // We need to map this.

        // Based on PreviousResult.jsx, the body is:
        // { subject, totalMarks, sections, answerKey, studentAnswers }

        // evaluatePaperWithGemini expects:
        // extractedText: string (The student's full answer text? Or does it handle section-wise?)
        // paperConfig: { sections, totalMarks, gradingSettings: { passingPercentage: 40, negativeMarking: false } }

        // The gemini service seems designed to take a single block of text and grade it against sections.
        // But the input here has `studentAnswers` as an object { "Section A": "text", "Section B": "text" }.

        // Let's combine the student answers into a single text block for Gemini, or update the service.
        // Or better, let's create a small adapter here.

        const { studentAnswers, sections, totalMarks, gradingSettings, gradingMode, aiOptions } = req.body;

        // Combine student answers
        let fullStudentText = "";
        if (typeof studentAnswers === 'object') {
            for (const [section, text] of Object.entries(studentAnswers)) {
                fullStudentText += `\n--- ${section} ---\n${text}\n`;
            }
        } else {
            fullStudentText = studentAnswers;
        }

        const { answerKey } = req.body; // Add answerKey to destructuring

        const paperConfig = {
            sections,
            totalMarks,
            gradingSettings: gradingSettings || { passingPercentage: 40, negativeMarking: false },
            gradingMode,
            aiOptions
        };

        const result = await evaluatePaperWithGroq(fullStudentText, answerKey, paperConfig);
        res.json(result);
    } catch (err) {
        console.error(err);
        res.status(500).json({ error: 'AI grading failed' });
    }
});

export default router;

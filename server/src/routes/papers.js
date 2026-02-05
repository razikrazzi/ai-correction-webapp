import express from 'express';
import { authRequired } from '../middleware/auth.js';
import { upload } from '../config/multerConfig.js';
import * as paperController from '../controllers/paperController.js';

const router = express.Router();

// Upload student papers (with files)
router.post('/upload/student-papers',
  authRequired,
  upload.array('files', 10),
  paperController.uploadPapers
);

// Save paper configuration (without files)
router.post('/save-config',
  authRequired,
  paperController.savePaperConfig
);

// Get all papers for a user (must come before :paperId routes)
router.get('/user/:userId',
  authRequired,
  paperController.getUserPapers
);

// Get paper processing status
router.get('/:paperId/status',
  authRequired,
  paperController.getPaperStatus
);

// Delete a paper
router.delete('/:paperId',
  authRequired,
  paperController.deletePaper
);

// Save grading result
router.put('/:paperId/result',
  authRequired,
  paperController.saveGradingResult
);

export default router;

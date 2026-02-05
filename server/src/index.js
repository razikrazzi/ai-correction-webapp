import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import connectDb from './lib/db.js';
import authRoutes from './routes/auth.js';
import paperRoutes from './routes/papers.js';
import gradingRoutes from './routes/grading.js';
import { ensureDefaultUsers } from './seed.js';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

dotenv.config({ path: process.env.ENV_PATH || '.env' });

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors({
  origin: process.env.CLIENT_URL || '*',
  credentials: true
}));
app.use(express.json());
app.use('/uploads', express.static(path.join(process.cwd(), 'uploads')));

app.get('/', (_, res) => {
  res.json({
    message: 'Answer Paper Correction API',
    version: '1.0.0',
    endpoints: {
      health: '/health',
      auth: {
        login: 'POST /api/auth/login',
        register: 'POST /api/auth/register',
        me: 'GET /api/auth/me (requires authentication)'
      },
      papers: {
        upload: 'POST /api/papers/upload/student-papers',
        saveConfig: 'POST /api/papers/save-config',
        getStatus: 'GET /api/papers/:paperId/status',
        getUserPapers: 'GET /api/papers/user/:userId',
        delete: 'DELETE /api/papers/:paperId'
      }
    }
  });
});

app.get('/health', (_, res) => {
  res.json({ ok: true, status: 'healthy' });
});

app.use('/api/auth', authRoutes);
app.use('/api/papers', paperRoutes);
app.use('/api/grading', gradingRoutes);

const start = async () => {
  try {
    await connectDb();
    await ensureDefaultUsers();
    app.listen(PORT, () => {
      console.log(`API running on http://localhost:${PORT}`);
    });
  } catch (err) {
    console.error('Failed to start server', err);
    process.exit(1);
  }
};

start();


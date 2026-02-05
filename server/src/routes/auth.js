import express from 'express';
import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import User from '../models/User.js';
import { authRequired } from '../middleware/auth.js';

const router = express.Router();

const signToken = (user) =>
  jwt.sign({ id: user._id, role: user.role, email: user.email }, process.env.JWT_SECRET || '', {
    expiresIn: '2h'
  });

// Info endpoint for auth routes
router.get('/', (_, res) => {
  res.json({
    message: 'Authentication API',
    endpoints: {
      login: {
        method: 'POST',
        path: '/api/auth/login',
        body: { email: 'string', password: 'string', role: 'teacher|student' },
        response: { token: 'string', user: { id: 'string', email: 'string', role: 'string' } }
      },
      register: {
        method: 'POST',
        path: '/api/auth/register',
        body: { email: 'string', password: 'string', role: 'teacher|student' },
        response: { token: 'string', user: { id: 'string', email: 'string', role: 'string' } }
      },
      me: {
        method: 'GET',
        path: '/api/auth/me',
        headers: { Authorization: 'Bearer <token>' },
        response: { user: { id: 'string', email: 'string', role: 'string' } }
      }
    },
    note: 'Login and register endpoints require POST requests with JSON body. Use a tool like Postman, curl, or your frontend app to test them.'
  });
});

router.get('/login', (_, res) => {
  res.status(405).json({
    message: 'Method not allowed',
    error: 'Login requires a POST request',
    usage: {
      method: 'POST',
      url: '/api/auth/login',
      body: {
        email: 'user@example.com',
        password: 'password123',
        role: 'teacher or student'
      }
    }
  });
});

router.post('/login', async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role) {
    return res.status(400).json({ message: 'Email, password and role are required' });
  }

  try {
    const normalizedEmail = email.toLowerCase().trim();
    const user = await User.findOne({ email: normalizedEmail, role });

    if (!user) {
      console.log(`Login attempt failed: User not found - email: ${normalizedEmail}, role: ${role}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const valid = await bcrypt.compare(password, user.password);
    if (!valid) {
      console.log(`Login attempt failed: Invalid password - email: ${normalizedEmail}, role: ${role}`);
      return res.status(401).json({ message: 'Invalid credentials' });
    }

    const token = signToken(user);
    console.log(`Login successful: ${normalizedEmail} (${role})`);
    res.json({ token, user: { id: user._id, email: user.email, role: user.role } });
  } catch (err) {
    console.error('Login error', err);
    res.status(500).json({ message: 'Internal error' });
  }
});

router.get('/register', (_, res) => {
  res.status(405).json({
    message: 'Method not allowed',
    error: 'Register requires a POST request',
    usage: {
      method: 'POST',
      url: '/api/auth/register',
      body: {
        email: 'user@example.com',
        password: 'password123',
        role: 'teacher or student'
      }
    }
  });
});

router.post('/register', async (req, res) => {
  const { email, password, role } = req.body;
  if (!email || !password || !role) {
    return res.status(400).json({ message: 'Email, password and role are required' });
  }
  if (!['teacher', 'student'].includes(role)) {
    return res.status(400).json({ message: 'Role must be teacher or student' });
  }

  try {
    const existing = await User.findOne({ email: email.toLowerCase(), role });
    if (existing) {
      return res.status(409).json({ message: 'Account already exists for this role' });
    }

    const hashed = await bcrypt.hash(password, 10);
    const created = await User.create({ email: email.toLowerCase(), password: hashed, role });
    const token = signToken(created);
    res.status(201).json({ token, user: { id: created._id, email: created.email, role: created.role } });
  } catch (err) {
    console.error('Register error', err);
    res.status(500).json({ message: 'Internal error' });
  }
});

router.get('/me', authRequired, (req, res) => {
  res.json({ user: { id: req.user._id, email: req.user.email, role: req.user.role } });
});

// Get all students (Teacher only)
router.get('/students', authRequired, async (req, res) => {
  try {
    if (req.user.role !== 'teacher') {
      return res.status(403).json({ message: 'Access denied' });
    }
    const students = await User.find({ role: 'student' }).select('email _id createdAt rollNumber');
    res.json(students);
  } catch (error) {
    res.status(500).json({ message: 'Error fetching students', error: error.message });
  }
});

export default router;


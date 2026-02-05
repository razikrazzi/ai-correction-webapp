import jwt from 'jsonwebtoken';
import User from '../models/User.js';

export const authRequired = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;

  if (!token) {
    return res.status(401).json({ message: 'Missing token' });
  }

  try {
    const payload = jwt.verify(token, process.env.JWT_SECRET || '');
    const user = await User.findById(payload.id).lean();
    if (!user) {
      return res.status(401).json({ message: 'Invalid user' });
    }
    req.user = user;
    next();
  } catch (err) {
    return res.status(401).json({ message: 'Invalid token' });
  }
};


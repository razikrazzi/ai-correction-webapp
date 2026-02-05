import mongoose from 'mongoose';

const userSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, lowercase: true, trim: true },
    password: { type: String, required: true },
    role: { type: String, enum: ['teacher', 'student'], required: true },
    rollNumber: { type: String, default: 'N/A' }
  },
  { timestamps: true }
);

// Compound unique index: same email can exist for different roles
userSchema.index({ email: 1, role: 1 }, { unique: true });

const User = mongoose.model('User', userSchema);

export default User;


import bcrypt from 'bcryptjs';
import User from './models/User.js';

const defaultUsers = [
  {
    role: 'teacher',
    email: process.env.TEACHER_EMAIL,
    password: process.env.TEACHER_PASSWORD
  },
  {
    role: 'student',
    email: process.env.STUDENT_EMAIL,
    password: process.env.STUDENT_PASSWORD
  }
];

// Sample data for seeding multiple users
export const sampleUsers = [
  // Teachers
  { role: 'teacher', email: 'teacher@example.com', password: 'teach123' },
  { role: 'teacher', email: 'prof.smith@university.edu', password: 'password123' },
  { role: 'teacher', email: 'dr.johnson@university.edu', password: 'password123' },
  { role: 'teacher', email: 'ms.williams@university.edu', password: 'password123' },
  
  // Students
  { role: 'student', email: 'student@example.com', password: 'stud123' },
  { role: 'student', email: 'alice.student@university.edu', password: 'password123' },
  { role: 'student', email: 'bob.student@university.edu', password: 'password123' },
  { role: 'student', email: 'charlie.student@university.edu', password: 'password123' },
  { role: 'student', email: 'diana.student@university.edu', password: 'password123' },
  { role: 'student', email: 'emma.student@university.edu', password: 'password123' },
  { role: 'student', email: 'frank.student@university.edu', password: 'password123' },
  { role: 'student', email: 'grace.student@university.edu', password: 'password123' },
];

export const ensureDefaultUsers = async () => {
  const missingConfig = defaultUsers.some((u) => !u.email || !u.password);
  if (missingConfig) {
    console.warn('Default user credentials not fully set; skipping seeding.');
    return;
  }

  for (const user of defaultUsers) {
    const existing = await User.findOne({ email: user.email.toLowerCase(), role: user.role });
    if (existing) continue;

    const hashed = await bcrypt.hash(user.password, 10);
    await User.create({ email: user.email.toLowerCase(), password: hashed, role: user.role });
    console.log(`Seeded ${user.role} account (${user.email})`);
  }
};

// Function to seed sample users
export const seedSampleUsers = async () => {
  console.log('Starting to seed sample users...');
  let created = 0;
  let skipped = 0;

  for (const user of sampleUsers) {
    const existing = await User.findOne({ email: user.email.toLowerCase(), role: user.role });
    if (existing) {
      skipped++;
      continue;
    }

    const hashed = await bcrypt.hash(user.password, 10);
    await User.create({ email: user.email.toLowerCase(), password: hashed, role: user.role });
    console.log(`✓ Created ${user.role}: ${user.email}`);
    created++;
  }

  console.log(`\nSeeding complete! Created: ${created}, Skipped (already exist): ${skipped}`);
  return { created, skipped };
};


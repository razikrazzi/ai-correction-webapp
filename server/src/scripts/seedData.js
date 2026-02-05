import dotenv from 'dotenv';
import connectDb from '../lib/db.js';
import { seedSampleUsers } from '../seed.js';

dotenv.config({ path: process.env.ENV_PATH || '.env' });

const runSeed = async () => {
  try {
    console.log('Connecting to database...');
    await connectDb();
    console.log('Database connected!\n');

    await seedSampleUsers();

    console.log('\n✓ Sample data seeding completed successfully!');
    process.exit(0);
  } catch (error) {
    console.error('✗ Error seeding data:', error);
    process.exit(1);
  }
};

runSeed();


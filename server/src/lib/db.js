import mongoose from 'mongoose';

const connectDb = async () => {
  const uri = process.env.MONGODB_URI;
  if (!uri) {
    throw new Error('MONGODB_URI is not set');
  }

  if (mongoose.connection.readyState === 1) {
    return mongoose.connection;
  }

  mongoose.set('strictQuery', true);
  
  try {
    await mongoose.connect(uri, {
      serverSelectionTimeoutMS: 5000,
    });
    console.log('Connected to MongoDB');
    return mongoose.connection;
  } catch (error) {
    if (error.message.includes('bad auth') || error.message.includes('authentication failed')) {
      console.error('MongoDB Authentication Error:');
      console.error('For MongoDB Atlas, update MONGODB_URI in .env to:');
      console.error('mongodb+srv://username:password@cluster.mongodb.net/database?retryWrites=true&w=majority');
      console.error('Replace username, password, cluster, and database with your Atlas credentials.');
      throw new Error('MongoDB authentication failed. Check your connection string and credentials.');
    }
    throw error;
  }
};

export default connectDb;


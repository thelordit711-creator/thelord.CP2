import mongoose from 'mongoose';

let isConnected = false;

export const connectDatabase = async (): Promise<void> => {
  if (isConnected || mongoose.connection.readyState === 1) {
    return;
  }

  try {
    const mongoUri = process.env.MONGODB_URI;
    if (!mongoUri) {
      throw new Error('MONGODB_URI environment variable is missing. Database connection aborted.');
    }
    
    mongoose.set('strictQuery', true);
    
    await mongoose.connect(mongoUri, {
      autoIndex: false,
      maxPoolSize: 10,
      serverSelectionTimeoutMS: 8000,
    });

    isConnected = true;
    console.log('🦁 [Database] MongoDB connected successfully');
  } catch (error) {
    console.error('❌ [Database] MongoDB connection error:', error);
    if (!process.env.VERCEL) {
      process.exit(1);
    }
  }
};


import mongoose from 'mongoose';

export const connectDatabase = async (): Promise<void> => {
  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb://localhost:27017/the_lord_of_crypto_cp';
    
    mongoose.set('strictQuery', true);
    
    await mongoose.connect(mongoUri, {
      autoIndex: true,
      maxPoolSize: 20,
      serverSelectionTimeoutMS: 5000,
    });

    console.log('🦁 [Database] MongoDB connected successfully');
  } catch (error) {
    console.error('❌ [Database] MongoDB connection error:', error);
    process.exit(1);
  }
};


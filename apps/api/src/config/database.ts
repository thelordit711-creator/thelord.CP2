import mongoose from 'mongoose';

let isConnected = false;

export const connectDatabase = async (): Promise<void> => {
  if (isConnected || mongoose.connection.readyState === 1) {
    return;
  }

  try {
    const mongoUri = process.env.MONGODB_URI || 'mongodb+srv://TheLordIT:TheLordIT@cluster0.uh1subp.mongodb.net/the_lord_of_crypto_cp';
    
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


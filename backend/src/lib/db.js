import mongoose from 'mongoose';

export const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    if(!process.env.MONGO_URI) throw new Error("MONGO_URI is not set in environment variables");
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  }catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1); // 1 STATUS FAILURE, 0 STATUS SUCCESS
  } 
};
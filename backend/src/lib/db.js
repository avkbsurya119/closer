import mongoose from 'mongoose';
import { ENV } from './env.js';

export const connectDB = async () => {
  try {
    const {MONGO_URI} = ENV;
    if(!MONGO_URI) throw new Error("MONGO_URI is not set in environment variables");
    const conn = await mongoose.connect(ENV.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  }catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1); // 1 STATUS FAILURE, 0 STATUS SUCCESS
  } 
};
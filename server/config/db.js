import mongoose from "mongoose";

const connectDB = async () => {
  try {
    const mongoURI = process.env.MONGO_URI;

    if (!mongoURI) {
      console.warn("⚠ MONGO_URI is not set in server/.env. Database connection skipped.");
      return null;
    }

    const conn = await mongoose.connect(mongoURI);
    console.log(`✓ MongoDB connected: ${conn.connection.host}`);
    return conn;
  } catch (error) {
    console.error(`✗ MongoDB connection failed: ${error.message}`);
    process.exit(1);
  }
};

export default connectDB;

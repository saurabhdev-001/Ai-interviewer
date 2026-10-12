import mongoose from "mongoose";

const connectDb = async () => {
  try {
    if (!process.env.MONGO_URI) {
      console.warn("⚠ MONGO_URI is not set in server/.env");
      return;
    }
    await mongoose.connect(process.env.MONGO_URI, {
      family: 4,
    });
    console.log("DataBase Connected");
  } catch (error) {
    console.error(`DataBase Error: ${error.message}`);
  }
};

export default connectDb;
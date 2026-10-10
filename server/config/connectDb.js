import mongoose from "mongoose";

const connectDb = async () => {
    try {
        await mongoose.connect(process.env.MONGO_URI , {
            family: 4
        });
        console.log("DataBase Connected");
    } catch (error) {
        console.log(`DataBase Error ${error}`);
    }
};
export default connectDb
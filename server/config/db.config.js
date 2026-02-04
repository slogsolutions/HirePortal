const mongoose = require("mongoose");
require("dotenv").config();
// console.log("",rocess.env.MONGO_URI);

console.log("DEV--->",process.env.MONGO_URI);

let mongoServer;

const connectDB = async () => {
  try {
    if (process.env.NODE_ENV === "test") {
      const { MongoMemoryServer } = require("mongodb-memory-server");

      mongoServer = await MongoMemoryServer.create();
      const uri = mongoServer.getUri();

      await mongoose.connect(uri);
      console.log("🧪 In-memory Mongo started");
      return;
    }

    await mongoose.connect(process.env.MONGO_URL);
    console.log("🌍 MongoDB Atlas connected");
  } catch (err) {
    console.error("DB Error", err);
    process.exit(1);
  }
};

module.exports = { connectDB };

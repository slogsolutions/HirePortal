
// ------------------------- and this  when file gets called 
// const mongoose = require('mongoose');

// require("dotenv").config();

// mongoose.connect(process.env.MONGO_URL,{ 
//     useNewUrlParser: true,
//     useUnifiedTopology: true
// });

// const db = mongoose.connection;

// db.on("connected",()=>{
//     console.log("Connection Established with DB")
// })
// db.on("disconnected",()=>{
//     console.log("Disconnected with DB")
// })
// db.on("error",(err)=>{
//     console.log("Error occurred with DB ",err)
// });

// module.exports = db;

//--------------this will not auto start only when real server gets starts when functions called ---------

const mongoose = require("mongoose");
require("dotenv").config();

let mongoServer = null;

/**
 * Connect to MongoDB
 * - Production → Atlas
 * - Jest / Playwright → In-memory Mongo
 */
const connectDB = async () => {
  try {
    // 🧪 TEST / E2E MODE
    if (process.env.NODE_ENV === "test") {
      const { MongoMemoryServer } = await import("mongodb-memory-server");

      mongoServer = await MongoMemoryServer.create();
      const uri = mongoServer.getUri();

      await mongoose.connect(uri);
      console.log("🧪 Connected to In-Memory MongoDB");
      return;
    }

    // 🌍 PRODUCTION / DEV
    if (!process.env.MONGO_URL) {
      throw new Error("MONGO_URL not defined");
    }

    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });

    console.log("🌍 Connected to MongoDB Atlas");
  } catch (err) {
    console.error("❌ DB Connection Error:", err);
    process.exit(1);
  }
};

/**
 * Cleanup database after tests
 */
const closeDB = async () => {
  try {
    await mongoose.disconnect();

    if (mongoServer) {
      await mongoServer.stop();
      mongoServer = null;
    }
  } catch (e) {
    console.error("DB Close Error", e);
  }
};

module.exports = {
  connectDB,
  closeDB,
  mongoose,
};


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

const connectDB = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connection Established with DB");
  } catch (err) {
    console.error("DB Connection Error:", err);
    process.exit(1);
  }
};

module.exports = { connectDB, mongoose };

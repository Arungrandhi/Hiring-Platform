const mongoose = require('mongoose');

const connectDB = async () => {
  try {
    const mongoUri =
      process.env.MONGO_URI ||
      process.env.MONGODB_URI ||
      'mongodb+srv://arungrandhi:ARUN123@cluster0.k1xoqch.mongodb.net/Hiring-Platform?retryWrites=true&w=majority&appName=Cluster0';
    const conn = await mongoose.connect(mongoUri, {
      autoIndex: true, // ensure indexes are created in development
    });
    console.log(`[Database] MongoDB Connected: ${conn.connection.host}/${conn.connection.name}`);
  } catch (error) {
    console.error(`[Database Error] Connection failed: ${error.message}`);
    process.exit(1);
  }
};

module.exports = connectDB;

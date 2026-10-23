const dotenv = require('dotenv');
// Load environment variables
dotenv.config();

const app = require('./app');
const connectDB = require('./config/db');

const PORT = process.env.PORT || 5000;

// Connect to MongoDB and then start listening
const startServer = async () => {
  try {
    await connectDB();
    const server = app.listen(PORT, () => {
      console.log(`====================================================`);
      console.log(`[Server] Hiring Platform API running in ${process.env.NODE_ENV || 'development'} mode`);
      console.log(`[Server] Listening on http://localhost:${PORT}`);
      console.log(`[Server] Health Check available at http://localhost:${PORT}/api/health`);
      console.log(`====================================================`);
    });

    // Handle unhandled promise rejections
    process.on('unhandledRejection', (err) => {
      console.error(`[Unhandled Rejection] ${err.message}`);
      // Close server & exit process
      server.close(() => process.exit(1));
    });
  } catch (error) {
    console.error(`[Fatal Startup Error] ${error.message}`);
    process.exit(1);
  }
};

startServer();

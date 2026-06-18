require('dotenv').config();
const app = require('./app');
const connectDB = require('./config/db');
const { port } = require('./config/env');

const startServer = async () => {
  await connectDB();

  const server = app.listen(port, () => {
    console.log(`\n🚀 KadalThunai API running on port ${port}`);
    console.log(`📍 Environment: ${process.env.NODE_ENV || 'development'}`);
    console.log(`🔗 Health: http://localhost:${port}/health`);
    console.log(`🔗 API: http://localhost:${port}/api/v1\n`);
  });

  // Graceful shutdown
  process.on('SIGTERM', () => {
    console.log('SIGTERM received. Shutting down gracefully...');
    server.close(() => {
      console.log('HTTP server closed.');
      process.exit(0);
    });
  });

  process.on('unhandledRejection', (err) => {
    console.error('💥 Unhandled Promise Rejection:', err.message);
    server.close(() => process.exit(1));
  });
};

startServer();

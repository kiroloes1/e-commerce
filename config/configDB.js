const mongoose = require('mongoose');

exports.connectDB = async () => {
  try {
    const conn1 = mongoose.createConnection(process.env.DB1);
    const conn2 = mongoose.createConnection(process.env.DB2);
    const conn3 = mongoose.createConnection(process.env.DB3);


    conn1.once('open', () => console.log('DB1 Connected'));
    conn2.once('open', () => console.log('DB2 Connected'));
    conn2.once('open', () => console.log('DB3 Connected'));


    return { conn1, conn2 ,conn3 };

  } catch (error) {
    console.error('MongoDB connection error:', error.message);
    process.exit(1);
  }
};
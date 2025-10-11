// backend/config/db.js
const mongoose = require('mongoose');
require('dotenv').config(); // .env 파일의 환경 변수를 불러옵니다.

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URI);
    console.log(`MongoDB Connected: ${conn.connection.host}`);
  } catch (error) {
    console.error(`Error: ${error.message}`);
    process.exit(1); // 에러 발생 시 프로세스 종료
  }
};

module.exports = connectDB;
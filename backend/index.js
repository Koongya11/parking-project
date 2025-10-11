// backend/index.js
const express = require('express');
const cors = require('cors');
const connectDB = require('./config/db');
const stadiumRoutes = require('./routes/stadiumRoutes')
const parkingAreaRoutes = require('./routes/parkingAreaRoutes'); // 라우트 파일 불러오기

connectDB();

const app = express();
const port = 5000;

app.use(cors());
app.use(express.json()); // JSON 요청 본문을 처리하기 위해 필수!

// '/api/parking-areas' 라는 주소로 오는 모든 요청은 parkingAreaRoutes 파일이 처리합니다.
app.use('/api/parking-areas', parkingAreaRoutes);
app.use('/api/stadiums', stadiumRoutes)

app.listen(port, () => {
  console.log(`백엔드 서버가 http://localhost:${port} 에서 실행 중입니다.`);
});


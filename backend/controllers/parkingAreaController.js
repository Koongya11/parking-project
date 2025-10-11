// backend/controllers/parkingAreaController.js
const ParkingArea = require('../models/ParkingArea');

// @desc    모든 주차 구역 정보 가져오기
// @route   GET /api/parking-areas
const getParkingAreas = async (req, res) => {
  try {
    const parkingAreas = await ParkingArea.find({});
    res.json(parkingAreas);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    새로운 주차 구역 정보 생성하기
// @route   POST /api/parking-areas
const createParkingArea = async (req, res) => {
  try {
    const { category, stadiumName, title, polygon } = req.body;
    const newParkingArea = new ParkingArea({
      category,
      stadiumName,
      title,
      polygon,
    });
    const savedParkingArea = await newParkingArea.save();
    res.status(201).json(savedParkingArea);
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

// @desc    주차 구역에 피드백(성공 또는 실패) 추가
// @route   POST /api/parking-areas/:id/feedback
const addFeedback = async (req, res) => {
  try {
    // type은 'success' 또는 'failure' 문자열이 들어옵니다.
    const { type } = req.body;
    const parkingArea = await ParkingArea.findById(req.params.id);

    if (parkingArea) {
      if (type === 'success') {
        parkingArea.successCount += 1;
      } else if (type === 'failure') {
        parkingArea.failureCount += 1;
      } else {
        return res.status(400).json({ message: 'Invalid feedback type' });
      }

      const updatedParkingArea = await parkingArea.save();
      res.json(updatedParkingArea);
    } else {
      res.status(404).json({ message: 'Parking area not found' });
    }
  } catch (error) {
    res.status(500).json({ message: 'Server Error' });
  }
};

module.exports = { getParkingAreas, createParkingArea, addFeedback };
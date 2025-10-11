// backend/routes/parkingAreaRoutes.js
const express = require('express');
const router = express.Router();
const { 
    getParkingAreas,
    createParkingArea,
    addFeedback, 
} = require('../controllers/parkingAreaController');

router.route('/').get(getParkingAreas).post(createParkingArea);

router.route('/:id/feedback').post(addFeedback);

module.exports = router;
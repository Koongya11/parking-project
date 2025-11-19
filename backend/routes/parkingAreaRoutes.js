// backend/routes/parkingAreaRoutes.js
const express = require('express');
const router = express.Router();
const {
    getParkingAreas,
    createParkingArea,
    addFeedback,
    toggleSave,
    updateParkingArea,
    deleteParkingArea,
    deleteOwnParkingArea,
} = require('../controllers/parkingAreaController');
const adminAuth = require('../middleware/adminAuth');
const userAuth = require('../middleware/userAuth');

router.route('/').get(getParkingAreas).post(userAuth, createParkingArea);

router.route('/:id/feedback').post(addFeedback);
router.route('/:id/save').post(userAuth, toggleSave);
router.route('/:id/mine').delete(userAuth, deleteOwnParkingArea);

router.route('/:id')
    .put(adminAuth, updateParkingArea)
    .delete(adminAuth, deleteParkingArea);

module.exports = router;

const express = require('express');
const router = express.Router();
const coachHandler = require('../handlers/coach');
const { verifyToken, verifyAdmin, verifyCoach } = require('../middlewares/auth');

router.use(verifyToken);

router.get('/', verifyAdmin, coachHandler.getAllCoaches);
router.post('/', verifyCoach, coachHandler.createCoach);
router.get('/:id', verifyCoach, coachHandler.getCoachById);
router.put('/:id', verifyCoach, coachHandler.updateCoach);
router.delete('/:id', verifyAdmin, coachHandler.deleteCoach);

module.exports = router;

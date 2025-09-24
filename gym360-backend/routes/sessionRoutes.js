// routes/sessions.js
const express = require('express');
const router = express.Router();
const sessionH = require('../handlers/session');
const { verifyAdmin, verifyClient, verifyCoach } = require('../middlewares/auth');

// Client endpoint: current user's sessions  ✅ must be before '/:id'
router.get('/mine', verifyClient, sessionH.getMySessions);

// Coach endpoint (NEW)
router.get('/coach/mine', verifyCoach, sessionH.getMyCoachSessions);
router.post('/coach', verifyCoach, sessionH.createSessionByCoach);          // NEW
router.put('/coach/:id', verifyCoach, sessionH.updateSessionByCoach);       // NEW
router.delete('/coach/:id', verifyCoach, sessionH.deleteSessionByCoach); 

// Admin endpoints
router.post('/', verifyAdmin, sessionH.createSession);
router.get('/', verifyAdmin, sessionH.getAllSessions);
router.get('/:id', verifyAdmin, sessionH.getSessionById);
router.put('/:id', verifyAdmin, sessionH.updateSession);
router.delete('/:id', verifyAdmin, sessionH.deleteSession);

module.exports = router;

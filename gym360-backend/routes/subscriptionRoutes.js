const express = require('express');
const router = express.Router();
const subscription = require('../handlers/subscription');
const { verifyAdmin } = require('../middlewares/auth');

router.post('/', verifyAdmin, subscription.createSubscription);
router.get('/', verifyAdmin, subscription.getAllSubscriptions);
router.get('/:id', verifyAdmin, subscription.getSubscriptionById);
router.put('/:id', verifyAdmin, subscription.updateSubscription);
router.delete('/:id', verifyAdmin, subscription.deleteSubscription);

module.exports = router;

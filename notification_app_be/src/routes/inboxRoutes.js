const express = require('express');
const { getInbox, getStreamInbox } = require('../controllers/inboxController');

const router = express.Router();

router.get('/', getInbox);
router.get('/stream', getStreamInbox);

module.exports = router;
const { getTopItems, TopKHeap } = require('../services/priorityService');
const { getNotifications } = require('../services/fetcher');
const { log } = require('../utils/logWrapper');

async function getInbox(req, res) {
    let n = req.query.n;
    if (!n) {
        n = 10;
    } else {
        n = parseInt(n);
    }
    
    let token = req.authToken;
    
    if (!token) {
        return res.status(401).json({ error: 'Missing auth token' });
    }
    
    try {
        let start = Date.now();
        let allNotifs = await getNotifications(token);
        let top = getTopItems(allNotifs, n);
        let timeTaken = Date.now() - start;
        
        res.json({
            ok: true,
            count: top.length,
            requested: n,
            data: top,
            responseMs: timeTaken
        });
    } catch (err) {
        log('backend', 'error', 'controller', err.message);
        res.status(500).json({ error: err.message });
    }
}

async function getStreamInbox(req, res) {
    let n = req.query.n ? parseInt(req.query.n) : 10;
    let token = req.authToken;
    
    if (!token) {
        return res.status(401).json({ error: 'Missing auth token' });
    }
    
    try {
        let allNotifs = await getNotifications(token);
        let tracker = new TopKHeap(n);
        
        for (let i = 0; i < allNotifs.length; i++) {
            tracker.addItem(allNotifs[i]);
        }
        
        let top = tracker.getTop();
        
        res.json({
            ok: true,
            count: top.length,
            k: n,
            data: top,
            note: 'Heap based top K maintenance'
        });
    } catch (err) {
        res.status(500).json({ error: err.message });
    }
}

module.exports = { getInbox, getStreamInbox };
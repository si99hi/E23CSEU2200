const axios = require('axios');
const { log } = require('../utils/logWrapper');

async function getNotifications(token) {
    log('backend', 'debug', 'service', 'Calling notifications API');
    
    const response = await axios.get('http://4.224.186.213/evaluation-service/notifications', {
        headers: { 'Authorization': `Bearer ${token}` }
    });
    
    return response.data.notifications || [];
}

module.exports = { getNotifications };
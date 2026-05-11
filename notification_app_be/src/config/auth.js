const axios = require('axios');
const { log, setAuthToken, flushPendingLogs } = require('../utils/logWrapper');

async function getAuthTokenWithExistingCredentials(userDetails, clientID, clientSecret) {
    log('backend', 'info', 'auth', 'Using existing credentials to get auth token');
    
    try {
        const response = await axios.post(
            'http://4.224.186.213/evaluation-service/auth',
            {
                email: userDetails.email,
                name: userDetails.name,
                rollNo: userDetails.rollNo,
                accessCode: userDetails.accessCode,
                clientID: clientID,
                clientSecret: clientSecret
            },
            { timeout: 10000 }
        );
        
        const token = response.data.token || response.data.accessToken;
        log('backend', 'info', 'auth', 'Auth token obtained successfully');
        return token;
        
    } catch (error) {
        log('backend', 'error', 'auth', `Auth failed: ${error.message}`);
        if (error.response) {
            log('backend', 'error', 'auth', `Response: ${JSON.stringify(error.response.data)}`);
        }
        throw error;
    }
}

async function setupAuth(userDetails) {
    log('backend', 'info', 'auth', 'Starting authentication flow');
    
    const clientID = process.env.CLIENT_ID;
    const clientSecret = process.env.CLIENT_SECRET;
    
    if (!clientID || !clientSecret) {
        log('backend', 'error', 'auth', 'Missing CLIENT_ID or CLIENT_SECRET in .env');
        throw new Error('Please add CLIENT_ID and CLIENT_SECRET to .env file');
    }
    const token = await getAuthTokenWithExistingCredentials(
        userDetails,
        clientID,
        clientSecret
    );
    
    setAuthToken(token);
    await flushPendingLogs();
    
    log('backend', 'info', 'auth', 'Authentication complete');
    
    return {
        clientID: clientID,
        clientSecret: clientSecret,
        authToken: token
    };
}

module.exports = { setupAuth };
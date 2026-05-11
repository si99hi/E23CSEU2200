const axios = require('axios');
const { log, setAuthToken, flushPendingLogs } = require('../utils/logWrapper');

async function getAuthTokenWithExistingCredentials(userDetails, clientID, clientSecret) {
    console.log('getAuthTokenWithExistingCredentials: start');
    log('backend', 'info', 'auth', 'Using existing credentials to get auth token');
    
    const controller = new AbortController();
    const timeout = setTimeout(() => {
        controller.abort();
    }, 10000);

    try {
        console.log('getAuthTokenWithExistingCredentials: before axios');
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
            {
                timeout: 10000,
                signal: controller.signal,
                headers: { 'Content-Type': 'application/json' }
            }
        );
        
        console.log('getAuthTokenWithExistingCredentials: response received');
        const token =
            response.data.access_token ||
            response.data.token ||
            response.data.accessToken ||
            response.data.authToken ||
            response.data.id_token;
        if (!token) {
            log('backend', 'error', 'auth', 'Auth response missing token: ' + JSON.stringify(response.data));
            throw new Error('Authentication succeeded but no token was found in the response.');
        }
        log('backend', 'info', 'auth', 'Auth token obtained successfully');
        return token;
        
    } catch (error) {
        if (error.name === 'CanceledError' || error.code === 'ERR_CANCELED') {
            log('backend', 'error', 'auth', 'Auth request aborted due to timeout');
        } else {
            log('backend', 'error', 'auth', `Auth failed: ${error.message}`);
            if (error.response) {
                log('backend', 'error', 'auth', `Response: ${JSON.stringify(error.response.data)}`);
            }
        }
        throw error;
    } finally {
        clearTimeout(timeout);
    }
}

async function setupAuth(userDetails) {
    console.log('setupAuth: start');
    log('backend', 'info', 'auth', 'Starting authentication flow');
    
    const clientID = process.env.CLIENT_ID;
    const clientSecret = process.env.CLIENT_SECRET;
    
    if (!clientID || !clientSecret) {
        console.log('setupAuth: missing client credentials');
        log('backend', 'error', 'auth', 'Missing CLIENT_ID or CLIENT_SECRET in .env');
        throw new Error('Please add CLIENT_ID and CLIENT_SECRET to .env file');
    }
    const token = await getAuthTokenWithExistingCredentials(
        userDetails,
        clientID,
        clientSecret
    );
    
    setAuthToken(token);
    flushPendingLogs().catch((err) => {
        log('backend', 'warn', 'auth', 'Pending log flush failed: ' + (err.message || err));
    });
    
    log('backend', 'info', 'auth', 'Authentication complete');
    
    return {
        clientID: clientID,
        clientSecret: clientSecret,
        authToken: token
    };
}

module.exports = { setupAuth };
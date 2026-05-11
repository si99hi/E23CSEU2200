const axios = require('axios');
const { log, setAuthToken, flushPendingLogs } = require('../utils/logWrapper');

async function registerUser(userDetails) {
    log('backend', 'info', 'auth', 'Starting registration process');
    
    try {
        const response = await axios.post(
            'http://4.224.186.213/evaluation-service/register',
            {
                email: userDetails.email,
                name: userDetails.name,
                mobileNo: userDetails.mobileNo,
                githubUsername: userDetails.githubUsername,
                rollNo: userDetails.rollNo,
                accessCode: userDetails.accessCode
            },
            { timeout: 10000 }
        );
        
        log('backend', 'info', 'auth', 'Registration successful');
        return response.data;
        
    } catch (error) {
        log('backend', 'error', 'auth', `Registration failed: ${error.message}`);
        throw new Error(`Registration failed: ${error.message}`);
    }
}
async function getAuthToken(email, name, rollNo) {
    log('backend', 'debug', 'auth', 'Requesting auth token');
    
    try {
        const response = await axios.post(
            'http://4.224.186.213/evaluation-service/auth',
            {
                email: email,
                name: name,
                rollNo: rollNo
            },
            { timeout: 10000 }
        );
        const token = response.data.token || response.data.accessToken;
        
        log('backend', 'info', 'auth', 'Auth token obtained');
        return token;
        
    } catch (error) {
        log('backend', 'error', 'auth', `Auth failed: ${error.message}`);
        throw new Error(`Authentication failed: ${error.message}`);
    }
}
async function setupAuth(userDetails) {
    log('backend', 'info', 'auth', 'Setting up authentication');
    
    const registrationData = await registerUser(userDetails);
    
    const token = await getAuthToken(
        userDetails.email,
        userDetails.name,
        userDetails.rollNo
    );
    setAuthToken(token);
    await flushPendingLogs();
    
    log('backend', 'info', 'auth', 'Authentication complete and logging configured');
    
    return {
        clientId: registrationData.clientID,
        clientSecret: registrationData.clientSecret,
        authToken: token
    };
}

module.exports = { setupAuth };
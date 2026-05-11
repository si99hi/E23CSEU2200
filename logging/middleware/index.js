const axios = require('axios');

let activeAuthToken = null;

let pendingLogs = [];

const allowedStacks = ['backend', 'frontend'];
const allowedLevels = ['debug', 'info', 'warn', 'error', 'fatal'];
const allowedPackages = [
    'cache', 'controller', 'cron_job', 'db', 'domain',
    'handler', 'repository', 'route', 'service',
    'auth', 'config', 'middleware', 'utils'
];
function isValid(value, allowedList, fieldName) {
    if (!allowedList.includes(value)) {
        console.error(`Invalid ${fieldName}: ${value}`);
        return false;
    }
    return true;
}

async function Log(stack, level, packageName, message) {
    if (!isValid(stack, allowedStacks, 'stack')) return;
    if (!isValid(level, allowedLevels, 'level')) return;
    if (!isValid(packageName, allowedPackages, 'package')) return;
    
    const logData = {
        stack: stack,
        level: level,
        package: packageName,
        message: message
    };
    
    if (!activeAuthToken) {
        pendingLogs.push(logData);
        return;
    }
    
    try {
        await axios.post('http://4.224.186.213/evaluation-service/logs', logData, {
            headers: {
                'Authorization': `Bearer ${activeAuthToken}`,
                'Content-Type': 'application/json'
            },
            timeout: 3000
        });
    } catch (err) {
        if (level === 'fatal') {
            console.error('Log delivery failed for fatal error:', err.message);
        }
    }
}

function setAuthToken(token) {
    activeAuthToken = token;
    Log('backend', 'info', 'middleware', 'Auth token configured');

    flushPendingLogs();
}
async function flushPendingLogs() {
    while (pendingLogs.length > 0) {
        const logEntry = pendingLogs.shift();
        await Log(logEntry.stack, logEntry.level, logEntry.package, logEntry.message);
    }
}

// Express middleware to log incoming requests and responses
function requestLogger(req, res, next) {
    const requestId = Math.random().toString(36).substring(2, 10);
    const startTime = Date.now();
    Log('backend', 'info', 'middleware', `[${requestId}] ${req.method} ${req.url} - started`);
    
    if (req.body && Object.keys(req.body).length > 0) {
        const cleanBody = { ...req.body };
        delete cleanBody.password;
        delete cleanBody.accessCode;
        delete cleanBody.clientSecret;
        
        if (Object.keys(cleanBody).length > 0) {
            Log('backend', 'debug', 'middleware', `[${requestId}] body: ${JSON.stringify(cleanBody)}`);
        }
    }
    const originalSend = res.send;
    res.send = function(data) {
        const duration = Date.now() - startTime;
        Log('backend', 'info', 'middleware', `[${requestId}] Completed with ${res.statusCode} in ${duration}ms`);
        
        originalSend.call(this, data);
    };
    
    next();
}
module.exports = {
    Log,
    setAuthToken,
    flushPendingLogs,
    requestLogger
};
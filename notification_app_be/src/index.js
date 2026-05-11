const express = require('express');
const dotenv = require('dotenv');
const { setupAuth } = require('./config/auth');
const { log, requestLogger } = require('./utils/logWrapper');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 3000;
app.use(express.json());
app.use(requestLogger);
const myCredentials = {
    "email": "e23cseu2200@bennett.edu.in",
    "name": "Siddhi",
    "mobileNo": "9993330122",
    "githubUsername": "si99hi",
    "rollNo": "E23CSEU2200",
    "accessCode": "TfDxgr"
}

app.get('/', (req, res) => {
    log('backend', 'info', 'route', 'Root endpoint accessed');
    res.json({
        message: 'Server is running',
        endpoints: [
            'GET /health',
            'GET /priority-inbox?n=10'
        ]
    });
});
app.get('/health', (req, res) => {
    log('backend', 'debug', 'controller', 'Health check');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});
async function initializeAuth() {
    log('backend', 'info', 'config', 'Starting authentication flow');

    try {
        const authData = await setupAuth(myCredentials);
        log('backend', 'info', 'config', 'Authentication successful');
        return authData;
    } catch (error) {
        log('backend', 'warn', 'config', `Authentication not available: ${error.message}`);
        console.warn('Authentication failed or not configured:', error.message);
        return null;
    }
}

function startServer() {
    app.listen(PORT, async () => {
        log('backend', 'info', 'config', `Server running on port ${PORT}`);
        console.log(`Server started on http://localhost:${PORT}`);

        await initializeAuth();
    });
}
startServer();
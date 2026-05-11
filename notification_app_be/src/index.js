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
    email: 'your_email@bennett.edu.in',      
    name: 'Your Full Name',                   
    mobileNo: '9999999999',                   
    githubUsername: 'your_github_username',   
    rollNo: 'E23CSEUXXXX',                    
    accessCode: 'TfDxgr'                      
};

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
async function startServer() {
    log('backend', 'info', 'config', 'Starting application');
    
    try {
        const authData = await setupAuth(myCredentials);
        log('backend', 'info', 'config', 'Authentication successful');
        app.listen(PORT, () => {
            log('backend', 'info', 'config', `Server running on port ${PORT}`);
            console.log(`Server started on http://localhost:${PORT}`);
        });
        
    } catch (error) {
        log('backend', 'fatal', 'config', `Startup failed: ${error.message}`);
        console.error('Failed to start:', error.message);
        process.exit(1);
    }
}
startServer();
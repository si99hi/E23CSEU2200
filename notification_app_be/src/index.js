const express = require('express');
const path = require('path');
const dotenv = require('dotenv');
const { setupAuth } = require('./config/auth');
const { log, requestLogger } = require('./utils/logWrapper');
const { runVehicleScheduler } = require('../../vehicle_maintenance_scheduler');

dotenv.config({ path: path.resolve(__dirname, '../.env') });

const app = express();
const PORT = process.env.PORT || 3000;

let globalAuthToken = null;

app.use(express.json());
app.use((req, res, next) => {
    console.log('[REQUEST]', req.method, req.url);
    next();
});
// requestLogger was causing /health requests to hang, disable until fixed
// app.use(requestLogger);

const myCredentials = {
    "email": "e23cseu2200@bennett.edu.in",
    "name": "Siddhi",
    "mobileNo": "9993330122",
    "githubUsername": "si99hi",
    "rollNo": "E23CSEU2200",
    "accessCode": "TfDxgr"
};

app.get('/', (req, res) => {
    log('backend', 'info', 'route', 'Root endpoint accessed');
    res.json({
        message: 'Server is running',
        endpoints: [
            'GET /health',
            'GET /run-scheduler'
        ]
    });
});

app.get('/health', (req, res) => {
    console.log('[HANDLER]', '/health');
    // log('backend', 'debug', 'controller', 'Health check');
    res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

app.get('/run-scheduler', async (req, res) => {
    log('backend', 'info', 'controller', 'Manual scheduler run');
    
    if (!globalAuthToken) {
        return res.status(401).json({ error: 'No auth token' });
    }
    
    try {
        const result = await runVehicleScheduler(globalAuthToken);
        res.json(result);
    } catch (error) {
        res.status(500).json({ error: error.message });
    }
});

async function initializeAuth() {
    console.log('initializeAuth: start');
    log('backend', 'info', 'config', 'Starting auth');
    try {
        const authData = await setupAuth(myCredentials);
        console.log('initializeAuth: auth returned');
        globalAuthToken = authData.authToken;
        log('backend', 'info', 'config', 'Auth success');
        return authData;
    } catch (error) {
        console.log('initializeAuth: auth failed');
        log('backend', 'warn', 'config', 'Auth failed: ' + error.message);
        console.warn('Auth failed:', error.message);
        return null;
    }
}

async function runStartupScheduler() {
    console.log('runStartupScheduler: begin');
    const authData = await initializeAuth();
    console.log('runStartupScheduler: after initializeAuth', authData ? 'auth ok' : 'auth failed');
    if (!authData) {
        console.warn('Skipping scheduler run due to failed auth.');
        return;
    }

    try {
        log('backend', 'info', 'config', 'Running scheduler');
        const result = await runVehicleScheduler(globalAuthToken);
        if (result.success) {
            console.log('Scheduler done');
            console.log('Depots:', result.summary.totalDepots);
            console.log('Vehicles:', result.summary.totalVehiclesConsidered);
            console.log('Total impact:', result.summary.totalImpactAcrossDepots);
        } else {
            console.warn('Scheduler failed:', result.error || 'unknown error');
        }
    } catch (error) {
        console.warn('Scheduler error:', error.message || error);
    }
}

function startServer() {
    app.listen(PORT, () => {
        log('backend', 'info', 'config', 'Server on port ' + PORT);
        console.log('Server started on http://localhost:' + PORT);
        console.log('Starting auth and scheduler in background...');
        setImmediate(() => {
            runStartupScheduler().catch((err) => {
                console.warn('Startup scheduler error:', err.message || err);
            });
        });
    });
}

app.use((err, req, res, next) => {
    console.error('Express error:', err);
    res.status(500).json({ error: 'Internal server error' });
});

process.on('unhandledRejection', (reason) => {
    console.error('Unhandled Rejection:', reason);
});

process.on('uncaughtException', (err) => {
    console.error('Uncaught Exception:', err);
});

startServer();
const dotenv = require('dotenv');
const { setupAuth } = require('./config/auth');
const { runVehicleScheduler } = require('../../vehicle_maintenance_scheduler');

dotenv.config();

const myCredentials = {
    email: 'e23cseu2200@bennett.edu.in',
    name: 'Siddhi',
    mobileNo: '9993330122',
    githubUsername: 'si99hi',
    rollNo: 'E23CSEU2200',
    accessCode: 'TfDxgr'
};

async function runScheduler() {
    console.log('Starting auth and scheduler in background...');

    try {
        const authData = await setupAuth(myCredentials);
        if (!authData || !authData.authToken) {
            console.warn('Auth did not return a token; skipping scheduler run.');
            return;
        }

        const result = await runVehicleScheduler(authData.authToken);
        if (result.success) {
            console.log('Scheduler done');
            console.log('Depots:', result.summary.totalDepots);
            console.log('Vehicles:', result.summary.totalVehiclesConsidered);
            console.log('Total impact:', result.summary.totalImpactAcrossDepots);
        } else {
            console.warn('Scheduler failed:', result.error || 'unknown error');
        }
    } catch (error) {
        console.warn('Startup scheduler error:', error.message || error);
    }
}

runScheduler();

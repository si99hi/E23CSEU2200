const axios = require('axios');
const { solveKnapsack } = require('./solver');
const { log } = require('../notification_app_be/src/utils/logWrapper');

let authToken = null;

function setToken(token) {
    authToken = token;
}

async function fetchDepots() {
    console.log('fetchDepots: start');
    log('backend', 'debug', 'service', 'Fetching depots');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
        const response = await axios.get('http://4.224.186.213/evaluation-service/depots', {
            headers: { 'Authorization': `Bearer ${authToken}` },
            timeout: 10000,
            signal: controller.signal
        });
        console.log('fetchDepots: response received', response.status);
        return response.data.depots;
    } catch (error) {
        log('backend', 'error', 'service', 'fetchDepots failed: ' + error.message);
        if (error.response) {
            log('backend', 'error', 'service', 'fetchDepots response: ' + JSON.stringify(error.response.data));
        }
        throw error;
    } finally {
        clearTimeout(timeout);
    }
}

async function fetchVehicles() {
    console.log('fetchVehicles: start');
    log('backend', 'debug', 'service', 'Fetching vehicles');
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10000);
    try {
        const response = await axios.get('http://4.224.186.213/evaluation-service/vehicles', {
            headers: { 'Authorization': `Bearer ${authToken}` },
            timeout: 10000,
            signal: controller.signal
        });
        console.log('fetchVehicles: response received', response.status);
        return response.data.vehicles;
    } catch (error) {
        log('backend', 'error', 'service', 'fetchVehicles failed: ' + error.message);
        if (error.response) {
            log('backend', 'error', 'service', 'fetchVehicles response: ' + JSON.stringify(error.response.data));
        }
        throw error;
    } finally {
        clearTimeout(timeout);
    }
}

async function runVehicleScheduler(token) {
    authToken = token;
    console.log('runVehicleScheduler: start');
    log('backend', 'info', 'service', 'Starting scheduler');
    
    try {
        console.log('runVehicleScheduler: fetching depots');
        const depots = await fetchDepots();
        console.log('runVehicleScheduler: fetched depots', depots.length);

        console.log('runVehicleScheduler: fetching vehicles');
        const vehicles = await fetchVehicles();
        console.log('runVehicleScheduler: fetched vehicles', vehicles.length);
        
        log('backend', 'info', 'service', 'Got ' + depots.length + ' depots and ' + vehicles.length + ' vehicles');
        
        const results = [];
        for (let i = 0; i < depots.length; i++) {
            const depot = depots[i];
const solution = await solveKnapsack(vehicles, depot.MechanicHours);
            
            results.push({
                depotId: depot.ID,
                budgetHours: depot.MechanicHours,
                impact: solution.totalImpact,
                hoursUsed: solution.totalHours,
                vehiclesServiced: solution.selected.length
            });
            
            log('backend', 'info', 'service', 'Depot ' + depot.ID + ': impact ' + solution.totalImpact);
            console.log('runVehicleScheduler: processed depot', depot.ID);
            await new Promise((resolve) => setImmediate(resolve));
        }
        
        const totalImpact = results.reduce((sum, r) => sum + r.impact, 0);
        
        return {
            success: true,
            summary: {
                totalDepots: depots.length,
                totalVehiclesConsidered: vehicles.length,
                totalImpactAcrossDepots: totalImpact
            },
            depotResults: results
        };
        
    } catch (error) {
        log('backend', 'error', 'service', error.message);
        return { success: false, error: error.message };
    }
}

module.exports = { runVehicleScheduler, setToken };
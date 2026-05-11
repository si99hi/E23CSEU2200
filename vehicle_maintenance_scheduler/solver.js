async function solveKnapsack(vehicles, maxHours) {
    const n = vehicles.length;
    
    if (n === 0 || maxHours <= 0) {
        return {
            selected: [],
            totalImpact: 0,
            totalHours: 0
        };
    }
    const dp = [];
    for (let i = 0; i <= n; i++) {
        dp[i] = [];
        for (let h = 0; h <= maxHours; h++) {
            dp[i][h] = 0;
        }
    }
    
    for (let i = 1; i <= n; i++) {
        const v = vehicles[i-1];
        for (let h = 0; h <= maxHours; h++) {
            if (v.Duration <= h) {
                const include = dp[i-1][h - v.Duration] + v.Impact;
                const exclude = dp[i-1][h];
                dp[i][h] = include > exclude ? include : exclude;
            } else {
                dp[i][h] = dp[i-1][h];
            }
        }
        if (i % 5 === 0) {
            await new Promise((resolve) => setImmediate(resolve));
        }
    }
    
    const selected = [];
    let remaining = maxHours;
    for (let i = n; i > 0; i--) {
        if (dp[i][remaining] !== dp[i-1][remaining]) {
            selected.push(vehicles[i-1]);
            remaining -= vehicles[i-1].Duration;
        }
    }
    
    return {
        selected: selected.reverse(),
        totalImpact: dp[n][maxHours],
        totalHours: selected.reduce((sum, v) => sum + v.Duration, 0)
    };
}

module.exports = { solveKnapsack };
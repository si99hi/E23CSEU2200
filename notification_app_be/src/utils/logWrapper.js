const { Log, setAuthToken, flushPendingLogs, requestLogger } = require('../../../logging/middleware');
module.exports = {
    log: Log,
    setAuthToken: setAuthToken,
    flushPendingLogs: flushPendingLogs,
    requestLogger: requestLogger
};
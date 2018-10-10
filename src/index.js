const mongoose = require('mongoose');
const User = require('./models/user');
const Lock = require('./models/lock');
const Payment = require('./models/payment');
const CreditedPaymentObject = require('./models/creditedPaymentObjects');
const FailedPayment = require('./models/failedPayments');
const ArchivedPayment = require('./models/archivedPayments');

/**
 * @param {string} connectionString
 * @param {string} [databaseName]
 * @param {Boolean} debug
 * @returns {Promise}
 */
function connectDb(connectionString, databaseName, debug = false) {
    mongoose.set('debug', debug);
    return mongoose.connect(connectionString, {
        useNewUrlParser: true,
        dbName: databaseName || 'admin'
    });
}

function closeDb() {
    return mongoose.connection.close();
}

module.exports = {
    connectDb,
    closeDb,
    Lock,
    User,
    Payment,
    CreditedPaymentObject,
    FailedPayment,
    ArchivedPayment
};
const mongoose = require('mongoose');
const User = require('./models/user');
const Lock = require('./models/lock');
const Payment = require('./models/payment');

/**
 * @param {string} connectionString
 * @param {string} [databaseName]
 * @returns {Promise}
 */
function connectDb(connectionString, databaseName) {
    mongoose.set('debug', true);
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
    Payment
};
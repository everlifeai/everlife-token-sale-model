const mongoose = require('mongoose');

const lockSchema = new mongoose.Schema({
        lock: { type: String, required: true },
    },
    { timestamps: true }
);

lockSchema.index({ lock: 1 }, { unique: true });

/**
 * Use the database to act as a locking mechanism to detect things happening concurrently which should not. Primary use case is preventing multiple instances of services from inadvertently running in parallel.
 * @param {string} lockId
 * @returns {Promise<>} A promise which resolves, with no value, when the lock is acquired.
 */
lockSchema.statics.acquireLock = function(lockId) {
    const Lock = this.model('Lock');
    const lock = new Lock({ lock: lockId });
    return lock.save()
        .catch(() => {
            throw `Unable to acquire lock "${lockId}", is another instance already running?`;
        });
};

lockSchema.statics.releaseLock = function(lockId) {
    const Lock = this.model('Lock');
    return Lock.deleteOne({ lock: lockId}).exec();
};

const Lock = mongoose.model('Lock', lockSchema);

module.exports = Lock;
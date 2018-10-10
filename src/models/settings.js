const mongoose = require('mongoose');


/**
 *      /understand
 * The settings collection is used to store settings that need to be shared between the different components/services
 * that make up the Token Sale App. Each setting is identified by a unique `name` and can have a value of any type.
 */
const settingsSchema = new mongoose.Schema({
        name: { type: String, required: true },
        value: { type: mongoose.Schema.Types.Mixed, required: true }
    },
    { timestamps: true }
);

settingsSchema.index({ name: 1 }, { unique: true });

settingsSchema.statics.getSetting = async function(name) {
    const Settings = this.model('Settings');
    let query = { name: name };
    return Settings.findOne(query)
        .then(result => result ? result.value : undefined);
};

settingsSchema.statics.setSetting = async function(name, value) {
    const Settings = this.model('Settings');
    let query = { name: name },
        update = { value: value },
        options = { upsert: true, new: true, setDefaultsOnInsert: true };
    return Settings.findOneAndUpdate(query, update, options);
};

module.exports = mongoose.model('Settings', settingsSchema);




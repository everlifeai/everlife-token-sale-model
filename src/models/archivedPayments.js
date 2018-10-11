const mongoose = require('mongoose');

const archivedPaymentSchema = new mongoose.Schema({
        issue_to: { type: String, required: true },
        ever: { type: Number, required: true },
    },
    { timestamps: true },
    { collection: 'issuing_archived' }
);

module.exports = mongoose.model('issuing_archived', archivedPaymentSchema);
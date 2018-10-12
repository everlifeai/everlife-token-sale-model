const mongoose = require('mongoose');

const failedPaymentSchema = new mongoose.Schema({
        issue_to: { type: String, required: true },
        email: { type: String, required: true },
        source_ref: { type: String, required: true },
        reason: { type: String, required: true }
    },
    { timestamps: true },
    { collection: 'issuing_failed' }
);

module.exports = mongoose.model('issuing_failed', failedPaymentSchema);
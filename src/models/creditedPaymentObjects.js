const mongoose = require('mongoose');

const creditedPaymentObjectSchema = new mongoose.Schema({
        issue_to: { type: String, required: true },
        ever: { type: Number, required: true },
    },
    { timestamps: true },
    { collection: 'issuing_pending' }
);

module.exports = mongoose.model('issuing_pending', creditedPaymentObjectSchema);
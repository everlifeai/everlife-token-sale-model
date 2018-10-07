const mongoose = require('mongoose');

const creditedPaymentObjectSchema = new mongoose.Schema({
        issue_to: { type: String, required: true },
        ever: { type: Number, required: true },
    },
    { timestamps: true }
);

module.exports = mongoose.model('CreditedPaymentObject', creditedPaymentObjectSchema);
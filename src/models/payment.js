const mongoose = require('mongoose');

const paymentSchema = new mongoose.Schema({
        status: { type: String, enum: ['INCOMING', 'PROCESSING_PENDING', 'PROCESSED', 'PROCESSING_FAILED'], required: true, default: 'INCOMING' },
        payment_system: { type: String, enum: ['stellar', 'coinpayments'], required: true},
        currency: { type: String, enum: ['XLM', 'ETH', 'BTC'], required: true },
        amount: { type: Number, required: true },
        source_ref: { type: String, required: true },
        tx_id: { type: String, required: true },
        tx_timestamp: { type: Date, required: true },
        tx_info: { type: mongoose.Schema.Types.Mixed, default: null },
        status_message: { type: String, required: false }
    },
    { timestamps: true }
);

paymentSchema.index({ tx_id: 1 }, { unique: true });

const Payment = mongoose.model('Payment', paymentSchema);

module.exports = Payment;
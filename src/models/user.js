const log = require('util').log;
const mongoose = require('mongoose');
const { UserError } = require('./../errors/customErrors');

const creditedPaymentSchema = new mongoose.Schema({
        paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', required: true },
        ever: { type: Number, required: true },
        ever_bonus: { type: Number, required: true }
    },
    { timestamps: true }
);

/**
 *      problem/
 * Payments must never be credited twice.
 *
 *      way/
 * Validate that the payment id is not already credited by checking before saving a new credited payment.
 */
creditedPaymentSchema.pre('save', async function (next) {
    const user = await User.findOne({ 'purchases.credited_payments.paymentId' : this.paymentId  });
    if (this.isNew && user) {
        next(new UserError(`The payment ${this.paymentId} has already been credited.`, 400));
    }
});

const purchaseSchema = new mongoose.Schema({
        ever_expected: { type: Number, required: true },
        payment_system: { type: String, enum: ['stellar', 'coinpayments'], required: true},
        currency: { type: String, required: true },
        amount_expected: { type: Number, required: true },
        source_ref: { type: String, required: true },
        credited_payments: [{ type: creditedPaymentSchema, default: creditedPaymentSchema }],
        issue_to: { type: String, required: true },
        status: { type: String, enum: ['AWAITING_PAYMENT', 'PAYMENT_CREDITED', 'ISSUING_PENDING', 'ISSUED'], required: true, default: 'AWAITING_PAYMENT' },
        invoice_info: { type: mongoose.Schema.Types.Mixed, default: null },
        user_instruction: { type: mongoose.Schema.Types.Mixed, default: null },
        failure: { type: String, required: false }
    },
    { timestamps: true }
);

/*      problem/
 * If multiple users use the same Stellar account as their source reference (`source_ref`) we will not be able
 * to know which account to credit.
 *
 *      way/
 * Validate that the source reference is not used by any other user before saving a new purchase.
 */
purchaseSchema.pre('save', async function (next) {
    const user = await User.findOne({ 'purchases.source_ref' : this.source_ref  });
    if (user && this.parent().id !== user.id) {
        next(new UserError(`The source account ${this.source_ref} is already in use by another user.`, 400, `The source account ${this.source_ref} is already in used by user ${user.email}`));
    }
});

purchaseSchema.methods.credit = function(payment, ever, ever_bonus) {
    const CreditedPayment = this.parent().model('CreditedPayment');
    const credit = new CreditedPayment({
        paymentId: payment._id,
        ever: ever,
        ever_bonus: ever_bonus
    });
    this.credited_payments.push(credit);
    this.status = 'PAYMENT_CREDITED';
};


const userSchema = new mongoose.Schema({
        name: { type: String, required: true },
        email: { type: String, required: true, unique: true },
        phone: { type: String, required: false },
        birthdate: { type: Date, required: false },
        gender: { type: String, enum: ['male', 'female'], required: false },
        password: { type: String, required: true },
        whitelist: { type: Boolean, default: false },
        kyc: { type: Boolean, default: false },
        kycDocs: {
            document1: { type: String, default: null },
            document2: { type: String, default: null }
        },
        purchases: [{ type: purchaseSchema, default: purchaseSchema }],
        isAdmin: { type: Boolean, default: false },
        isVerifier: { type: Boolean, default: false },
        isPrivateInvestor: { type: Boolean, default: false },
        isActive: { type: Boolean, default: false },
        kycStatus: {type: String, default: null},
        idmStatus: {type: String, enum: ['', 'ACCEPT', 'DENY', 'MANUAL_REVIEW'], default: ''},
        idmDetails: {type: String, default: null}
    },
    { timestamps: true }
);


userSchema.methods.addPurchase = function(ever_expected, payment_system, currency, amount_expected, source_ref, issue_to, invoice_info, user_instruction) {
    const Purchase = this.model('Purchase');
    const p = new Purchase({ ever_expected, payment_system, currency, amount_expected, source_ref, issue_to, invoice_info, user_instruction });
    this.purchases.push(p);
    return p._id.toString();
};

userSchema.methods.markPurchaseIssued = function(source_ref) {
    const p = this.purchases.find(p => p.source_ref == source_ref);
    if (!p) {
        throw new Error('No purchase with source_ref exists');
    }
    p.issued = false;
};

/*      problem/
 * We need to have some way of associating a real-world user with our
 * database user.
 *
 *      way/
 * We will use the user's email as a unique identifier. Before saving
 * any user we first validate that there is not already another user with the
 * given email in the database.
 */
userSchema.pre('save', async function (next) {
    const emailRegExp = new RegExp('^'+this.email+'$', "i");
    const user = await User.findOne({ email: { $regex : emailRegExp }  });
    if (user && this.id !== user.id) {
        next(new UserError(`Another user already exist with email: ${user.email}`, 400));
    }
});

mongoose.model('Purchase', purchaseSchema);
mongoose.model('CreditedPayment', creditedPaymentSchema);
const User = mongoose.model('User', userSchema);

module.exports = User;

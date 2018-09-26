const log = require('util').log;
const mongoose = require('mongoose');
const { UserError } = require('./../errors/customErrors');


const creditedPaymentSchema = new mongoose.Schema({
        paymentId: { type: mongoose.Schema.Types.ObjectId, ref: 'Payment', required: true },
        ever: { type: Number, required: true },
        ever_bonus: { type: Number, required: true },
    },
    { timestamps: true }
);

const purchaseSchema = new mongoose.Schema({
        payment_system: { type: String, required: true },
        currency: { type: String, required: true },
        amount_expected: { type: Number, required: true },
        source_ref: { type: String, required: true },
        credited_payments: [{ type: creditedPaymentSchema, default: creditedPaymentSchema }],
        issue_to: { type: String, required: true },
        status: { type: String, enum: ['AWAITING_PAYMENT', 'PAYMENT_CREDITED', 'ISSUED'], required: true, default: 'AWAITING_PAYMENT' }
    },
    { timestamps: true }
);

purchaseSchema.methods.creditPayment = function (paymentId, amountEver, amountEverBonus) {
    // TODO: Check all credited payments not only on this user/purchase
    if (this.credited_payments.find(p => p.paymentId == paymentId)) {
        throw `PaymentId ${paymentId} has already been credited.`;
    }
    const CreditedPayment = this.__parent.model('CreditedPayment');
    const c = new CreditedPayment({ paymentId: paymentId, ever: amountEver, ever_bonus: amountEverBonus });
    this.credited_payments.push(c);
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


userSchema.methods.addPurchase = function(payment_system, currency, amount_expected, source_ref, issue_to) {
    if (this.purchases.find(p => p.source_ref == source_ref)) {
        throw 'Purchase with source_ref already exists';
    }
    const Purchase = this.model('Purchase');
    const p = new Purchase({ payment_system, currency, amount_expected, source_ref, issue_to });
    log('Adding purchase: ', p);
    this.purchases.push(p);
};


userSchema.methods.markPurchaseIssued = function(source_ref) {
    const p = this.purchases.find(p => p.source_ref == source_ref);
    if (!p) {
        throw 'No purchase with source_ref already exists';
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

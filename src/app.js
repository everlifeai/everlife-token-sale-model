require('dotenv').config();
const Stellar = require('stellar-sdk');
const mongoose = require('mongoose');
const model = require('everlife-token-sale-model');

const { Lock, User, Payment, ArchivedPayment, CreditedPaymentObject, FailedPayment } = model;
const serviceName = "paymentIssuance";

const config = require('./config/config');
const utils = require('./utils/stellarTools')
const fileTools = require('./utils/fileTools');
const accountTools = require('./utils/accountTools');
const stellarHelper = require('./helpers/stellar.helper');
const toolHelper = require('./helpers/tool.helper');

async function start() {
    /* await model.connectDb(process.env.MONGO_DB_URL, process.env.MONGO_COLLECTION)
    await Lock.acquireLock(serviceName) */

    // 2. Verify if there are pending transactions
    // Check if there are unresolved payments in failed_payments
    const count = await FailedPayment.count({});
    if(count > 0) {
        console.log("Please resolve the failed payments");
        await Lock.releaseLock(serviceName);
        await model.closeDb();
        process.exit(-1);
    }

    // 3. Scan for private investors (isPrivateInvestor)
    const privateInvestors = await User.find({isPrivateInvestor: true});

    // 3.b Find PAYMENT_CREDITED status
    let payments = [];
    let changePaymentsStatus = [];

    privateInvestors.map(investor => {
        let changed = false;

        const updatedPurchases = investor.purchases.map(purchase => {
            if (purchase.status === "PAYMENT_CREDITED") {
                let issueTo = purchase.issue_to;
                let sum = 0;
                purchase.credited_payments.map(payment => {
                    sum += payment.ever;
                });

                payments.push(new CreditedPaymentObject({
                    issue_to: issueTo,
                    ever: sum
                }));

                changed = true;
                purchase.status = "ISSUING_PENDING";
            }

            return purchase;
        });

        // 6. Change status
        if (changed) {
            changePaymentsStatus.push(
                User.update({email: investor.email}, { $set: { purchases: updatedPurchases }})
            );
        }

    });


    await Promise.all(changePaymentsStatus);

    // 4 - 5
    await Promise.all(payments.map(cpayment => cpayment.save()));

    // 6 send payments
    // Get all payment transactions
    let creditedPayments = await CreditedPaymentObject.find({});

    let formattedPayments = creditedPayments.map(payment => {
        return {
            recipient: payment.issue_to,
            amount: payment.ever
        }
    });
    
    await sendPayments(formattedPayments);
    return Promise.resolve(true);
}

async function sendPayments(creditedPayments) {
    fileTools.createFileIfNotExist('account,success,message', 'output.csv');
    fileTools.createFileIfNotExist('account', 'allowtrust.csv');

    // Check if account:
    // 1. exists?
    // 2. has a trustline to EVER asset
    // 3. has allowed trust from issuance account
    let existingAccounts = fileTools.filterEmptyObjects(await accountTools.checkAccountExists(creditedPayments));
    let filteredAccounts = fileTools.filterEmptyObjects(accountTools.filterAccountsByTrustline(existingAccounts));
    let filteredAccountsPubKeys = filteredAccounts.map(accountObj => (accountObj.recipient));
    let originalPubKeys = [...filteredAccountsPubKeys];
    
    // Send Tx and log result
    const success = await utils.sendTransactions(filteredAccounts);
    fileTools.writeLogsForTransactions(success, originalPubKeys);

    // Validate
    let privateInvestors = await User.find({isPrivateInvestor: true});
    const outputData = await fileTools.loadCsv('output.csv');

    // account success message
    let changePaymentsStatus = [];
    outputData.map(output => {
        privateInvestors.map(investor => {
            let changed = false;

            const updatedPurchases = investor.purchases.map(purchase => {
                if (purchase.status === "ISSUING_PENDING" && purchase.issue_to === output.account) {   
                    changed = true;

                    if(output.success === "true") {
                        purchase.status = "ISSUED";
                    } else {
                        purchase.status = "PROBLEM_ISSUING";
                        purchase.failure = output.message
                    }
                }

                return purchase;
            });

            if (changed) {
                changePaymentsStatus.push(
                    User.update({email: investor.email}, { $set: { purchases: updatedPurchases }})
                );
            }
        });
    });

    await Promise.all(changePaymentsStatus);

    // 10. Archive
    let credited = await CreditedPaymentObject.find({});

    await Promise.all(credited.map(cpayment => {
        let archive = new ArchivedPayment({
            issue_to: cpayment.issue_to,
            ever: cpayment.ever
        });

        return archive.save();
    }));

    privateInvestors = await User.find({isPrivateInvestor: true});
    let failedTransactions = []

    privateInvestors.map(investor => {
        let changed = false;

        investor.purchases.map(purchase => {
            if (purchase.status === "PROBLEM_ISSUING") {
                let failedTx = new FailedPayment({
                    email: investor.email,
                    issue_to: purchase.issue_to,
                    source_ref: purchase.source_ref,
                    reason: purchase.failure
                });

                failedTransactions.push(failedTx.save())
            }   
        });
    });

    await Promise.all(failedTransactions);

    await CreditedPaymentObject.remove({});

    // Remove csv file (otherwise double updates - too many operations then)
    fileTools.removeFile('output.csv');
    fileTools.removeFile('allowtrust.csv');
}

/* Start application */
model.connectDb(process.env.MONGO_DB_URL, process.env.MONGO_COLLECTION)
.then(() => Lock.acquireLock(serviceName))
.then(() => start())
.then(() => Lock.releaseLock(serviceName))
.then(() => model.closeDb())
.catch(err => {
    console.log('Unexpected error:', err);
    // Remove creditedPayment objects to failed 
    // Close DB and release lock
    //process.exit(-1);

    CreditedPaymentObject.remove({})
        // Move all status 'ISSUING_PENDING' to failed
        .then(() => User.find({isPrivateInvestor: true}))
        .then((privateInvestors) => {
            let failedTransactions = [];

            privateInvestors.map(investor => {
                investor.purchases.map(purchase => {
                    if (purchase.status === "ISSUING_PENDING") {
                        let failedTx = new FailedPayment({
                            email: investor.email,
                            issue_to: purchase.issue_to,
                            source_ref: purchase.source_ref,
                            reason: "Application crashed before payment could be sent"
                        });
        
                        failedTransactions.push(failedTx.save())
                    }   
                });
            });

            return Promise.all(failedTransactions);
        })
        .then(() => Lock.releaseLock(serviceName))
        .then(() => model.closeDb())
        .then(() => process.exit(-1));
});

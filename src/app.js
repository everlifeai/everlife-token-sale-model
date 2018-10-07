require('dotenv').config();
const Stellar = require('stellar-sdk');
const mongoose = require('mongoose');
const model = require('everlife-token-sale-model');

const { Lock, User, Payment, ArchivedPayment, CreditedPaymentObject, FailedPayment } = model;
const serviceName = "paymentIssuance";
// const CreditedPayment = require('./models/credited_payments');
// const ArchivedPayment = require('./models/archived_payments');
// const FailedPayment = require('./models/failed_payments');

const config = require('./config/config');
const utils = require('./utils/stellarTools')
const fileTools = require('./utils/fileTools');
const accountTools = require('./utils/accountTools');
const stellarHelper = require('./helpers/stellar.helper');
const toolHelper = require('./helpers/tool.helper');

async function start() {

    // 1. Attempt connection
    try {
        await model.connectDb(process.env.MONGO_DB_URL, process.env.MONGO_COLLECTION)
        await Lock.acquireLock(serviceName)
    } catch (err) {
        await Lock.releaseLock(serviceName)
        await model.closeDb()
        console.log('Other instance running!');
        process.exit(-1);
    }

    // 2. Verify if there are pending transactions
    // Check if there are unresolved payments in failed_payments
    const count = await FailedPayment.count({});
    if(count > 0) {
        await Lock.releaseLock(serviceName)
        await model.closeDb()
        console.log("Please resolve the failed payments");
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
                purchase.credited_payments.map(payment => {
                    payments.push(new CreditedPaymentObject({
                        issue_to: issueTo,
                        ever: payment.ever
                    }));
                });

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

    // Close connection to DB
    await Lock.releaseLock(serviceName)
    await model.closeDb()

    let formattedPayments = creditedPayments.map(payment => {
        return {
            recipient: payment.issue_to,
            amount: payment.ever
        }
    });
    
    sendPayments(formattedPayments);
}

// Start scanner
start();

async function sendPayments(creditedPayments) {
    fileTools.createFileIfNotExist('account,success,email,message', 'output.csv');
    fileTools.createFileIfNotExist('account', 'allowtrust.csv');

    // Check if account:
    // 1. exists?
    // 2. has a trustline to EVER asset
    // 3. has allowed trust from issuance account
    let existingAccounts = fileTools.filterEmptyObjects(await accountTools.checkAccountExists(creditedPayments));
    let filteredAccounts = fileTools.filterEmptyObjects(accountTools.filterAccountsByTrustline(existingAccounts));
    let filteredAccountsPubKeys = filteredAccounts.map(accountObj => (accountObj.recipient));
    let originalPubKeys = [...filteredAccountsPubKeys];
    let filteredAccsPubKeysNotTrusted = await fileTools.filterAlreadyTrustedAccounts(filteredAccountsPubKeys);

    // Send allow trust to accounts which are not trusted yet and send EVER tokens
    const allowTrustSuccess = await stellarHelper.sendAllowTrust(filteredAccsPubKeysNotTrusted);

    if(allowTrustSuccess) {
        const transactionsLog = await utils.sendTransactions(filteredAccounts);
        fileTools.writeLogsForTransactions(transactionsLog, originalPubKeys);
    }

    toolHelper.checkProgramExecution(filteredAccountsPubKeys);
    

    try {
        await model.connectDb(process.env.MONGO_DB_URL, process.env.MONGO_COLLECTION)
        await Lock.acquireLock(serviceName)
    } catch (err) {
        console.log('Other instance running!');
        process.exit(-1);
    }

    let privateInvestors = await User.find({isPrivateInvestor: true});

    // Validate
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
                    source_ref: purchase.source_ref
                });

                failedTransactions.push(failedTx.save())
            }   
        });
    });

    await Promise.all(failedTransactions);

    await CreditedPaymentObject.remove({});

    await Lock.releaseLock(serviceName)
    await model.closeDb()

    // Remove csv file (otherwise double updates - too many operations then)
    fileTools.removeFile('output.csv');
}
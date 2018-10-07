require('dotenv').config();
const mongoose = require('mongoose');
const model = require('everlife-token-sale-model');

const { Lock, User, Payment } = model;
const serviceName = "paymentIssuance";

async function createUser() {
    try {
        await model.connectDb(process.env.MONGO_DB_URL, process.env.MONGO_COLLECTION)
        await Lock.acquireLock(serviceName)
        
        let user = new User({ 
            "kycDocs" : {
                "document1" : "g2GJ7KJnS.png", 
                "document2" : "g75cwXDQP.png"
            }, 
            "whitelist" : false, 
            "kyc" : false, 
            "name" : "ben Boi", 
            "email" : "ben@boi.se", 
            "birthdate" : new Date(), 
            "gender" : "male", 
            "password" : "$2b$10$u/zOW8HJicK8IhLPgerhnOBFgmZHQ3VqI8J0tVFZF42EVP.laufxW", 
            "kycStatus" : "ACCEPT", 
            "idmStatus" : "", 
            "isActive" : false, 
            "isAdmin" : false, 
            "isPrivateInvestor" : true, 
            "isVerifier" : false, 
            "phone" : "123415", 
            "purchases" : [
                {
                    "status" : "AWAITING_PAYMENT", 
                    "invoice_info" : "Invoice info ben", 
                    "user_instruction" : "Instructions ben",
                    "ever_expected" : 5, 
                    "payment_system" : "stellar", 
                    "currency" : "XLM", 
                    "amount_expected" : 2, 
                    "source_ref" : "GbenSRCBTC", 
                    "issue_to" : "GbenISSUE", 
                    "credited_payments" : [
    
                    ]
                }, 
                {
                    "status" : "PAYMENT_CREDITED", 
                    "invoice_info" : "Invoice info ben", 
                    "user_instruction" : "Instructions ben", 
                    "ever_expected" : 3, 
                    "payment_system" : "coinpayments", 
                    "currency" : "BTC", 
                    "amount_expected" : 1, 
                    "source_ref" : "GbenSRCBTC", 
                    "issue_to" : "GBLYJUK7LATCHWF54LBFYVRW5CG7TR4P264BIKB23Y3A7KW3QUV4O4WB",
                    "credited_payments" : [
                        {
                            "paymentId" : "5bb0c60cfad344346f9be492", 
                            "ever" : 4, 
                            "ever_bonus" : 2
                        }
                    ]
                }
            ]
        });
    
        await user.save();
    
        await Lock.releaseLock(serviceName)
        await model.closeDb()
    } catch (err) {
        console.log(err);
        success = false;
        process.exit(-1);
    }
}

createUser();

/* let user = new User({ 
    "kycDocs" : {
        "document1" : "g2GJ7KJnS.png", 
        "document2" : "g75cwXDQP.png"
    }, 
    "whitelist" : false, 
    "kyc" : false, 
    "name" : "ben Boi", 
    "email" : "ben@boi.se", 
    "birthdate" : new Date(), 
    "gender" : "male", 
    "password" : "$2b$10$u/zOW8HJicK8IhLPgerhnOBFgmZHQ3VqI8J0tVFZF42EVP.laufxW", 
    "kycStatus" : "ACCEPT", 
    "idmStatus" : "", 
    "isActive" : false, 
    "isAdmin" : false, 
    "isPrivateInvestor" : true, 
    "isVerifier" : false, 
    "phone" : "123415", 
    "purchases" : [
        {
            "status" : "AWAITING_PAYMENT", 
            "invoice_info" : "Invoice info ben", 
            "user_instruction" : "Instructions ben",
            "ever_expected" : 5, 
            "payment_system" : "stellar", 
            "currency" : "XLM", 
            "amount_expected" : 2, 
            "source_ref" : "GbenSRCBTC", 
            "issue_to" : "GbenISSUE", 
            "credited_payments" : [

            ]
        }, 
        {
            "status" : "PAYMENT_CREDITED", 
            "invoice_info" : "Invoice info ben", 
            "user_instruction" : "Instructions ben", 
            "ever_expected" : 3, 
            "payment_system" : "coinpayments", 
            "currency" : "BTC", 
            "amount_expected" : 1, 
            "source_ref" : "GbenSRCBTC", 
            "issue_to" : "GBYJMSUYPHQWJSZL7AB6H5R55NF73SCL2T6TQLZNYD6NVZ5EQNHI7O2E",
            "credited_payments" : [
                {
                    "paymentId" : "5bb0c60cfad344346f9be492", 
                    "ever" : 4, 
                    "ever_bonus" : 2
                }
            ]
        }, 
        {
            "status" : "PAYMENT_CREDITED", 
            "invoice_info" : "Invoice info ben", 
            "user_instruction" : "Instructions ben", 
            "ever_expected" : 3, 
            "payment_system" : "coinpayments", 
            "currency" : "BTC", 
            "amount_expected" : 1, 
            "source_ref" : "GbenSRCBTC", 
            "issue_to" : "GBYJMSUYPHQWJSZL7AB6H5R55NF73SCL2T6TQLZNYD6NVZ5EQNHI7O2E",
            "credited_payments" : [
                {
                    "paymentId" : "5bb0c60cfad344346f9be492", 
                    "ever" : 4, 
                    "ever_bonus" : 2
                }
            ]
        }
    ]
}); */
const fs = require('fs');
const path = require('path');
const os = require('os');
const csv = require('csvtojson/v2');
const Stellar = require('stellar-sdk');

/**
 * Create output csv file if not exist
 */
const createFileIfNotExist = async (csvData, filePath) => { 
    const outputFilePath = path.join(__dirname, '../..', 'var', filePath);

    if (!fs.existsSync(outputFilePath)) {
      await fs.writeFile(outputFilePath, `${csvData}${os.EOL}`, (err) => {
          if (err) throw err;
      });
    }
}

/**
 * Remove file
 */
const removeFile = (file) => { 
    const filePath = path.join(__dirname, '../..', 'var', file);
    fs.unlinkSync(filePath)
}

/**
 * Filter empty objects from array with only objects
 * @param {[ { any } ]} objectArray Any array which contains objects
 * @return Array with no empty objects 
 */
const filterEmptyObjects = (objectArray) => objectArray.filter(value => Object.keys(value).length !== 0);

/**
 * Add transaction log to file for account
 * @param {string} account Receiver account for which transaction has been executed
 * @param {boolean} success Transaction success or not
 * @param {string} message Message in case of an error
 */
const appendLog = async (account, success, message) => {
    const outputFilePath = path.join(__dirname, '../..', 'var', 'output.csv');
    await fs.appendFile(outputFilePath, `${account},${success},${message}${os.EOL}`, (err) => {
        if (err) throw err;
    });
}

/**
 * Add allowed Trust for account to CSV log file
 * @param {string} account Receiver account for which transaction has been executed
 */
const appendLogAllowTrust = async (account) => {
    const allowTrustFilePath = path.join(__dirname, '../..', 'var', 'allowtrust.csv');
    await fs.appendFile(allowTrustFilePath, `${account}${os.EOL}`, (err) => {
        if (err) throw err;
    });
}

/**
 * Load csv file and convert to JSON
 */
const loadCsv = async (file) => {
    const csvFilePath = `./var/${file}`; // path from root of project
    return csv().fromFile(csvFilePath);
}

/**
 * Check if all transactions succeeded and write to csv log file
 * @param {[ Stellar.Transaction ]} transactionsLog Success responses from sending payment transactions
 * @param {[ { any }]} filteredAccounts Used to determine how many transactions succeeded
 */
const writeLogsForTransactions = (success, pubKeys) => {
    pubKeys.map(pubkey => {
        if(success) {
            appendLog(pubkey, true, 'Successfully allowed trust - payment send - disallowed trust');
        } else {
            appendLog(pubkey, false, 'Payment has failed in the process of (allowed trust - payment - disallow trust)');
        }
    });
}

/**
 * Write all succeeded accounts with allow trust to CSV file
 * @param {[ string ]} accounts public keys 
 */
const writeLogsForAllowTrustTransactions = (accounts) => {
    accounts.map(account => {
        appendLogAllowTrust(account);
    });
}

const filterAlreadyTrustedAccounts = async (accountsPubKeys) => {
    const csvAlreadyTrustedAccounts = await loadCsv('allowtrust.csv');
    
    csvAlreadyTrustedAccounts.map(row => {
        let {account} = row;

        if(accountsPubKeys.includes(account)) {
            const index = accountsPubKeys.indexOf(account);
            accountsPubKeys.splice(index, 1);
        }
    });

    return accountsPubKeys;
}

module.exports = {
  createFileIfNotExist,
  removeFile,
  filterEmptyObjects,
  appendLog,
  appendLogAllowTrust,
  loadCsv,
  writeLogsForTransactions,
  writeLogsForAllowTrustTransactions,
  filterAlreadyTrustedAccounts
};

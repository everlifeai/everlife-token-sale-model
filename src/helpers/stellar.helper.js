const fileTools = require('../utils/fileTools');
const utils = require('../utils/stellarTools');

/**
 * Helper for sending allow trust transactions for not trusted accounts
 * @param {[ string ]} filteredAccsPubKeysNotTrusted 
 */
const sendAllowTrust = async (filteredAccsPubKeysNotTrusted) => {
  try {
    if(filteredAccsPubKeysNotTrusted.length > 0) {
        let promises = filteredAccsPubKeysNotTrusted.map(pubKey => utils.allowTrust(pubKey, true));
        let resolved = await Promise.all(promises);
  
        // Save all succeeded AllowTrust for accounts
        fileTools.writeLogsForAllowTrustTransactions(filteredAccsPubKeysNotTrusted);
    }
  
    return true;
  } catch(err) { 
    throw err;
    return false;
  }
}

/**
 * Helper for sending disallow trust transactions for not trusted accounts
 * @param {[ string ]} filteredAccsPubKeysTrusted 
 */
const removeTrust = async (filteredAccsPubKeysTrusted) => {
  try {
    if(filteredAccsPubKeysTrusted.length > 0) {
        let promises = filteredAccsPubKeysTrusted.map(pubKey => utils.allowTrust(pubKey, false));
        let resolved = await Promise.all(promises);
    }
  
    return true;
  } catch(err) { 
    throw err;
    return false;
  }
}

module.exports = {
  sendAllowTrust,
  removeTrust
}


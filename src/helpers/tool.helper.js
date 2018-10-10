const fileTools = require('../utils/fileTools');

/**
 * Check if program executed succesful based on remaining pub keys
 * @param {[ string ]} filteredAccountsPubKeys 
 */
const checkProgramExecution = (filteredAccountsPubKeys) => {
  if(filteredAccountsPubKeys.length === 0) {
    console.log('Transactions distributed - batchfunder tool!');
  } else {
      filteredAccountsPubKeys.map(pubKey => {
          fileTools.appendLog(pubKey, false, 'Transaction failed');
      });

      console.log('Program finished with errors!');
  }
}

module.exports = {
  checkProgramExecution
}
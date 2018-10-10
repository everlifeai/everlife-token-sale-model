const Stellar = require('stellar-sdk');
const config = require('../config/config');
const fileTools = require('./fileTools');

/**
 * Setup server for pubic network or testnet
 */
let server;
if (config.testnet === "true") {
    server = new Stellar.Server('https://horizon-testnet.stellar.org');
    Stellar.Network.useTestNetwork();
} else {
    server = new Stellar.Server('https://horizon.stellar.org/');
    Stellar.Network.usePublicNetwork();
}

/**
 * Load full account details
 * @param {string} pub public key
 * @return {Stellar.AccountResponse}
 */
const loadAccount = async (pub) => server.loadAccount(pub);

/**
 * Validate recipient exists
 * @param {string} pub recipient public key
 * @return {Stellar.Account|boolean}
 */
const validateRecipientExists = async (pub) => {
  try {
    return await server.loadAccount(pub);
  } catch (err) {
    return false;
  }
}

/**
 * Try to load the account for given public key from recipient 
 * to check if it exists
 * @param {recipient: string, amount: string} row 
 * @return {recipient: string, amount: string, account: Stellar.Account} when account exists
 * @return {} when account does not exist
 */
const validateRecipientExistsForRow = async (row) => {
  try {
    let account = await server.loadAccount(row.recipient);
    row.account = account;

    return row;

  } catch (err) {
    fileTools.appendLog(row.recipient, false, 'Account does not exist');
    
    return {};
  }
}


/**
 * @param {string} trustorPub the account you want to allow trust from
 * @param {boolean} authorize authorize or deauthorize trust to trustor
 */
const allowTrust = async (trustorPub, authorize) => {
  let issuanceAccount = await loadAccount(config.iss.pub);
  let issuanceKeypair = await keypairFromPriv(config.iss.priv);

  let opts = {
    trustor: trustorPub,
    assetCode: config.asset.code,
    authorize
  };

  let transaction = new Stellar.TransactionBuilder(issuanceAccount)
    .addOperation(Stellar.Operation.allowTrust(opts))
    .build();

  transaction.sign(issuanceKeypair);

  return server.submitTransaction(transaction);
}

/**
 * Create account by funding it from stellar distribution account
 * @param {string} funderPriv 
 * @param {string} recipient 
 * @return {boolean} indicates if creation is successful
 */
const createAccount = async (funderPriv, recipient) => {
  let funderKeypair = await keypairFromPriv(funderPriv);
  let senderAccount = await loadAccount(funderKeypair.publicKey());
  
  let transaction = new Stellar.TransactionBuilder(senderAccount)
      .addOperation(Stellar.Operation.createAccount({
        destination: recipient,
        startingBalance: '1.5' // base amount in XLM
      }))
      .build();
  
  transaction.sign(funderKeypair);


  try {
    const transactionResult = await server.submitTransaction(transaction);
    return true;
    
  } catch (err) {
    throw err;
    return false;
  }
}

/**
 * Load full Stellar Keypair object from secret
 * @param {string} priv secret key
 * @return {Stellar.Keypair}
 */
const keypairFromPriv = async (priv) => Stellar.Keypair.fromSecret(priv);

/**
 * Create a custom Asset object
 * @param {string} code identificatin code for asset
 * @param {string} issuer public key of issuer account for custom asset
 * @return {Stellar.Asset}
 */
const createAssetObject = (code, issuer) => new Stellar.Asset(code, issuer);

/**
 * 
 * @param {Stellar.AccountResponse} src Sender's public key
 * @param {Stellar.Keypair} keypair Keypair of distributor account
 * @param {string} des Receiver's public key
 * @param {number} amount Amount transferred
 * @param {Stellar.Asset} asset Asset object
 * @return {boolean} Indicates success of completion
 */
const makePayment = async (des, amount, asset) => {
  // Format amount
  let amountString = amount.toString(); 
  let begin = amountString.slice(0,(amountString.indexOf(".") + 1))
  let end = amountString.slice((amountString.indexOf(".") + 1));
  let trimmedAmount = `${begin}${end.slice(0,7)}`;

  let issuanceKeypair = await keypairFromPriv(config.iss.priv);
  let funderKeypair = await keypairFromPriv(config.dis.priv);
  let funderAccount = await loadAccount(funderKeypair.publicKey());

  // const srcAcc = await loadAccount(src);
  const transaction = new Stellar.TransactionBuilder(funderAccount)
    .addOperation(Stellar.Operation.allowTrust({
      trustor: des,
      assetCode: config.asset.code,
      authorize: true,
      source: issuanceKeypair.publicKey()
    }))
    .addOperation(Stellar.Operation.payment({
      destination: des,
      asset: asset,
      amount: trimmedAmount
    }))
    .addOperation(Stellar.Operation.allowTrust({
      trustor: des,
      assetCode: config.asset.code,
      authorize: false,
      source: issuanceKeypair.publicKey()
    }))
    .build();      

  
  transaction.sign(funderKeypair);
  transaction.sign(issuanceKeypair);

  return server.submitTransaction(transaction);
}

/**
 * Send payments for all filtered accounts which apply to criteria (exist, trustline)
 * @param {[ { recipient:string, amount:string, account: Stellar.Account } ]} filteredAccounts 
 */
async function sendTransactions(filteredAccounts) {
  let assetObject = await createAssetObject(config.asset.code, config.iss.pub);

  const transactionsPromiseArray = filteredAccounts.map(txData =>
      makePayment(txData.recipient, txData.amount, assetObject)
  );

  try {
    await Promise.all(transactionsPromiseArray);
    return true;
  } catch (err) {
    console.log(err);
    return false;
  }
}

module.exports = {
  loadAccount,
  keypairFromPriv,
  makePayment,
  createAssetObject,
  validateRecipientExists,
  validateRecipientExistsForRow,
  createAccount,
  sendTransactions,
  allowTrust
};

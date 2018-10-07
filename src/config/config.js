require('dotenv').config();

module.exports = {
  iss: {
    pub: process.env.ISS_PUB,
    priv: process.env.ISS_PRIV
  },
  dis: {
    pub: process.env.DIS_PUB,
    priv: process.env.DIS_PRIV
  },
  stellar: {
    pub: process.env.STELLAR_PUB,
    priv: process.env.STELLAR_PRIV
  },
  asset: {
    code: process.env.ASSET
  },
  testnet: process.env.TESTNET
}

// Stellar source account is same as EVER source account in this example
// Remove priv keys and input them from cmd via read package
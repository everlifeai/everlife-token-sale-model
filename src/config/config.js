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
  asset: {
    code: process.env.ASSET
  },
  testnet: process.env.TESTNET
}

// Stellar source account is same as EVER source account in this example
// Remove priv keys and input them from cmd via read package
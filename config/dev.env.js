const merge = require('webpack-merge')
const prodEnv = require('./mainnet.env')

module.exports = merge(prodEnv, {
  NODE_ENV: '"development"',

  WALLET_DEPLOYED_URL: '"https://wallet.ebakus.test"',

  LOCAL_NODE_URL: '"ws://127.0.0.1:8546"',

  // TESTNET_EXPLORER_URL: '"https://explorer.ebakus.test"',
  // TESTNET_API_ENDPOINT: '"https://explorer-api.ebakus.test"',
  DEFAULT_NETWORK_ID: 10,

  FAUCET_CONTRACT_ADDRESS: '"0xd7ee36010dc02878a9cddc23bea945dc75caab89"',

  ENS_CONTRACT_ADDRESS: '"0x02C8b1bE10299302D6dD7cCf951D78615fdDC0e6"',
})

const merge = require('webpack-merge')
const prodEnv = require('./mainnet.env')

module.exports = merge(prodEnv, {
  NODE_ENV: '"development"',
  LOCAL_NODE_URL: '"ws://127.0.0.1:8546"',

  // TESTNET_EXPLORER_URL: '"https://explorer.ebakus.test"',
  // TESTNET_API_ENDPOINT: '"https://explorer-api.ebakus.test"',
  DEFAULT_NETWORK_ID: 10,
})

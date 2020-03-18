const merge = require('webpack-merge')
const prodEnv = require('./mainnet.env')

module.exports = merge(prodEnv, {
  WALLET_DEPLOYED_URL: '"https://wallet.ebakus-testnet.com"',
  DEFAULT_NETWORK_ID: 7,
})

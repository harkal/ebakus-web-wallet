const merge = require('webpack-merge')
const prodEnv = require('./mainnet.env')

module.exports = merge(prodEnv, {
  WALLET_DEPLOYED_URL: '"https://wallet.ebakus-testnet.com"',
  DEFAULT_NETWORK_ID: 7,

  FAUCET_CONTRACT_ADDRESS: '"0xd7ee36010dc02878a9cddc23bea945dc75caab89"',

  ENS_CONTRACT_ADDRESS: '"0x02C8b1bE10299302D6dD7cCf951D78615fdDC0e6"',
})

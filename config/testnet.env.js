const merge = require('webpack-merge')
const prodEnv = require('./mainnet.env')

module.exports = merge(prodEnv, {
  DEFAULT_NETWORK_ID: 7,
})

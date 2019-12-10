const merge = require('webpack-merge')
const prodEnv = require('./prod.env')

module.exports = merge(prodEnv, {
  NODE_ENV: '"development"',
  NODE_URL: '"wss://node-test.ebakus.com"',
  // NODE_URL: '"https://noderpc.ebakus.com"',
  // NODE_URL: '"ws://127.0.0.1:8546"',
})

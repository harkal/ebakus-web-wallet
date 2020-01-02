module.exports = {
  NODE_ENV: '"production"',

  MAINNET_NODE_URL: '"wss://ws.ebakus.com"',
  MAINNET_EXPLORER_URL: '"https://explorer.ebakus.com"',
  MAINNET_API_ENDPOINT: '"https://explorersrv.ebakus.com"',

  TESTNET_NODE_URL: '"wss://ws.ebakus-testnet.com"',
  TESTNET_EXPLORER_URL: '"https://explorer.ebakus-testnet.com"',
  TESTNET_API_ENDPOINT: '"https://explorer-api.ebakus-testnet.com"',

  MAINNET_CHAIN_ID: 10,
  TESTNET_CHAIN_ID: 7,

  DEFAULT_NETWORK_ID: 10, // as defined in `actions/providers.js`

  FAUCET_CONTRACT_ADDRESS: '"0xb487e290dd71773b39f7250efe1496677c1400da"',
}

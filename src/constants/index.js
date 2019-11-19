import Web3 from 'web3'

const DefaultToken = 'EBK'
const DefaultDappWhitelistTimer = 3 * 1000

const SPINNER_RUNNING = 1 << 8
const SKIP_WALLET_ANIMATIONS = 1 << 16
const SpinnerState = {
  SPINNER_RUNNING,
  SKIP_WALLET_ANIMATIONS,
  NONE: 1 + SKIP_WALLET_ANIMATIONS,
  SUCCESS: 2,
  FAIL: 3 + SKIP_WALLET_ANIMATIONS,
  CANCEL: 4 + SKIP_WALLET_ANIMATIONS,

  CALC_POW: 100 + SPINNER_RUNNING,

  WALLET_UNLOCK: 110 + SPINNER_RUNNING + SKIP_WALLET_ANIMATIONS,
  WALLET_ENCRYPT: 111 + SPINNER_RUNNING + SKIP_WALLET_ANIMATIONS,
  WALLET_IMPORT: 112 + SPINNER_RUNNING + SKIP_WALLET_ANIMATIONS,

  TRANSACTION_WHITELISTING: 121 + SKIP_WALLET_ANIMATIONS,
  TRANSACTION_WHITELISTED_TIMER: 122 + SPINNER_RUNNING,

  TRANSACTION_SENDING: 131 + SPINNER_RUNNING,
  TRANSACTION_SENT_SUCCESS: 132,

  NODE_SELECT: 140 + SKIP_WALLET_ANIMATIONS,
  NODE_CONNECT: 141 + SPINNER_RUNNING,
  NODE_CONNECTED: 142,
  NODE_DISCONNECTED: 143,
}

const Networks = {
  /**
   * id: {
   *   name - The network name
   *   testnet - In case it our ebakus testnet,
   *             then it will allow user to use the getWei from Faucet Contract
   *   endpoint - String representation of the URL to the node
   *   provider - function which return a new Web3 provider instance
   * }
   * */

  101: {
    name: 'Ebakus Testnet',
    testnet: true,
    provider: () => new Web3.providers.WebsocketProvider(process.env.NODE_URL),
  },
}

if (process.env.NODE_ENV === 'development') {
  Networks[1337] = {
    name: 'Ebakus Local node',
    testnet: true,
    provider: () => new Web3.providers.WebsocketProvider('ws://127.0.0.1:8546'),
  }
}

const NetworkStatus = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
}

const DialogComponents = {
  SEND_TX: 'SendTx',
  NO_FUNDS: 'NoFunds',
  DELETE_WALLET: 'DeleteWallet',
}

const StorageNames = {
  WALLET_STORE: 'wallet_store',
  LOGS: 'logs',
  WEB3_WALLET: 'web3js_wallet',
  WEB3_OLD_WALLET_BACKUP: 'web3DataBackup',
}

export {
  DefaultToken,
  DefaultDappWhitelistTimer,
  SpinnerState,
  Networks,
  NetworkStatus,
  DialogComponents,
  StorageNames,
}

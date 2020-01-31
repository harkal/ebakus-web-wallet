const DefaultToken = 'EBK'
const DefaultDappWhitelistTimer = 3 * 1000

const SPINNER_RUNNING = 1 << 8
const SKIP_WALLET_ANIMATIONS = 1 << 9
const SpinnerState = {
  SPINNER_RUNNING,
  SKIP_WALLET_ANIMATIONS,
  NONE: 1 + SKIP_WALLET_ANIMATIONS,
  SUCCESS: 2,
  FAIL: 3 + SKIP_WALLET_ANIMATIONS,
  CANCEL: 4,

  CALC_POW: 100 + SPINNER_RUNNING,

  WALLET_UNLOCK: 110 + SPINNER_RUNNING + SKIP_WALLET_ANIMATIONS,
  WALLET_ENCRYPT: 111 + SPINNER_RUNNING + SKIP_WALLET_ANIMATIONS,
  WALLET_IMPORT: 112 + SPINNER_RUNNING + SKIP_WALLET_ANIMATIONS,

  TRANSACTION_WHITELISTING: 121 + SKIP_WALLET_ANIMATIONS,
  TRANSACTION_WHITELISTED_TIMER: 122 + SPINNER_RUNNING,

  TRANSACTION_SENDING: 131 + SPINNER_RUNNING,
  TRANSACTION_SENT_SUCCESS: 132,
  TRANSACTION_SENT_CANCELLED: 133,

  NODE_SELECT: 140 + SKIP_WALLET_ANIMATIONS,
  NODE_CONNECT: 141 + SPINNER_RUNNING,
  NODE_CONNECTED: 142,
  NODE_DISCONNECTED: 143,

  LEDGER_CONNECT: 150 + SKIP_WALLET_ANIMATIONS,
  LEDGER_FETCH_ACCOUNTS: 151 + SPINNER_RUNNING + SKIP_WALLET_ANIMATIONS,
  LEDGER_CONFIRM: 153 + SPINNER_RUNNING + SKIP_WALLET_ANIMATIONS,
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
  10: {
    name: 'Ebakus Mainnet',
    testnet: false,
    endpoint: process.env.MAINNET_NODE_URL,
  },

  7: {
    name: 'Ebakus Testnet',
    testnet: true,
    endpoint: process.env.TESTNET_NODE_URL,
  },
}

if (process.env.NODE_ENV === 'development') {
  Networks[1337] = {
    name: 'Ebakus Local node',
    endpoint: process.env.LOCAL_NODE_URL,
  }
}

const NetworkStatus = {
  CONNECTED: 'connected',
  DISCONNECTED: 'disconnected',
}

const DialogComponents = {
  SEND_TX: 'SendTx',
  FAILED_TX: 'FailedTx',
  NO_FUNDS: 'NoFunds',
  DELETE_WALLET: 'DeleteWallet',
  LEDGER: 'Ledger',
}

const StorageNames = {
  WALLET_STORE: 'wallet_store',
  LOGS: 'logs',
  WEB3_WALLET: 'web3js_wallet',
  WEB3_OLD_WALLET_BACKUP: 'web3js_backup',
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

import Web3 from 'web3'

const DefaultToken = 'EBK'
const DefaultDappWhitelistTimer = 3 * 1000

const SPINNER_RUNNING = 1 << 8
const SpinnerState = {
  SPINNER_RUNNING,
  NONE: 0,
  SUCCESS: 1,
  FAIL: 2,
  CANCEL: 3,

  CALC_POW: 100 + SPINNER_RUNNING,

  WALLET_UNLOCK: 110 + SPINNER_RUNNING,
  WALLET_ENCRYPT: 111 + SPINNER_RUNNING,
  WALLET_IMPORT: 112 + SPINNER_RUNNING,

  TRANSACTION_WHITELISTING: 121,
  TRANSACTION_WHITELISTED_TIMER: 122 + SPINNER_RUNNING,

  TRANSACTION_SENDING: 131 + SPINNER_RUNNING,
  TRANSACTION_SENT_SUCCESS: 132,

  NODE_SELECT: 140,
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

  0: {
    name: 'Ebakus Testnet',
    testnet: true,
    provider: () =>
      new Web3.providers.WebsocketProvider(process.env.NODE_URL, {
        headers: {
          origin: 'webwallet',
        },
      }),
  },
}

if (process.env.NODE_ENV === 'development') {
  Networks[1] = {
    name: 'Ebakus Local node',
    testnet: true,
    provider: () =>
      new Web3.providers.WebsocketProvider('ws://127.0.0.1:8546', {
        headers: {
          origin: 'webwallet',
        },
      }),
  }
}

const StorageNames = {
  WEB3_WALLET: 'web3js_wallet',
  WEB3_OLD_WALLET_BACKUP: 'web3DataBackup',
}

export {
  DefaultToken,
  DefaultDappWhitelistTimer,
  SpinnerState,
  Networks,
  StorageNames,
}

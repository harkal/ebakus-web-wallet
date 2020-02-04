import { version } from '../../package.json'

import { DefaultToken, NetworkStatus } from '@/constants'

const initialState = {
  version,

  isStateLoaded: false,

  // current operating transaction at wallet
  tx: {
    object: {},
    jobId: null, // parentFrame handler id
    whitelistAnimationReady: false, // hack for blocking ui animations
  },

  amountOfWork: true, // true: for auto estimation, number: for a pre-specified value
  singleTxAmountOfWork: false, // true: for auto estimation, number: for a pre-specified value

  // network preferences
  network: {
    networkId: process.env.DEFAULT_NETWORK_ID,
    chainId: process.env.DEFAULT_NETWORK_ID,
    nodeAddress: '',
    status: NetworkStatus.DISCONNECTED,

    hardwareWallets: {
      ledger: {
        supportedConnectionTypes: [],
      },
    },
  },

  // custom ERC-20 tokens set by the dApp developer
  tokens: [],

  // dApp whitelisting based on parent frame origin
  whitelist: {
    /*
    dappOrigin: {
      "contracts": [...address],
      "all": {
        "timer": 0 - 5,
      },
      //   method: {
      //     "timer": 0 - 5,
      //   },
    },
    */
  },

  // wallet global state
  wallet: {
    locked: true,
    address: null,
    balance: '0',
    staked: 0,
    tokenSymbol: DefaultToken,

    // isUsingHardwareWallet: false,
    hardwareWallet: {
      type: null,
      accountIndex: null,
    },
  },

  // transaction history, each entry will have a timestamp (sort)
  history: {
    local: [
      /* ...receipts */
    ],
    remote: [
      /* ...receipts */
    ],
  },

  // UI global state
  ui: {
    isDrawerActive: false,
    isDrawerActiveByUser: false,

    isSpinnerActive: false,
    currentSpinnerState: 0,

    overlayColor: null,

    dialog: {
      active: false,
      component: '',
      title: '',
      data: null,
    },
  },

  // isSafariAllowed: false, // warn users that dapps doesn't share same wallet on behalf of privacy
  isSafariAllowed: true, // we decided to allow Safari for better UX for now
}

export default () => ({
  ...JSON.parse(JSON.stringify(initialState)),
})

import { version } from '../../package.json'

import { DefaultToken, NetworkStatus } from '@/constants'

const initialState = {
  version,

  // current operating transaction at wallet
  tx: {
    object: {},
    jobId: null, // parentFrame handler id
    whitelistAnimationReady: false, // hack for blocking ui animations
  },

  // netwrok preferences
  network: {
    id: 0,
    nodeAddress: '',
    status: NetworkStatus.DISCONNECTED,
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
    address: null, // TODO: add getter that gives the checksumAddress
    balance: '0', // TODO: add getters for getting balanceInEther, etc
    tokenSymbol: DefaultToken,
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
    },
  },
}

export default () => ({
  ...JSON.parse(JSON.stringify(initialState)),
})

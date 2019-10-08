import { version } from '../../package.json'

import { DefaultToken } from '../constants'

export default {
  version,

  // current operating transaction at wallet
  tx: {
    object: {},
  },

  // netwrok preferences
  network: {
    id: 0,
    nodeAddress: '',
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
    address: null,
    balance: '0',
    token: DefaultToken,
  },

  // transaction history
  history: [
    /* ...receipts */
  ],

  // UI global state
  ui: {
    isDrawerActive: false,
    isDrawerActiveByUser: false,

    isSpinnerActive: false,
    currentSpinnerState: 0,

    // isPopUpActive: false,

    // popUpContent: {
    //   type: '',
    //   title: '',
    //   subtitle: '',
    //   content: '',
    //   data: null,
    //   actions: [
    //     {
    //       button: 'full',
    //       label: '',
    //     },
    //   ],
    // },
  },
}

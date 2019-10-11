import { version } from '../../package.json'

import { DefaultToken, SpinnerState, StorageNames } from '@/constants'

import defaultState from './state'
import MutationTypes from './mutation-types'

export default {
  [MutationTypes.INITIALISE_STORE](state) {
    let newState = { ...state }

    // preload store from localStorage
    if (localStorage.getItem('wallet_store')) {
      let store = JSON.parse(localStorage.getItem('wallet_store'))

      // check the version stored against current
      // If different, don't load the cached version
      if (store.version == version) {
        newState = { ...newState, ...store }
      } else {
        // TODO: maybe we can deep merge
        newState.version = version
      }
    }

    if (localStorage.getItem('logs')) {
      const logs = JSON.parse(localStorage.getItem('logs'))
      newState = {
        ...newState,
        history: [...newState.history, ...logs],
      }
    }

    if (localStorage.getItem(StorageNames.WEB3_WALLET)) {
      const web3data = JSON.parse(
        localStorage.getItem(StorageNames.WEB3_WALLET)
      )
      console.log('web3data: ', web3data)
      newState = {
        ...newState,
        wallet: { ...newState.wallet, address: web3data[0].address },
      }
    }

    this.replaceState(newState)
  },

  [MutationTypes.ACTIVATE_DRAWER](state, userAction) {
    state.ui.isDrawerActive = true
    state.ui.isDrawerActiveByUser = userAction === false ? false : true // default: true
  },
  [MutationTypes.DEACTIVATE_DRAWER](state) {
    state.ui.isDrawerActive = false
  },

  [MutationTypes.SET_SPINNER_STATE](state, spinnerState) {
    state.ui.currentSpinnerState = spinnerState
    state.ui.isSpinnerActive = !!(spinnerState & SpinnerState.SPINNER_RUNNING)
  },

  [MutationTypes.UNLOCK_WALLET](state) {
    state.wallet.locked = false
  },
  [MutationTypes.SET_WALLET_ADDRESS](state, address) {
    state.wallet.address = address
  },
  [MutationTypes.SET_WALLET_BALANCE](state, balance) {
    state.wallet.balance = balance
  },
  [MutationTypes.SET_ACTIVE_TOKEN](state, token = DefaultToken) {
    state.wallet.token = token
  },

  [MutationTypes.SET_TOKENS](state, tokens) {
    state.tokens = tokens
  },

  [MutationTypes.SET_LOGS](state, data) {
    state.history = data
  },
  [MutationTypes.ADD_LOCAL_LOG](state, data) {
    if (!data.timestamp) {
      const now = new Date()
      const timestamp = Math.round(now.getTime() / 1000)
      data.timestamp = timestamp
    }

    state.history.unshift(data)

    let logs = []
    if (localStorage.getItem('logs')) {
      logs = JSON.parse(localStorage.getItem('logs'))
    }
    logs.unshift(data)

    localStorage.setItem('logs', JSON.stringify(logs))
  },

  [MutationTypes.SET_TX_OBJECT](state, tx) {
    state.tx.object = tx
  },
  [MutationTypes.CLEAR_TX](state) {
    state.tx = { ...defaultState.tx }
  },

  [MutationTypes.SET_NETWORK](state, data) {
    const { networkId, nodeAddress } = data
    state.network = {
      network_id: networkId,
      node_address: networkId == '-1' ? nodeAddress : '',
    }
    localStorage.setItem(
      'network',
      JSON.stringify({
        networkId,
        nodeAddress,
      })
    )
  },

  [MutationTypes.SET_OVERLAY_COLOR](state, color) {
    state.ui.overlayColor = color
  },
  [MutationTypes.UNSET_OVERLAY_COLOR](state) {
    state.ui.overlayColor = defaultState.ui.overlayColor
  },

  [MutationTypes.SHOW_DIALOG](state, data) {
    state.ui.dialog = { ...defaultState.ui.dialog, ...data, active: true }
  },
  [MutationTypes.CLEAR_DIALOG](state) {
    state.ui.dialog = { ...defaultState.ui.dialog }
  },

  /* -- Whitelisting mutations -- */
  [MutationTypes.SET_DAPP_WHITELIST](
    state,
    { origin, contractAddress, timer }
  ) {
    const curOrigin = {
      all: {
        timer: null,
      },
      ...state.whitelist[origin],
    }
    state.whitelist = {
      ...state.whitelist,
      [origin]: {
        ...curOrigin,
        contracts: [
          ...(curOrigin.contracts ? curOrigin.contracts : []),
          ...(curOrigin.contracts &&
          !curOrigin.contracts.includes(contractAddress)
            ? [contractAddress]
            : []),
        ],
        all: {
          ...curOrigin.all,
          timer,
        },
      },
    }
  },
  [MutationTypes.SET_DAPP_WHITELIST_TIMER](state, { origin, timer }) {
    const curOrigin = {
      all: {
        timer: null,
      },
      ...state.whitelist[origin],
    }
    state.whitelist = {
      ...state.whitelist,
      [origin]: {
        ...curOrigin,
        all: {
          ...curOrigin.all,
          timer,
        },
      },
    }
  },
  [MutationTypes.ADD_CONTRACT_TO_DAPP_WHITELIST](
    state,
    { origin, contractAddress }
  ) {
    const curOrigin = {
      ...state.whitelist[origin],
    }
    state.whitelist = {
      ...state.whitelist,
      [origin]: {
        ...curOrigin,
        contracts: [
          ...(curOrigin.contracts ? curOrigin.contracts : []),
          ...(curOrigin.contracts &&
          !curOrigin.contracts.includes(contractAddress)
            ? [contractAddress]
            : []),
        ],
      },
    }
  },
  [MutationTypes.REMOVE_DAPP_FROM_WHITELIST](state, origin) {
    delete state.whitelist[origin]
    state.whitelist = { ...state.whitelist }
  },
}

import { version } from '../../package.json'

import { DefaultToken, SpinnerState } from '../constants'

import defaultState from './state'

import {
  INITIALISE_STORE,
  ACTIVATE_DRAWER,
  DEACTIVATE_DRAWER,
  SET_SPINNER_STATE,
  SET_WALLET_ADDRESS,
  SET_WALLET_BALANCE,
  SET_ACTIVE_TOKEN,
  SET_TOKENS,
  SET_LOGS,
  ADD_LOCAL_LOG,
  SET_NETWORK,
  SET_TX_OBJECT,
  CLEAR_TX,
  SET_DAPP_WHITELIST,
  SET_DAPP_WHITELIST_TIMER,
  ADD_CONTRACT_TO_DAPP_WHITELIST,
  REMOVE_DAPP_FROM_WHITELIST,
} from './mutation-types'

export default {
  [INITIALISE_STORE](state) {
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

    if (localStorage.getItem('web3js_wallet')) {
      const web3data = JSON.parse(localStorage.getItem('web3js_wallet'))
      console.log('web3data: ', web3data)
      newState = {
        ...newState,
        wallet: { ...newState.wallet, address: web3data[0].address },
      }
    }

    this.replaceState(newState)
  },

  [ACTIVATE_DRAWER](state, userAction) {
    state.ui.isDrawerActive = true
    state.ui.isDrawerActiveByUser = userAction === false ? false : true // default: true
  },
  [DEACTIVATE_DRAWER](state) {
    state.ui.isDrawerActive = false
  },

  [SET_SPINNER_STATE](state, spinnerState) {
    state.ui.currentSpinnerState = spinnerState
    state.ui.isSpinnerActive = !!(spinnerState & SpinnerState.SPINNER_RUNNING)
  },

  [SET_WALLET_ADDRESS](state, address) {
    state.wallet.address = address
  },
  [SET_WALLET_BALANCE](state, balance) {
    state.wallet.balance = balance
  },
  [SET_ACTIVE_TOKEN](state, token = DefaultToken) {
    state.wallet.token = token
  },

  [SET_TOKENS](state, tokens) {
    state.tokens = tokens
  },

  [SET_LOGS](state, data) {
    state.history = data
  },
  [ADD_LOCAL_LOG](state, data) {
    state.history.unshift(data)

    let logs = []
    if (localStorage.getItem('logs')) {
      logs = JSON.parse(localStorage.getItem('logs'))
    }

    // TODO: add timestamp if missing

    localStorage.setItem('logs', JSON.stringify(logs))
  },

  [SET_TX_OBJECT](state, tx) {
    state.tx.object = tx
  },
  [CLEAR_TX](state) {
    state.tx = defaultState.tx
  },

  [SET_NETWORK](state, data) {
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

  /* -- Whitelisting mutations -- */
  [SET_DAPP_WHITELIST](state, { origin, contractAddress, timer }) {
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
  [SET_DAPP_WHITELIST_TIMER](state, { origin, timer }) {
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
  [ADD_CONTRACT_TO_DAPP_WHITELIST](state, { origin, contractAddress }) {
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
  [REMOVE_DAPP_FROM_WHITELIST](state, origin) {
    delete state.whitelist[origin]
    state.whitelist = { ...state.whitelist }
  },
}

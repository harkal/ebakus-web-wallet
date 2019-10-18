import Web3 from 'web3'

import { version } from '../../package.json'

import { web3 } from '@/actions/web3ebakus'
import { DefaultToken, SpinnerState, StorageNames } from '@/constants'

import initialState from './state'
import MutationTypes from './mutation-types'

export default {
  [MutationTypes.INITIALISE_STORE](state) {
    let newState = { ...state }

    // preload store from localStorage
    if (localStorage.getItem(StorageNames.WALLET_STORE)) {
      let store = JSON.parse(localStorage.getItem(StorageNames.WALLET_STORE))

      // check the version stored against current
      // If different, don't load the cached version
      if (store.version == version) {
        newState = { ...newState, ...store }
      } else {
        // TODO: maybe we can deep merge
        newState.version = version
      }
    }

    if (localStorage.getItem(StorageNames.LOGS)) {
      const logs = JSON.parse(localStorage.getItem(StorageNames.LOGS))
      newState = {
        ...newState,
        history: {
          ...newState.history,
          local: [...newState.history.local, ...logs],
        },
      }
    }

    if (localStorage.getItem(StorageNames.WEB3_WALLET)) {
      const web3data = JSON.parse(
        localStorage.getItem(StorageNames.WEB3_WALLET)
      )
      const tempWeb3 = new Web3()
      const address = tempWeb3.utils.toChecksumAddress(web3data[0].address)
      newState = {
        ...newState,
        wallet: { ...newState.wallet, address: address },
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
    state.wallet.address = web3.utils.toChecksumAddress(address)
  },
  [MutationTypes.SET_WALLET_BALANCE](state, balance) {
    state.wallet.balance = balance
  },
  [MutationTypes.SET_ACTIVE_TOKEN](state, token = DefaultToken) {
    state.wallet.token = token
  },

  [MutationTypes.DELETE_WALLET](state) {
    Object.keys(state).forEach(key => {
      state[key] = initialState()[key]
    })
    state.ui.isDrawerActive = true
  },

  [MutationTypes.SET_TOKENS](state, tokens) {
    state.tokens = tokens
  },

  [MutationTypes.PUSH_LOGS](state, data) {
    state.history.remote = data
  },
  [MutationTypes.ADD_LOCAL_LOG](state, data) {
    if (!data.timestamp) {
      const now = new Date()
      const timestamp = Math.round(now.getTime() / 1000)
      data.timestamp = timestamp
    }

    state.history.local.unshift(data)

    let logs = []
    if (localStorage.getItem(StorageNames.LOGS)) {
      logs = JSON.parse(localStorage.getItem(StorageNames.LOGS))
    }
    logs.unshift(data)

    localStorage.setItem(StorageNames.LOGS, JSON.stringify(logs))
  },
  [MutationTypes.RESET_LOGS](state) {
    state.history = { ...initialState().history }
    localStorage.removeItem(StorageNames.LOGS)
  },

  [MutationTypes.SET_TX_OBJECT](state, tx) {
    state.tx.object = tx
  },
  [MutationTypes.SET_TX_JOB_ID](state, jobId) {
    state.tx.jobId = jobId
  },
  [MutationTypes.CLEAR_TX](state) {
    state.tx = { ...initialState().tx }
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
    state.ui.overlayColor = initialState().ui.overlayColor
  },

  [MutationTypes.SHOW_DIALOG](state, data) {
    state.ui.dialog = { ...initialState().ui.dialog, ...data, active: true }
  },
  [MutationTypes.CLEAR_DIALOG](state) {
    state.ui.dialog = { ...initialState().ui.dialog }
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

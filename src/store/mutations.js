import merge from 'lodash/merge'

import { version } from '../../package.json'

import { web3 } from '@/actions/web3ebakus'
import Transaction from '@/actions/Transaction'

import {
  DefaultToken,
  NetworkStatus,
  SpinnerState,
  StorageNames,
  HardwareWalletTypes,
} from '@/constants'

import { loadedInIframe } from '@/parentFrameMessenger/parentFrameMessenger.js'

import initialState from './state'
import MutationTypes from './mutation-types'

export default {
  [MutationTypes.INITIALISE_STORE](state) {
    let newState = { ...state, isStateLoaded: true }

    // preload store from localStorage
    if (localStorage.getItem(StorageNames.WALLET_STORE)) {
      let store = JSON.parse(localStorage.getItem(StorageNames.WALLET_STORE))

      // check the version stored against current
      // If different, don't load the cached version
      if (store.version == version) {
        newState = merge({}, newState, store)
      } else {
        newState.version = version
      }
    }

    const localStorageLogsName =
      newState.wallet.hardwareWallet.type !== null
        ? StorageNames.HARDWARE_WALLET_LOGS
        : StorageNames.LOGS

    if (localStorage.getItem(localStorageLogsName)) {
      const logs = JSON.parse(localStorage.getItem(localStorageLogsName))
      newState = {
        ...newState,
        history: {
          ...newState.history,
          local: [...newState.history.local, ...logs],
        },
      }
    }

    this.replaceState(newState)
  },

  [MutationTypes.MERGE_REMOTE_STORE](state, remoteState) {
    let newState = { ...state }

    if (remoteState) {
      if (remoteState.version == version) {
        newState = merge({}, newState, remoteState)
      } else {
        newState.version = version
      }
    }

    this.replaceState(newState)
  },
  [MutationTypes.STORE_LOADED](state) {
    state.isStateLoaded = true
  },

  [MutationTypes.ACTIVATE_DRAWER](state, userAction = false) {
    state.ui.isDrawerActive = true
    // support self-hosted wallet UI, where drawer is always active
    if (!loadedInIframe()) {
      return
    }
    state.ui.isDrawerActiveByUser = !!userAction
  },
  [MutationTypes.DEACTIVATE_DRAWER](state) {
    // support self-hosted wallet UI, where drawer is always active
    state.ui.isDrawerActive = !loadedInIframe() ? true : false
  },

  [MutationTypes.SET_SPINNER_STATE](state, spinnerState) {
    // hack for blocking display of whitelist status bar, till animation happens
    // hack placed in here as spinnerState watcher is used for animations
    const tx = state.tx
    if (tx instanceof Transaction) {
      if (
        !tx.allowWhitelistAnimations &&
        spinnerState == SpinnerState.TRANSACTION_WHITELISTED_TIMER
      ) {
        tx.allowWhitelistAnimations = true
      }
    }

    state.ui.currentSpinnerState = spinnerState
    state.ui.isSpinnerActive = !!(spinnerState & SpinnerState.SPINNER_RUNNING)
  },

  [MutationTypes.UNLOCK_WALLET](state) {
    state.wallet.locked = false
  },
  [MutationTypes.SET_WALLET_ADDRESS](state, address) {
    state.wallet.address =
      address !== null && web3.utils.isAddress(address)
        ? web3.utils.toChecksumAddress(address)
        : null
  },
  [MutationTypes.SET_WALLET_BALANCE](state, balance) {
    state.wallet.balance = balance
  },
  [MutationTypes.SET_WALLET_STAKED](state, staked) {
    state.wallet.staked = staked
  },
  [MutationTypes.SET_WALLET_UNSTAKING](state, unstaking) {
    state.wallet.unstaking = unstaking
  },
  [MutationTypes.SET_WALLET_CLAIMABLE](state, claimable) {
    state.wallet.claimable = claimable
  },
  [MutationTypes.SET_ACTIVE_TOKEN](state, tokenSymbol = DefaultToken) {
    state.wallet.tokenSymbol = tokenSymbol
  },

  [MutationTypes.SET_HARDWARE_WALLET_TYPE_INTERNAL_MUTATE](
    state,
    { type, connectionType }
  ) {
    state.wallet.hardwareWallet = {
      ...state.wallet.hardwareWallet,
      type,
    }

    if (type === HardwareWalletTypes.LEDGER) {
      state.network.hardwareWallets.ledger.connectionType = connectionType
    }
  },
  [MutationTypes.SET_HARDWARE_WALLET_ACCOUNT_INDEX](state, index) {
    state.wallet.hardwareWallet = {
      ...state.wallet.hardwareWallet,
      accountIndex: index,
    }
  },

  [MutationTypes.SIGN_OUT_WALLET](state) {
    const initState = initialState()

    /* eslint-disable-next-line no-unused-vars */
    const { status, hardwareWallets, ...keepNetworkKeys } = state.network

    const cleanDataKeys = ['wallet', 'history', 'network']

    Object.keys(state).forEach(key => {
      if (!cleanDataKeys.includes(key)) {
        return
      }

      if (Array.isArray(initState[key])) {
        state[key] = [...initState[key]]
      } else if (
        typeof initState[key] === 'object' &&
        initState[key] !== null
      ) {
        // Object.assign({}, initState[key])
        state[key] = { ...initState[key] }
      } else {
        state[key] = initState[key]
      }
    })

    state.network = { ...state.network, ...keepNetworkKeys }
  },

  [MutationTypes.DELETE_WALLET](state) {
    const initState = initialState()
    Object.keys(state).forEach(key => {
      if (Array.isArray(initState[key])) {
        state[key] = [...initState[key]]
      } else if (
        typeof initState[key] === 'object' &&
        initState[key] !== null
      ) {
        state[key] = { ...initState[key] }
      } else {
        state[key] = initState[key]
      }
    })
    state.ui.isDrawerActive = true
  },

  [MutationTypes.CLEAR_STATE_FOR_HD_WALLET](state) {
    const initState = initialState()

    const cleanDataKeys = ['wallet', 'history']

    Object.keys(state).forEach(key => {
      if (!cleanDataKeys.includes(key)) {
        return
      }

      if (Array.isArray(initState[key])) {
        state[key] = [...initState[key]]
      } else if (
        typeof initState[key] === 'object' &&
        initState[key] !== null
      ) {
        state[key] = { ...initState[key] }
      } else {
        state[key] = initState[key]
      }
    })
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
  },
  [MutationTypes.RESET_LOGS](state) {
    const localStorageLogsName =
      state.wallet.hardwareWallet.type !== null
        ? StorageNames.HARDWARE_WALLET_LOGS
        : StorageNames.LOGS

    state.history = { ...initialState().history }
    localStorage.removeItem(localStorageLogsName)
  },

  [MutationTypes.SET_TX_OBJECT](state, tx) {
    state.tx = tx
  },
  [MutationTypes.CLEAR_TX](state) {
    state.tx = initialState().tx
  },
  [MutationTypes.SET_AMOUNT_OF_WORK](state, work) {
    state.amountOfWork = typeof work === 'number' ? work : true
  },
  [MutationTypes.SET_SINGLE_TX_AMOUNT_OF_WORK](state, work) {
    state.singleTxAmountOfWork = typeof work === 'number' ? work : true
  },

  [MutationTypes.SET_NETWORK](state, data) {
    const { networkId, nodeAddress } = data

    state.network = {
      ...initialState().network,
      networkId: networkId,
      nodeAddress: networkId == '-1' ? nodeAddress : '',
      status: NetworkStatus.DISCONNECTED,
      hardwareWallets: { ...state.network.hardwareWallets },
    }
  },
  [MutationTypes.SET_NETWORK_CHAIN_ID](state, chainId) {
    state.network.chainId = chainId
  },
  [MutationTypes.SET_NETWORK_STATUS](state, status) {
    state.network.status = status
  },
  [MutationTypes.SET_LEDGER_SUPPORTED_CONNECTION_TYPES](state, types) {
    state.network.hardwareWallets.ledger.supportedConnectionTypes = types
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
          contractAddress &&
          !curOrigin.contracts.includes(contractAddress)
            ? [web3.utils.toChecksumAddress(contractAddress)]
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
            ? [web3.utils.toChecksumAddress(contractAddress)]
            : []),
        ],
      },
    }
  },
  [MutationTypes.REMOVE_DAPP_FROM_WHITELIST](state, origin) {
    delete state.whitelist[origin]
    state.whitelist = { ...state.whitelist }
  },

  [MutationTypes.GRANT_SAFARI_ACCESS](state) {
    state.isSafariAllowed = true
  },
}

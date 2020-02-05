import {
  localStorageGetFromParent,
  getTargetOrigin,
} from '@/parentFrameMessenger/parentFrameMessenger'
import { StorageNames } from '@/constants'

import MutationTypes from './mutation-types'

export default {
  async [MutationTypes.INITIALISE_REMOTE_STORE](context) {
    let newState = {}

    // preload store from remote localStorage
    const walletStore = await localStorageGetFromParent(
      StorageNames.WALLET_STORE
    )
    if (walletStore) {
      let store = JSON.parse(walletStore)
      newState = { ...store }
    }

    const {
      wallet: { hardwareWallet: { type: hardwareWalletType = null } = {} } = {},
    } = newState
    const localStorageLogsName =
      hardwareWalletType !== null
        ? StorageNames.HARDWARE_WALLET_LOGS
        : StorageNames.LOGS
    const logs = await localStorageGetFromParent(localStorageLogsName)
    if (logs) {
      let parsedLogs = JSON.parse(logs)
      newState = {
        ...newState,
        history: {
          local: { ...parsedLogs },
        },
      }
    }

    const web3data = await localStorageGetFromParent(StorageNames.WEB3_WALLET)
    if (web3data) {
      // backup iframe wallet if exists
      const currentWallet = localStorage.getItem(StorageNames.WEB3_WALLET)
      if (currentWallet && currentWallet !== web3data) {
        const targetOrigin = getTargetOrigin() || Date.now()
        localStorage.setItem(
          `${StorageNames.WEB3_OLD_WALLET_BACKUP}_${targetOrigin}`,
          currentWallet
        )
      }

      localStorage.setItem(StorageNames.WEB3_WALLET, web3data)
    }

    if (Object.keys(newState).length > 0) {
      context.commit(MutationTypes.MERGE_REMOTE_STORE, newState)
    }

    context.commit(MutationTypes.STORE_LOADED)
  },
  [MutationTypes.ACTIVATE_DRAWER](context) {
    context.commit(MutationTypes.ACTIVATE_DRAWER)
  },
  [MutationTypes.DEACTIVATE_DRAWER](context) {
    context.commit(MutationTypes.DEACTIVATE_DRAWER)
  },

  [MutationTypes.SET_SPINNER_STATE](context, spinnerState) {
    context.commit(MutationTypes.SET_SPINNER_STATE, spinnerState)
  },

  [MutationTypes.UNLOCK_WALLET](context) {
    context.commit(MutationTypes.UNLOCK_WALLET)
  },
  [MutationTypes.SET_WALLET_ADDRESS](context, address) {
    context.commit(MutationTypes.SET_WALLET_ADDRESS, address)
  },
  [MutationTypes.SET_WALLET_BALANCE](context, balance) {
    context.commit(MutationTypes.SET_WALLET_BALANCE, balance)
  },
  [MutationTypes.SET_WALLET_STAKED](context, staked) {
    context.commit(MutationTypes.SET_WALLET_STAKED, staked)
  },

  [MutationTypes.DELETE_WALLET](context) {
    context.commit(MutationTypes.DELETE_WALLET)
  },
  [MutationTypes.CLEAR_STATE_FOR_HD_WALLET](context) {
    context.commit(MutationTypes.CLEAR_STATE_FOR_HD_WALLET)
  },

  [MutationTypes.PUSH_LOGS](context, data) {
    context.commit(MutationTypes.PUSH_LOGS, data)
  },
  [MutationTypes.ADD_LOCAL_LOG](context, data) {
    context.commit(MutationTypes.ADD_LOCAL_LOG, data)
  },
  [MutationTypes.RESET_LOGS](context) {
    context.commit(MutationTypes.RESET_LOGS)
  },

  [MutationTypes.SET_TX_OBJECT](context, tx) {
    context.commit(MutationTypes.SET_TX_OBJECT, tx)
  },
  [MutationTypes.SET_TX_JOB_ID](context, jobId) {
    context.commit(MutationTypes.SET_TX_JOB_ID, jobId)
  },
  [MutationTypes.CLEAR_TX](context) {
    context.commit(MutationTypes.CLEAR_TX)
  },
  [MutationTypes.SET_SINGLE_TX_AMOUNT_OF_WORK](context, work) {
    context.commit(MutationTypes.SET_SINGLE_TX_AMOUNT_OF_WORK, work)
  },

  [MutationTypes.SET_HARDWARE_WALLET_TYPE](context, opts) {
    context.commit(MutationTypes.CLEAR_STATE_FOR_HD_WALLET)
    context.commit(MutationTypes.SET_HARDWARE_WALLET_TYPE_INTERNAL_MUTATE, opts)
  },
  [MutationTypes.SET_LEDGER_SUPPORTED_CONNECTION_TYPES](context, types) {
    context.commit(MutationTypes.SET_LEDGER_SUPPORTED_CONNECTION_TYPES, types)
  },

  [MutationTypes.UNSET_OVERLAY_COLOR](context) {
    context.commit(MutationTypes.UNSET_OVERLAY_COLOR)
  },

  [MutationTypes.SHOW_DIALOG](context, data) {
    context.commit(MutationTypes.SHOW_DIALOG, data)
  },
  [MutationTypes.CLEAR_DIALOG](context) {
    context.commit(MutationTypes.CLEAR_DIALOG)
  },

  [MutationTypes.SET_NETWORK_CHAIN_ID](context, chainId) {
    context.commit(MutationTypes.SET_NETWORK_CHAIN_ID, chainId)
  },
  [MutationTypes.SET_NETWORK_STATUS](context, data) {
    context.commit(MutationTypes.SET_NETWORK_STATUS, data)
  },
}

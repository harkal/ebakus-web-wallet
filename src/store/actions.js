import MutationTypes from './mutation-types'

export default {
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

  [MutationTypes.SHOW_DIALOG](context, data) {
    context.commit(MutationTypes.SHOW_DIALOG, data)
  },
  [MutationTypes.CLEAR_DIALOG](context) {
    context.commit(MutationTypes.CLEAR_DIALOG)
  },

  [MutationTypes.SET_NETWORK_STATUS](context, data) {
    context.commit(MutationTypes.SET_NETWORK_STATUS, data)
  },
}

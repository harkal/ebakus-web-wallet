import MutationTypes from './mutation-types'

export default {
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

  [MutationTypes.SHOW_DIALOG](context, data) {
    context.commit(MutationTypes.SHOW_DIALOG, data)
  },
}

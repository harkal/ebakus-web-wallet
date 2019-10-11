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

  [MutationTypes.SET_LOGS](context, data) {
    context.commit(MutationTypes.SET_LOGS, data)
  },
  [MutationTypes.ADD_LOCAL_LOG](context, data) {
    context.commit(MutationTypes.ADD_LOCAL_LOG, data)
  },
}

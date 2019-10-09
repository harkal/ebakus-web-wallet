import Vue from 'vue'
import Vuex from 'vuex'

import MutationTypes from './mutation-types'

import state from './state'
import getters from './getters'
import mutations from './mutations'
import actions from './actions'

Vue.use(Vuex)

const store = new Vuex.Store({
  state,
  getters,
  mutations,
  actions,
})

// subscribe to persist updates at localStorage
store.subscribe(({ type }, state) => {
  if (
    ![
      MutationTypes.SET_NETWORK,
      MutationTypes.SET_DAPP_WHITELIST,
      MutationTypes.SET_DAPP_WHITELIST_TIMER,
      MutationTypes.ADD_CONTRACT_TO_DAPP_WHITELIST,
      MutationTypes.REMOVE_DAPP_FROM_WHITELIST,
    ].includes(type)
  ) {
    return
  }

  let store = {
    version: state.version,
    network: state.network,
    whitelist: state.whitelist,
  }

  localStorage.setItem('wallet_store', JSON.stringify(store))
})

// accept actions and mutations as hot modules
if (process.env.NODE_ENV === 'development' && module.hot) {
  module.hot.accept(['./mutations', './actions'], () => {
    // require the updated modules
    // have to add .default here due to babel 6 module output
    const newMutations = require('./mutations').default
    const newActions = require('./actions').default

    // swap in the new modules and mutations
    store.hotUpdate({
      mutations: newMutations,
      actions: newActions,
    })
  })
}

export default store

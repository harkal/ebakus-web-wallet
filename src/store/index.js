import Vue from 'vue'
import Vuex from 'vuex'

import { StorageNames } from '@/constants'

import {
  loadedInIframe,
  localStorageSetToParent,
} from '@/parentFrameMessenger/parentFrameMessenger'

import { isSafari } from '@/utils'

import MutationTypes from './mutation-types'

import initialState from './state'
import getters from './getters'
import mutations from './mutations'
import actions from './actions'

Vue.use(Vuex)

const store = new Vuex.Store({
  strict: process.env.NODE_ENV !== 'production',
  state: initialState(),
  getters,
  mutations,
  actions,
})

// subscribe to persist updates at localStorage
store.subscribe(({ type }, state) => {
  if ([MutationTypes.ADD_LOCAL_LOG].includes(type)) {
    if (isSafari && state.isSafariAllowed && loadedInIframe()) {
      localStorageSetToParent(
        StorageNames.LOGS,
        JSON.stringify(state.history.local)
      )
    } else {
      localStorage.setItem(
        StorageNames.LOGS,
        JSON.stringify(state.history.local)
      )
    }

    return
  } else if (
    ![
      MutationTypes.SET_NETWORK,
      MutationTypes.SET_DAPP_WHITELIST,
      MutationTypes.SET_DAPP_WHITELIST_TIMER,
      MutationTypes.ADD_CONTRACT_TO_DAPP_WHITELIST,
      MutationTypes.REMOVE_DAPP_FROM_WHITELIST,
      MutationTypes.GRANT_SAFARI_ACCESS,
    ].includes(type)
  ) {
    return
  }

  let store = {
    version: state.version,
    network: state.network,
    whitelist: state.whitelist,
    isSafariAllowed: state.isSafariAllowed,
  }

  if (typeof store.network.status !== 'undefined') {
    delete store.network.status
  }

  if (isSafari && state.isSafariAllowed && loadedInIframe()) {
    localStorageSetToParent(StorageNames.WALLET_STORE, JSON.stringify(store))
  } else {
    localStorage.setItem(StorageNames.WALLET_STORE, JSON.stringify(store))
  }
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

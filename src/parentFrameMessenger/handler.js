import { addPendingTx } from '../actions/transactions'
import { getCurrentProviderEndpoint } from '../actions/providers'
import { getBalance as getBalanceFromWallet } from '../actions/wallet'
import { web3 } from '../actions/web3ebakus'
import { performWhitelistedAction } from '../actions/whitelist'

import MutationTypes from '../store/mutation-types'
import store from '../store'
import {
  replyToParentWindow,
  expandFrameInParentWindow,
} from './parentFrameMessenger'

const unlockWallet = () => {
  const { type, dialogue_type } = store.getters.popUPContent
  if (
    type === 'onboarding' ||
    (type === 'dialogue' && dialogue_type === 'unlockWallet')
  ) {
    activateDrawerIfClosed()
  }
}

const currentProviderEndpoint = payload => {
  const providerEndpoint = getCurrentProviderEndpoint()
  replyToParentWindow(providerEndpoint, null, payload)
}

const defaultAddress = payload => {
  const localAddr = web3.utils.toChecksumAddress(store.state.wallet.address)

  if (localAddr) {
    replyToParentWindow(localAddr, null, payload)
  } else {
    const err = {
      code: 'noAccountFound',
      desc: 'No account found in wallet',
    }
    replyToParentWindow(null, err, payload)
  }
}

const getBalance = payload => {
  getBalanceFromWallet()
    .then(balance => {
      replyToParentWindow(balance, null, payload)
    })
    .catch(err => {
      replyToParentWindow(null, err, payload)
    })
}

const sendTransaction = async payload => {
  const { req } = payload

  /* const pendingTx = */ await addPendingTx(req)

  const { type, dialogue_type } = store.getters.popUPContent

  if (
    type !== 'onboarding' &&
    (type !== 'dialogue' && dialogue_type !== 'unlockWallet')
  ) {
    performWhitelistedAction()
    return
  }

  activateDrawerIfClosed()
}

const externalFrameHandler = payload => {
  const { cmd } = payload

  if (cmd === 'currentProviderEndpoint') {
    currentProviderEndpoint(payload)
  } else if (cmd === 'defaultAddress') {
    defaultAddress(payload)
  } else if (cmd === 'getBalance') {
    getBalance(payload)
  } else if (cmd === 'sendTransaction') {
    sendTransaction(payload)
  }
}

const externalPassiveFrameHandler = payload => {
  const { cmd, req } = payload

  if (cmd === 'init') {
    if (typeof req === 'object') {
      const { tokens = [] } = req
      if (tokens.length > 0) {
        store.commit(MutationTypes.SET_TOKENS, tokens)
      }
    }
  } else if (cmd === 'unlockWallet') {
    unlockWallet()
  }
}

const requiresUserAction = cmd => {
  return ['unlockWallet', 'sendTransaction'].includes(cmd)
}

const activateDrawerIfClosed = () => {
  if (!store.getters.isDrawerActive) {
    expandFrameInParentWindow()
    store.commit('activateDrawer', false)
  }
}

export {
  externalFrameHandler,
  externalPassiveFrameHandler,
  requiresUserAction,
  activateDrawerIfClosed,
}

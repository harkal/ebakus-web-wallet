import { addPendingTx, calcWork } from '@/actions/transactions'
import { getCurrentProviderEndpoint } from '@/actions/providers'
import { getBalance as getBalanceFromWallet } from '@/actions/wallet'
import { performWhitelistedAction } from '@/actions/whitelist'

import MutationTypes from '@/store/mutation-types'
import store from '@/store'

import router, { RouteNames } from '@/router'

import {
  replyToParentWindow,
  frameEventConnectionStatusUpdated,
} from './parentFrameMessenger'

const unlockWallet = () => {
  const routeName = router.app.$route.name

  if ([RouteNames.NEW, RouteNames.UNLOCK].includes(routeName)) {
    store.commit(MutationTypes.ACTIVATE_DRAWER)
  }
}

const currentProviderEndpoint = payload => {
  const providerEndpoint = getCurrentProviderEndpoint()
  replyToParentWindow(providerEndpoint, null, payload)
}

const defaultAddress = payload => {
  const localAddr = store.state.wallet.address

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
  const { id, req } = payload

  store.dispatch(MutationTypes.SET_TX_JOB_ID, id)

  const pendingTx = await addPendingTx(req)
  calcWork(pendingTx)

  const routeName = router.app.$route.name

  if (![RouteNames.NEW, RouteNames.UNLOCK].includes(routeName)) {
    performWhitelistedAction()
    return
  }

  store.dispatch(MutationTypes.ACTIVATE_DRAWER)
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

  if (cmd === '_') {
    frameEventConnectionStatusUpdated(store.state.network.status)
  } else if (cmd === 'init') {
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

export { externalFrameHandler, externalPassiveFrameHandler, requiresUserAction }

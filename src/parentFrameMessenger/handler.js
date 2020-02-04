import { addPendingTx, calcWork } from '@/actions/transactions'
import { getCurrentProviderEndpoint } from '@/actions/providers'
import { getBalance as getBalanceFromWallet } from '@/actions/wallet'
import { performWhitelistedAction } from '@/actions/whitelist'
import { getStaked as getStakedFromNode } from '@/actions/systemContract'

import MutationTypes from '@/store/mutation-types'
import store from '@/store'

import router, { RouteNames } from '@/router'

import {
  replyToParentWindow,
  frameEventConnectionStatusUpdated,
} from './parentFrameMessenger'

const unlockWallet = () => {
  const { locked } = store.getters.wallet
  const routeName = router.app.$route.name

  if (
    locked &&
    [RouteNames.NEW, RouteNames.UNLOCK, RouteNames.SAFARI_WARNING].includes(
      routeName
    )
  ) {
    activateDrawerIfClosed()
  }
}

const currentProviderEndpoint = payload => {
  const providerEndpoint = getCurrentProviderEndpoint()
  replyToParentWindow(providerEndpoint, null, payload)
}

const defaultAddress = payload => {
  const { locked, address } = store.getters.wallet

  if (!locked && address) {
    replyToParentWindow(address, null, payload)
  } else {
    replyToParentWindow(
      null,
      {
        code: 'wallet_locked',
        msg: 'Wallet is either locked or no account has been linked to it',
      },
      payload
    )
  }
}

const getBalance = payload => {
  getBalanceFromWallet()
    .then(balance => {
      replyToParentWindow(balance, null, payload)
    })
    .catch(err => {
      replyToParentWindow(
        null,
        {
          code: 'balance_updater_failure',
          msg: err.message,
        },
        payload
      )
    })
}

const getStaked = payload => {
  getStakedFromNode()
    .then(stake => {
      replyToParentWindow(stake, null, payload)
    })
    .catch(err => {
      replyToParentWindow(
        null,
        {
          code: 'get_staked_failure',
          msg: err.message,
        },
        payload
      )
    })
}

const sendTransaction = async payload => {
  const { id, req } = payload

  store.dispatch(MutationTypes.SET_TX_JOB_ID, id)

  const pendingTx = await addPendingTx(req)
  calcWork(pendingTx)

  const routeName = router.app.$route.name

  if (
    ![RouteNames.NEW, RouteNames.UNLOCK, RouteNames.SAFARI_WARNING].includes(
      routeName
    )
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
  } else if (cmd === 'getStaked') {
    getStaked(payload)
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

const activateDrawerIfClosed = () => {
  if (!store.state.ui.isDrawerActive) {
    store.commit(MutationTypes.ACTIVATE_DRAWER, false)
  }
}

export {
  externalFrameHandler,
  externalPassiveFrameHandler,
  requiresUserAction,
  activateDrawerIfClosed,
}

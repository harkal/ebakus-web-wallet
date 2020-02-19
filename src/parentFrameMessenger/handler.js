import Transaction from '@/actions/Transaction'
import { getProviderEndpoint } from '@/actions/providers'
import { getBalance as getBalanceFromWallet } from '@/actions/wallet'
import { performWhitelistedAction } from '@/actions/whitelist'
import { getStaked as getStakedFromNode } from '@/actions/systemContract'

import MutationTypes from '@/store/mutation-types'
import store from '@/store'

import router, { RouteNames } from '@/router'

import {
  replyToParentWindow,
  frameEventConnectionStatusUpdated,
  getParentWindowCurrentJob,
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
  const providerEndpoint = getProviderEndpoint()
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

  try {
    await new Transaction(req, {
      id,
    })

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
  } catch (err) {
    console.warn('Failed to handle sendTransaction from parent: ', err)

    const currentJob = getParentWindowCurrentJob()
    const { data: { id: existingId, cmd } = {} } = currentJob || {}
    if (id === existingId && cmd === 'sendTransaction') {
      replyToParentWindow(
        null,
        {
          code: 'send_tx_cancel',
          msg: err.message,
        },
        payload
      )

      store.commit(MutationTypes.CLEAR_TX)
    }
  }
}

const externalFrameHandler = payload => {
  const { cmd } = payload

  if (cmd === 'currentProviderEndpoint') {
    currentProviderEndpoint(payload)

    /* defaultAddress has been deprecated at wallet-loader@0.1.5 */
  } else if (['defaultAddress', 'getAccount'].includes(cmd)) {
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

import {
  SpinnerState,
  DefaultDappWhitelistTimer,
  DialogComponents,
} from '@/constants'

import MutationTypes from '@/store/mutation-types'
import store from '@/store'

import {
  getTargetOrigin,
  loadedInIframe,
  shrinkFrameInParentWindow,
} from '@/parentFrameMessenger/parentFrameMessenger'
import { activateDrawerIfClosed } from '@/parentFrameMessenger/handler'

import router, { RouteNames } from '@/router'

import { calcWorkAndSendTx } from './transactions'
import { loadConfirmTxMsg } from './wallet'

let userOptedOutOnceForSession = false

const isContractCall = () => {
  const { to, data } = store.state.tx.object

  // const code = web3.eth.getCode(to)
  // const isContract = code != '0x0'

  // NOTE: we don't want to handle contract deploy calls
  return !!to && !!data
}

const loadWhitelistedDapp = () => {
  const origin = getTargetOrigin()
  return origin && store.getters.getDAppWhitelist(origin)
}

const isDappWhitelisted = () => {
  const { contracts = [] } = loadWhitelistedDapp() || {}
  return contracts.length > 0
}

const isContractCallWhitelisted = to => {
  if (!to) {
    to = store.state.tx.object.to
  }

  // auto-whitelist contracts if dapp is whitelisted and contracts are below 3
  const dapp = loadWhitelistedDapp()
  const { contracts = [] } = dapp || {}
  if (dapp != null && to && !contracts.includes(to) && contracts.length < 3) {
    whitelistDappAddNewContract()
    return true
  }

  return to && contracts.includes(to)
}

const getWhitelistDappTimer = () => {
  const { all: { timer = DefaultDappWhitelistTimer } = {} } =
    loadWhitelistedDapp() || {}
  return timer
}

const setWhitelistDappTimer = timer => {
  const origin = getTargetOrigin()
  if (origin) {
    store.commit(MutationTypes.SET_DAPP_WHITELIST_TIMER, {
      origin,
      timer: timer,
    })
  }
}

const removeDappFromWhitelist = () => {
  const origin = getTargetOrigin()
  if (origin) {
    userOptedOutOnceForSession = true
    store.commit(MutationTypes.REMOVE_DAPP_FROM_WHITELIST, origin)
  }
}

const showWhitelistNewDappView = () => {
  if (userOptedOutOnceForSession) {
    store.commit(MutationTypes.SHOW_DIALOG, {
      component: DialogComponents.SEND_TX,
      title: 'Send Confirmation',
    })
    return
  }

  store.commit(
    MutationTypes.SET_SPINNER_STATE,
    SpinnerState.TRANSACTION_WHITELISTING
  )

  router.push({ name: RouteNames.WHITELIST_DAPP })
}

const showAddContractToWhitelistedDappView = () => {
  if (userOptedOutOnceForSession) {
    store.commit(MutationTypes.SHOW_DIALOG, {
      component: DialogComponents.SEND_TX,
      title: 'Send Confirmation',
    })
    return
  }

  store.commit(
    MutationTypes.SET_SPINNER_STATE,
    SpinnerState.TRANSACTION_WHITELISTING
  )

  router.push({ name: RouteNames.WHITELIST_CONTRACT_FOR_DAPP })
}

const whitelistNewDapp = () => {
  const origin = getTargetOrigin()
  if (origin) {
    const { to } = store.state.tx.object
    console.log('origin', origin, 'contractAddress', to)

    store.commit(MutationTypes.SET_DAPP_WHITELIST, {
      origin,
      contractAddress: to,
      timer: DefaultDappWhitelistTimer,
    })
  }
}

const whitelistDappAddNewContract = () => {
  const origin = getTargetOrigin()
  if (origin) {
    const { to } = store.state.tx.object
    console.log('origin', origin, 'contractAddress', to)

    store.commit(MutationTypes.ADD_CONTRACT_TO_DAPP_WHITELIST, {
      origin,
      contractAddress: to,
    })
  }

  if (loadedInIframe() && !store.state.ui.isDrawerActiveByUser) {
    store.commit(MutationTypes.DEACTIVATE_DRAWER)
    shrinkFrameInParentWindow()
  }
}

const cancelWhitelistDapp = () => {
  console.log('Whitelisting origin was not allowed')

  userOptedOutOnceForSession = true

  store.commit(MutationTypes.SHOW_DIALOG, {
    component: DialogComponents.SEND_TX,
    title: 'Send Confirmation',
  })
}

const performWhitelistedAction = () => {
  const tx = store.state.tx.object

  if (isContractCall()) {
    const isCallWhitelisted = isContractCallWhitelisted()
    const { contracts = [] } = loadWhitelistedDapp() || {}

    if (!isCallWhitelisted && contracts.length > 3) {
      showAddContractToWhitelistedDappView()
    } else if (!isCallWhitelisted) {
      showWhitelistNewDappView()
    } else {
      const timer = getWhitelistDappTimer()
      if (timer === 0) {
        calcWorkAndSendTx(tx)
      } else {
        store.commit(
          MutationTypes.SET_SPINNER_STATE,
          SpinnerState.TRANSACTION_WHITELISTED_TIMER
        )
      }

      if (loadedInIframe() && !store.state.ui.isDrawerActiveByUser) {
        store.commit(MutationTypes.DEACTIVATE_DRAWER)
        shrinkFrameInParentWindow()
      }
      return
    }
  } else {
    loadConfirmTxMsg(tx)
  }

  if (loadedInIframe()) {
    activateDrawerIfClosed()
  }
}

export {
  isContractCall,
  isDappWhitelisted,
  isContractCallWhitelisted,
  loadWhitelistedDapp,
  getWhitelistDappTimer,
  setWhitelistDappTimer,
  removeDappFromWhitelist,
  showWhitelistNewDappView,
  showAddContractToWhitelistedDappView,
  whitelistNewDapp,
  whitelistDappAddNewContract,
  cancelWhitelistDapp,
  performWhitelistedAction,
}

import { generateMnemonic, mnemonicToSeed } from 'bip39'
import hdkey from 'hdkey'
import { backOff } from 'exponential-backoff'

import { SpinnerState, StorageNames, DialogComponents } from '@/constants'
import MutationTypes from '@/store/mutation-types'
import store from '@/store'

import {
  loadedInIframe,
  getParentWindowCurrentJob,
  replyToParentWindow,
  localStorageSetToParent,
  localStorageRemoveFromParent,
  frameEventBalanceUpdated,
} from '@/parentFrameMessenger/parentFrameMessenger'

import router, { RouteNames } from '@/router'

import { isSafari } from '@/utils'

import { setProvider, checkNodeConnection } from './providers'
import { getTokenInfoForSymbol, getBalanceOfAddressForToken } from './tokens'
import { loadTxsInfoFromExplorer } from './transactions'
import { web3 } from './web3ebakus'
import { getStaked } from './systemContract'

const BACKOFF_SETTINGS = {
  jitter: 'full',
  startingDelay: 2000,
  maxDelay: 20 * 1000,
  numOfAttempts: 100,
}
let isWeb3Reconnecting = false

const getBalance = async () => {
  const { address, tokenSymbol } = store.state.wallet
  if (!address) {
    return Promise.reject(new Error('No wallet has been created'))
  }

  if (isWeb3Reconnecting) {
    return Promise.reject(new Error('Wallet is not connected to node'))
  }

  const tokenInfo = getTokenInfoForSymbol(tokenSymbol)

  try {
    let wei
    if (tokenInfo) {
      wei = await getBalanceOfAddressForToken(tokenInfo)
      if (typeof wei === 'undefined') {
        return Promise.reject(new Error('Token not found'))
      }
    } else {
      wei = await web3.eth.getBalance(address)
    }

    if (tokenSymbol !== store.state.wallet.tokenSymbol) {
      return Promise.reject(new Error('User changed selected token'))
    }

    if (parseFloat(wei) != parseFloat(store.state.wallet.balance)) {
      store.dispatch(MutationTypes.SET_WALLET_BALANCE, String(wei))

      getStaked()

      if (loadedInIframe()) {
        frameEventBalanceUpdated(wei)
      }

      setTimeout(loadTxsInfoFromExplorer(), 2000)
    }

    return Promise.resolve(wei)
  } catch (err) {
    console.error('Failed to connect to network')

    isWeb3Reconnecting = true

    await backOff(() => {
      store.dispatch(MutationTypes.SET_SPINNER_STATE, SpinnerState.NODE_CONNECT)
      setProvider(store.getters.network)

      return checkNodeConnection()
    }, BACKOFF_SETTINGS)

    isWeb3Reconnecting = false

    return Promise.reject(err)
  }
}

const generateWallet = () => {
  const promise = new Promise(async (resolve, reject) => {
    // generate mnemonic and private key
    const mnemonic = generateMnemonic() // generates string
    const seed = await mnemonicToSeed(mnemonic) // creates seed buffer
    const root = hdkey.fromMasterSeed(seed)
    const addrNode = root.derive("m/44'/60'/0'/0/0") // line 1
    const newAcc = web3.eth.accounts.privateKeyToAccount(
      `0x${addrNode._privateKey.toString('hex')}`
    )
    web3.eth.accounts.wallet.add(newAcc)

    store.dispatch(MutationTypes.SET_WALLET_ADDRESS, newAcc.address)

    if (loadedInIframe()) {
      const currentJob = getParentWindowCurrentJob()
      const { data: { cmd } = {} } = currentJob || {}
      if (cmd === 'defaultAddress') {
        replyToParentWindow(newAcc.address, null, currentJob)
      }
    }

    // Add to log
    const newAccLog = {
      title: 'Account created',
      address: newAcc.address,
      local: true,
    }
    store.dispatch(MutationTypes.ADD_LOCAL_LOG, newAccLog)

    if (newAcc) {
      resolve(mnemonic)
    } else {
      reject(new Error('Failed to generate wallet'))
    }
  })
  return promise
}

const secureWallet = pass => {
  return new Promise((resolve, reject) => {
    const newAcc = web3.eth.accounts.wallet.save(pass)
    console.log(`Wallet with public key: ${store.state.wallet.address} saved.`)

    // Add to log
    const newAccLog = {
      title: 'Password set',
      address: '*********',
      local: true,
    }
    store.dispatch(MutationTypes.ADD_LOCAL_LOG, newAccLog)

    store.dispatch(MutationTypes.UNLOCK_WALLET)

    if (isSafari && store.state.isSafariAllowed && loadedInIframe()) {
      const loadedWalletFromStorage = localStorage.getItem(
        StorageNames.WEB3_WALLET
      )
      localStorageSetToParent(StorageNames.WEB3_WALLET, loadedWalletFromStorage)
    }

    if (newAcc) {
      resolve(newAcc)
    } else {
      store.dispatch(MutationTypes.SET_SPINNER_STATE, SpinnerState.FAIL)

      reject(new Error('account already encrypted'))
    }
  })
}

const hasWallet = () => {
  const currentWallet = localStorage.getItem(StorageNames.WEB3_WALLET)
  return !!currentWallet
}

const importWallet = _seed => {
  return new Promise((resolve, reject) => {
    // backup current wallet if exists
    const currentWallet = localStorage.getItem(StorageNames.WEB3_WALLET)
    if (currentWallet) {
      localStorage.setItem(StorageNames.WEB3_OLD_WALLET_BACKUP, currentWallet)
    }
    // clear wallet
    web3.eth.accounts.wallet.clear()

    let newAcc
    // generate account from private key
    if (typeof _seed === 'string') {
      _seed = _seed.startsWith('0x') ? _seed : `0x${_seed}`
      newAcc = web3.eth.accounts.wallet.add(_seed)

      // generate account from mnemonics
    } else {
      const mnemonic = _seed.join(' ') // generates string
      const seed = mnemonicToSeed(mnemonic) // creates seed buffer
      const root = hdkey.fromMasterSeed(seed)
      const addrNode = root.derive("m/44'/60'/0'/0/0") // line 1
      const acc = web3.eth.accounts.privateKeyToAccount(
        `0x${addrNode._privateKey.toString('hex')}`
      )

      // add imported account to wallet
      newAcc = web3.eth.accounts.wallet.add(acc)
    }

    store.dispatch(MutationTypes.SET_WALLET_ADDRESS, newAcc.address)

    // Add to log
    const newAcc_log = {
      title: 'Account Imported',
      address: newAcc.address,
      local: true,
    }
    store.dispatch(MutationTypes.RESET_LOGS)
    store.dispatch(MutationTypes.ADD_LOCAL_LOG, newAcc_log)

    if (newAcc) {
      resolve(newAcc.address)
    } else {
      reject(new Error('Failed to import wallet'))
    }
  })
}

const deleteWallet = () => {
  web3.eth.accounts.wallet.clear()
  localStorage.clear()

  if (loadedInIframe()) {
    localStorageRemoveFromParent(StorageNames.WALLET_STORE)
    localStorageRemoveFromParent(StorageNames.LOGS)
    localStorageRemoveFromParent(StorageNames.WEB3_WALLET)
    localStorageRemoveFromParent(StorageNames.WEB3_OLD_WALLET_BACKUP)
  }

  store.commit(MutationTypes.DELETE_WALLET)
  store.commit(MutationTypes.RESET_LOGS)
}

const unlockWallet = pass => {
  return new Promise((resolve, reject) => {
    const wallet = web3.eth.accounts.wallet.load(pass)

    if (
      wallet &&
      typeof wallet[0] !== 'undefined' &&
      typeof wallet[0].address !== 'undefined'
    ) {
      const address = wallet[0].address
      console.log('wallet unlocked', wallet[0].address)
      web3.eth.defaultAccount = web3.utils.toChecksumAddress(address)

      store.dispatch(MutationTypes.UNLOCK_WALLET)
      resolve(address)
    } else {
      reject(new Error('Failed to unlock existing wallet'))
    }
  })
}

const exitDialog = () => {
  const routeName = router.app.$route.name
  const { component } = store.state.ui.dialog

  store.commit(MutationTypes.UNSET_OVERLAY_COLOR)

  if (
    !store.state.ui.isDrawerActiveByUser &&
    ([RouteNames.NEW, RouteNames.SAFARI_WARNING].includes(routeName) ||
      [DialogComponents.FAILED_TX, DialogComponents.NO_FUNDS].includes(
        component
      ))
  ) {
    store.commit(MutationTypes.DEACTIVATE_DRAWER)
  }

  store.commit(MutationTypes.CLEAR_DIALOG)
}

export {
  getBalance,
  generateWallet,
  secureWallet,
  hasWallet,
  importWallet,
  deleteWallet,
  unlockWallet,
  exitDialog,
}

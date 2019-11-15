import { generateMnemonic, mnemonicToSeed } from 'bip39'
import hdkey from 'hdkey'

import {
  SpinnerState,
  StorageNames,
  DialogComponents,
  NetworkStatus,
} from '@/constants'
import MutationTypes from '@/store/mutation-types'
import store from '@/store'
import {
  loadedInIframe,
  frameEventBalanceUpdated,
  frameEventConnectionStatusUpdated,
} from '@/parentFrameMessenger/parentFrameMessenger'

import { setProvider, checkNodeConnection } from './providers'
import { getTokenInfoForSymbol, getBalanceOfAddressForToken } from './tokens'
import { loadTxsInfoFromExplorer } from './transactions'
import { web3 } from './web3ebakus'

import router, { RouteNames } from '@/router'

const getBalanceCatchUpdateNetworkTimeouts = []

const loadConfirmTxMsg = async () => {}

const getBalance = async () => {
  const { address, token: symbol } = store.state.wallet
  if (!address) {
    return Promise.reject('No wallet created')
  }

  const tokenInfo = getTokenInfoForSymbol(symbol)

  try {
    let wei
    if (tokenInfo) {
      wei = await getBalanceOfAddressForToken(tokenInfo)
    } else {
      wei = await web3.eth.getBalance(address)
    }

    if (symbol !== store.state.wallet.token) {
      return Promise.reject('User changed selected token')
    }

    if (getBalanceCatchUpdateNetworkTimeouts.length > 0) {
      getBalanceCatchUpdateNetworkTimeouts.forEach(handle =>
        clearTimeout(handle)
      )
    }

    if (parseFloat(wei) != parseFloat(store.state.wallet.balance)) {
      store.dispatch(MutationTypes.SET_WALLET_BALANCE, String(wei))

      if (loadedInIframe()) {
        frameEventBalanceUpdated(wei)
      }

      setTimeout(loadTxsInfoFromExplorer(), 2000)
    }

    return Promise.resolve(wei)
  } catch (err) {
    store.dispatch(
      MutationTypes.SET_SPINNER_STATE,
      SpinnerState.NODE_DISCONNECTED
    )
    store.dispatch(MutationTypes.SET_NETWORK_STATUS, NetworkStatus.DISCONNECTED)

    if (loadedInIframe()) {
      frameEventConnectionStatusUpdated(NetworkStatus.DISCONNECTED)
    }

    console.error('Failed to connect to network')
    const updateNetworkTimeout = setTimeout(() => {
      store.dispatch(MutationTypes.SET_SPINNER_STATE, SpinnerState.NODE_CONNECT)
      setProvider(store.getters.network)

      checkNodeConnection()
    }, 2000)
    getBalanceCatchUpdateNetworkTimeouts.push(updateNetworkTimeout)

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
    // localStorage.setItem('logs', JSON.stringify(store.getters.transactions))

    store.dispatch(MutationTypes.UNLOCK_WALLET)

    if (newAcc) {
      resolve(newAcc)
    } else {
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
    (routeName === RouteNames.NEW || component === DialogComponents.NO_FUNDS)
  ) {
    store.commit(MutationTypes.DEACTIVATE_DRAWER)
  }

  store.commit(MutationTypes.CLEAR_DIALOG)
}

export {
  loadConfirmTxMsg,
  getBalance,
  generateWallet,
  secureWallet,
  hasWallet,
  importWallet,
  deleteWallet,
  unlockWallet,
  exitDialog,
}

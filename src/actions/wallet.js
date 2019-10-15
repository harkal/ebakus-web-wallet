import { generateMnemonic, mnemonicToSeed } from 'bip39'
import hdkey from 'hdkey'

import { SpinnerState, StorageNames, DialogComponents } from '@/constants'
import MutationTypes from '@/store/mutation-types'
import store from '@/store'
import {
  loadedInIframe,
  frameEventBalanceUpdated,
  replyToParentWindow,
  shrinkFrameInParentWindow,
} from '@/parentFrameMessenger/parentFrameMessenger'

import { setProvider } from './providers'
import { getTokenInfoForSymbol, getBalanceOfAddressForToken } from './tokens'
import { loadTxsInfoFromExplorer } from './transactions'
import { web3 } from './web3ebakus'

import router, { RouteNames } from '@/router'

const getBalanceCatchUpdateNetworkTimeouts = []

const loadConfirmTxMsg = async () => {}

const getBalance = () => {
  const { address, token: symbol } = store.state.wallet
  if (!address) {
    return Promise.reject('No wallet created')
  }
  const addr = web3.utils.toChecksumAddress(address)

  let promise
  const tokenInfo = getTokenInfoForSymbol(symbol)
  if (tokenInfo) {
    promise = getBalanceOfAddressForToken(tokenInfo)
  } else {
    promise = web3.eth.getBalance(addr)
  }

  return promise
    .then(weiBalance => {
      if (symbol !== store.state.wallet.token) {
        return Promise.reject('User changed selected token')
      }

      if (getBalanceCatchUpdateNetworkTimeouts.length > 0) {
        getBalanceCatchUpdateNetworkTimeouts.forEach(handle =>
          clearTimeout(handle)
        )
      }

      if (
        [SpinnerState.NODE_CONNECT, SpinnerState.NODE_DISCONNECTED].includes(
          store.state.ui.currentSpinnerState
        )
      ) {
        store.dispatch(
          MutationTypes.SET_SPINNER_STATE,
          SpinnerState.NODE_CONNECTED
        )
      }

      if (parseFloat(weiBalance) != parseFloat(store.state.wallet.balance)) {
        store.dispatch(MutationTypes.SET_WALLET_BALANCE, String(weiBalance))

        if (loadedInIframe()) {
          frameEventBalanceUpdated(weiBalance)
        }

        setTimeout(loadTxsInfoFromExplorer(), 2000)
      }

      return Promise.resolve(weiBalance)
    })
    .catch(err => {
      store.dispatch(
        MutationTypes.SET_SPINNER_STATE,
        SpinnerState.NODE_DISCONNECTED
      )

      console.error('Failed to connect to network')
      const updateNetworkTimeout = setTimeout(() => {
        store.dispatch(
          MutationTypes.SET_SPINNER_STATE,
          SpinnerState.NODE_CONNECT
        )
        setProvider(store.getters.network)
      }, 2000)
      getBalanceCatchUpdateNetworkTimeouts.push(updateNetworkTimeout)

      return Promise.reject(err)
    })
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
  localStorage.removeItem(StorageNames.WEB3_WALLET)
  store.commit(MutationTypes.RESET_LOGS)

  return this.generateWallet()
    .then(() => {
      return true
    })
    .catch(err => {
      console.log('Failed to delete wallet', err)
      return false
    })
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

  if (routeName === RouteNames.NEW || component == DialogComponents.NO_FUNDS) {
    store.commit(MutationTypes.DEACTIVATE_DRAWER)

    if (loadedInIframe()) {
      if (component == DialogComponents.NO_FUNDS) {
        replyToParentWindow(null, 'no_funds')
      }

      shrinkFrameInParentWindow()
    }
  }

  store.commit(MutationTypes.UNSET_OVERLAY_COLOR)
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

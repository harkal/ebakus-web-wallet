import { SpinnerState, DialogComponents } from '@/constants'
import {
  loadedInIframe,
  replyToParentWindow,
} from '@/parentFrameMessenger/parentFrameMessenger'
import { activateDrawerIfClosed } from '@/parentFrameMessenger/handler'

import MutationTypes from '@/store/mutation-types'
import store from '@/store'

import { web3 } from './web3ebakus'
import { loadTxsInfoFromExplorer, cancelPendingTx } from './transactions'

const TX_PROP_STATE = {
  NOT_FOUND: 0,
  FETCHING: 1,
  FOUND: 2,
}

const waitUntil = async function(
  checkSuccess = () => false,
  checkError = () => false,
  time = 500
) {
  return await new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      if (checkSuccess()) {
        clearInterval(interval)
        resolve()
      } else if (checkError()) {
        clearInterval(interval)
        reject()
      }
    }, time)
  })
}

const runOnce = async function(flag, func) {
  const self = this
  if (self[flag] === TX_PROP_STATE.FOUND) return
  else if (self[flag] === TX_PROP_STATE.FETCHING) {
    return await waitUntil(
      () => self[flag] === TX_PROP_STATE.FOUND,
      () => self._hasError
    )
  }
  self[flag] = TX_PROP_STATE.FETCHING

  await func()
  // TODO: handle errors?

  self[flag] = TX_PROP_STATE.FOUND
}

async function Transaction(tx, opts = {}) {
  const walletPublicAddress = store.state.wallet.address
  const from = web3.utils.toChecksumAddress(
    tx.from || store.state.wallet.address
  )

  if (from !== walletPublicAddress) {
    throw new Error(
      `Transaction sender "${from}" is not the same with the wallet account "${walletPublicAddress}"`
    )
  }

  if (tx.to) {
    tx.to = web3.utils.toChecksumAddress(tx.to)
  }

  const object = {
    chainId: web3.utils.toHex(store.state.network.chainId),
    ...tx,
    from,
  }

  Object.defineProperties(this, {
    object: {
      value: object,
      // configurable: true,
      writable: true,
      enumerable: true,
      // get() {
      //   return this.tx
      // },
      // set(value) {
      //   temperature = value
      //   archive.push({ val: temperature })
      // },
    },
    extraGas: {
      value: opts.extraGas > 0 ? opts.extraGas : 0,
      // configurable: true,
      // writable: false,
      // enumerable: true,
      // get() {
      //   return this.tx
      // },
      // set(value) {
      //   temperature = value
      //   archive.push({ val: temperature })
      // },
    },
  })

  Object.defineProperties(this, {
    _isTransactionObject: {
      value: true,
      // configurable: true,
      // writable: true,
      // enumerable: false,
      // get() {
      //   console.log('get!')
      //   return temperature
      // },
      // set(value) {
      //   temperature = value
      //   archive.push({ val: temperature })
      // },
    },
    _hash: {
      // value: true,
      // configurable: true,
      // writable: true,
      // enumerable: false,
      get() {
        return web3.utils.sha3(this.toString())
      },
      // set(value) {
      //   temperature = value
      //   archive.push({ val: temperature })
      // },
    },
    _hasError: {
      value: false,
      writable: true,
    },
    _hasNonce: {
      // value: true,
      // configurable: true,
      writable: true,
      // enumerable: false,
      value: tx.nonce ? TX_PROP_STATE.FOUND : TX_PROP_STATE.NOT_FOUND,
      // get() {
      //   return !!this.object.nonce
      // },
      // set(value) {
      //   temperature = value
      //   archive.push({ val: temperature })
      // },
    },
    _hasGas: {
      // value: true,
      // configurable: true,
      writable: true,
      // enumerable: false,
      value: tx.gas ? TX_PROP_STATE.FOUND : TX_PROP_STATE.NOT_FOUND,
      // get() {
      //   return !!this.object.gas
      // },
      // set(value) {
      //   temperature = value
      //   archive.push({ val: temperature })
      // },
    },
    _hasWorkCalculated: {
      // value: true,
      // configurable: true,
      writable: true,
      // enumerable: false,
      value: tx.workNonce ? TX_PROP_STATE.FOUND : TX_PROP_STATE.NOT_FOUND,
      // get() {
      //   return !!this.object.workNonce
      // },
      // set(value) {
      //   temperature = value
      //   archive.push({ val: temperature })
      // },
    },
  })

  // this._isTransactionObject = true

  // this._uniqueHash = null

  // this._hasNonce = !!tx.nonce
  // this._hasGas = !!tx.gas
  // this._hasWorkCalculated = !!tx.workNonce

  // if (!txObject.gas) {
  //   try {
  //     txObject.gas = await web3.eth.estimateGas(txObject)
  //   } catch (err) {
  //     console.warn('Gas estimation failed with error: ', err)
  //     txObject.gas = 21000
  //   }
  // }

  console.log('TCL: Transaction -> this', this)
  // this.tx = txObject

  // _instance = this

  // prepare Transaction in async mode
  this.getNonce()
  this.estimateGas()
  this.calcWork()

  await this.save()
}

Transaction.prototype.toString = function() {
  return JSON.stringify(this.object)
}

// Transaction.prototype.uniqueHash = async function() {
//   web3.utils.sha3(this.toString())
// }

Transaction.prototype.save = async function() {
  await store.dispatch(MutationTypes.SET_TX_OBJECT, this)
}

Transaction.prototype.getNonce = async function() {
  const self = this
  const getNonce = async function() {
    const nonce = await web3.eth.getTransactionCount(self.object.from)
    self.object.nonce = nonce
  }
  await runOnce.call(this, '_hasNonce', getNonce)
}

Transaction.prototype.estimateGas = async function(force, defaultGas = 21000) {
  const self = this
  const estimateGas = async function() {
    try {
      self.object.gas = await web3.eth.estimateGas(self.object)
    } catch (err) {
      console.warn('Gas estimation failed with error: ', err)
      if (defaultGas >= 0) {
        self.object.gas = defaultGas
      }
    }
  }

  if (force) {
    await estimateGas()
  } else {
    await runOnce.call(this, '_hasGas', estimateGas)
  }
}

Transaction.prototype.calcWork = async function() {
  const self = this

  await waitUntil(
    () => self.object.gas && self.object.nonce,
    () => self._hasError
  )

  const calcWork = async function() {
    // TODO: remove this after:
    // 1. pownode.ebakus.com has the latest code
    // 2. for web3.js > beta.41, if possible
    // tx.gasPrice = '0'

    let difficulty = store.state.singleTxAmountOfWork
    if (!difficulty) {
      difficulty = store.state.amountOfWork
    }

    try {
      if (difficulty === true || typeof difficulty !== 'number') {
        difficulty = await web3.eth.suggestDifficulty(self.object.from)
      }

      const txWithPow = await web3.eth.calculateWorkForTransaction(
        { ...self.object },
        difficulty
      )

      // FIXME:
      self.object = txWithPow

      // hack for hardware wallets that don't know how to parse workNonce
      if (store.getters.wallet.isUsingHardwareWallet) {
        self.object.gasPrice = self.object.workNonce
      }

      // await store.dispatch(MutationTypes.UPDATE_TX_OBJECT, txWithPow)

      // return txWithPow
    } catch (err) {
      self._hasError = true

      // store.dispatch(MutationTypes.CLEAR_TX)
      store.dispatch(MutationTypes.SET_SPINNER_STATE, SpinnerState.FAIL)

      if (loadedInIframe()) {
        replyToParentWindow(null, {
          code: 'calc_pow_failure',
          msg: err.message,
        })
      }
    } finally {
      store.dispatch(MutationTypes.SET_SINGLE_TX_AMOUNT_OF_WORK, false)
    }
  }
  return await runOnce.call(this, '_hasWorkCalculated', calcWork)
}

Transaction.prototype.sendTx = async function(handleErrorUI = true) {
  const self = this

  if (loadedInIframe() && !store.state.ui.isDrawerActiveByUser) {
    store.dispatch(MutationTypes.DEACTIVATE_DRAWER)
  }

  const originalPendingTxJobId = store.state.tx.jobId

  // check if public address changed in the meantime
  // it's not really needed as account switching handles this case
  const walletPublicAddress = store.state.wallet.address
  if (
    typeof self.object.from !== 'string' ||
    self.object.from.toLowerCase() !== walletPublicAddress.toLowerCase()
  ) {
    self._hasError = true

    // wait for listeners to be updated
    setTimeout(() => {
      store.commit(MutationTypes.CLEAR_TX)
    }, 600)

    throw new Error(
      `Transaction sender "${self.object.from}" is not the same with the wallet account "${walletPublicAddress}"`
    )
  }

  try {
    // just block till work if done, and update the UI accordingly
    if (!self.object.workNonce) {
      store.dispatch(MutationTypes.SET_SPINNER_STATE, SpinnerState.CALC_POW)

      await self.calcWork()
    }

    const isUsingHardwareWallet = store.getters.wallet.isUsingHardwareWallet

    if (isUsingHardwareWallet) {
      store.dispatch(
        MutationTypes.SET_SPINNER_STATE,
        SpinnerState.LEDGER_CONFIRM
      )
    } else {
      store.dispatch(
        MutationTypes.SET_SPINNER_STATE,
        SpinnerState.TRANSACTION_SENDING
      )
    }

    const receipt = await web3.eth.sendTransaction(self.object)

    if (!receipt.status) {
      throw new Error('Transaction failed')
    }

    store.dispatch(
      MutationTypes.SET_SPINNER_STATE,
      SpinnerState.TRANSACTION_SENT_SUCCESS
    )

    if (loadedInIframe() && originalPendingTxJobId) {
      replyToParentWindow(receipt)
    }

    loadTxsInfoFromExplorer()
  } catch (err) {
    console.log('calcWorkAndSendTx err', err)

    self._hasError = true

    store.dispatch(MutationTypes.SET_SPINNER_STATE, SpinnerState.FAIL)

    const hasCancelledOnLedger =
      err.name === 'TransportStatusError' &&
      (err.statusCode == 27013 ||
        err.statusText === 'CONDITIONS_OF_USE_NOT_SATISFIED')

    if (hasCancelledOnLedger) {
      cancelPendingTx()
      if (!handleErrorUI) {
        return Promise.reject(err)
      }
      return
    } else if (handleErrorUI) {
      activateDrawerIfClosed()

      store.commit(MutationTypes.SHOW_DIALOG, {
        component: DialogComponents.FAILED_TX,
        title: 'Transaction Failed',
        data: {
          ...self.object,
        },
      })
    }

    if (loadedInIframe() && originalPendingTxJobId) {
      replyToParentWindow(null, {
        code: 'send_tx_failure',
        msg: err.message,
      })
    }

    loadTxsInfoFromExplorer()

    if (!handleErrorUI) {
      return Promise.reject(err)
    }
  } finally {
    store.dispatch(MutationTypes.CLEAR_TX)
  }
}

export default Transaction

import Vue from 'vue'

import { SpinnerState } from '@/constants'
import {
  loadedInIframe,
  replyToParentWindow,
  shrinkFrameInParentWindow,
} from '@/parentFrameMessenger/parentFrameMessenger'
import MutationTypes from '@/store/mutation-types'
import store from '@/store'

import { decodeDataUsingAbi, getValueForParam } from './abi'
import { getTokenInfoForContractAddress, decodeData } from './tokens'
import { web3 } from './web3ebakus'
import { exitPopUP } from './wallet'

const addPendingTx = async tx => {
  const from = web3.utils.toChecksumAddress(
    tx.from || store.state.wallet.address
  )

  const nonce = await web3.eth.getTransactionCount(from)

  const txObject = {
    chainId: web3.utils.toHex(7),
    gas: 100000,
    ...tx,
    from,
    nonce,
  }

  store.dispatch(MutationTypes.SET_TX_OBJECT, txObject)

  return txObject
}

const calcWorkAndSendTx = tx => {
  // TODO: remove this after:
  // 1. pownode.ebakus.com has the latest code
  // 2. for web3.js > beta.41, if possible
  tx.gasPrice = '0'

  store.commit(MutationTypes.SET_SPINNER_STATE, SpinnerState.CALC_POW)

  if (loadedInIframe() && !store.state.ui.isDrawerActiveByUser) {
    store.commit(MutationTypes.DEACTIVATE_DRAWER)
    shrinkFrameInParentWindow()
  }

  const originalPendingTx = store.state.tx.object
  store.commit(MutationTypes.CLEAR_TX)

  return web3.eth
    .suggestDifficulty(tx.from)
    .then(difficulty => web3.eth.calculateWorkForTransaction(tx, difficulty))
    .then(txWithPow => {
      console.log('txWithPow: ', txWithPow)

      store.dispatch(
        MutationTypes.SET_SPINNER_STATE,
        SpinnerState.TRANSACTION_SENDING
      )

      return web3.eth.sendTransaction(txWithPow)
    })
    .then(receipt => {
      console.log('receipt', receipt)

      store.dispatch(
        MutationTypes.SET_SPINNER_STATE,
        SpinnerState.TRANSACTION_SENT_SUCCESS
      )

      getTxLogInfo({
        ...originalPendingTx,
        ...receipt,
        hash: receipt.transactionHash,
      }).then(log => store.dispatch(MutationTypes.ADD_LOCAL_LOG, log))

      if (loadedInIframe()) {
        replyToParentWindow(receipt)
      }
    })
    .catch(err => {
      console.log('calcWorkAndSendTx err', err)

      store.dispatch(MutationTypes.SET_SPINNER_STATE, SpinnerState.FAIL)

      if (loadedInIframe()) {
        replyToParentWindow(null, err.message)
      }
    })
}

const confirmPendingTx = () => {
  const tx = store.state.tx.object
  calcWorkAndSendTx(tx)

  console.log('Transaction Confirmed by user')

  store.commit('setActiveTab', 'ebk-tab_history')
  exitPopUP()
}

const cancelPendingTx = () => {
  console.log('Transaction Cancelled by user')

  store.commit(MutationTypes.SET_SPINNER_STATE, SpinnerState.CANCEL)

  if (loadedInIframe()) {
    replyToParentWindow(null, 'Transaction cancelled by user')

    if (!store.state.ui.isDrawerActiveByUser) {
      store.commit(MutationTypes.DEACTIVATE_DRAWER)
      shrinkFrameInParentWindow()
    }
  }

  store.commit(MutationTypes.CLEAR_TX)
  exitPopUP()
}

const getTxLogInfo = async receipt => {
  const localAddr = web3.utils.toChecksumAddress(store.state.wallet.address)

  const {
    to,
    from: txFrom,
    value = 0,
    contractAddress,
    data: txData,
    input,
    hash,
  } = receipt

  let logTitle, logAddress, decodedData

  const isLocal = web3.utils.toChecksumAddress(txFrom) == localAddr
  const isContractCreation = contractAddress && !/^0x0+$/.test(contractAddress)

  const foreignAddress = isLocal ? to : txFrom

  const token = getTokenInfoForContractAddress(foreignAddress)
  const data = txData || input

  if (token && data) {
    decodedData = decodeData(data)
  } else if (data) {
    decodedData = await decodeDataUsingAbi(foreignAddress, data)
  }

  if (isLocal) {
    logTitle = `You sent ${web3.utils.fromWei(String(value))} ebk to:`
    logAddress = to

    if (isContractCreation) {
      logTitle = `You created a new contract at:`
      logAddress = contractAddress
    } else if (decodedData) {
      const { name, params } = decodedData

      if (name === 'transfer') {
        const value = getValueForParam('_value', params) || 0
        logTitle = `You sent ${web3.utils.fromWei(String(value))} ${
          token.symbol
        } to:`
        logAddress = getValueForParam('_to', params)
      } else if (name === 'getWei') {
        logTitle = `You requested 1 EBK from faucet:`
      } else {
        logTitle = `You called contract method ${name ? `"${name}"` : ''} at:`
      }
    }
  } else {
    logTitle = `You received ${web3.utils.fromWei(String(value))} ebk from:`
    logAddress = txFrom

    if (decodedData && decodedData.name === 'getWei') {
      logTitle = `You received 1 EBK from faucet:`
    }
  }

  return {
    title: logTitle,
    address: logAddress,
    txhash: hash,
    local: isLocal,
  }
}

const loadTxsInfoFromExplorer = () => {
  const localAddr = web3.utils.toChecksumAddress(store.state.wallet.address)
  if (!localAddr) {
    return
  }
  Vue.http
    .get(
      `${process.env.API_ENDPOINT}/transaction/all/${localAddr}?offset=0&limit=20&order=desc`
    )
    .then(
      response => {
        const txs = response.data
        if (txs.length > 0) {
          Promise.all(txs.map(getTxLogInfo)).then(logs =>
            store.dispatch(MutationTypes.SET_LOGS, logs)
          )
        }
      },
      err => {
        console.error('Get transactions err', err)
      }
    )
}

export {
  addPendingTx,
  calcWorkAndSendTx,
  confirmPendingTx,
  cancelPendingTx,
  loadTxsInfoFromExplorer,
}

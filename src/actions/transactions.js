import Vue from 'vue'
import axios from 'axios'

import { SpinnerState } from '@/constants'
import {
  loadedInIframe,
  replyToParentWindow,
  shrinkFrameInParentWindow,
  expandFrameInParentWindow,
} from '@/parentFrameMessenger/parentFrameMessenger'
import { activateDrawerIfClosed } from '@/parentFrameMessenger/handler'

import MutationTypes from '@/store/mutation-types'
import store from '@/store'

import { decodeDataUsingAbi, getValueForParam } from './abi'
import { getTokenInfoForContractAddress, decodeData } from './tokens'
import { web3 } from './web3ebakus'
import { exitDialog } from './wallet'
import { DialogComponents } from '../constants'

const addPendingTx = async tx => {
  const from = web3.utils.toChecksumAddress(
    tx.from || store.state.wallet.address
  )

  const nonce = await web3.eth.getTransactionCount(from)

  const txObject = {
    chainId: web3.utils.toHex(7),
    gas: 100000,
    ...tx,
    to: web3.utils.toChecksumAddress(tx.to),
    from,
    nonce,
  }

  store.dispatch(MutationTypes.SET_TX_OBJECT, txObject)

  return txObject
}

const calcWork = async tx => {
  // TODO: remove this after:
  // 1. pownode.ebakus.com has the latest code
  // 2. for web3.js > beta.41, if possible
  tx.gasPrice = '0'

  store.commit(MutationTypes.SET_SPINNER_STATE, SpinnerState.CALC_POW)

  try {
    const difficulty = await web3.eth.suggestDifficulty(tx.from)
    const txWithPow = await web3.eth.calculateWorkForTransaction(
      { ...tx },
      difficulty
    )

    store.dispatch(MutationTypes.SET_TX_OBJECT, txWithPow)

    return txWithPow
  } catch (err) {
    console.log('calcWorkAndSendTx err', err)

    store.dispatch(MutationTypes.SET_SPINNER_STATE, SpinnerState.FAIL)

    if (loadedInIframe()) {
      replyToParentWindow(null, err.message)
    }
  }
}

const calcWorkAndSendTx = async tx => {
  if (loadedInIframe() && !store.state.ui.isDrawerActiveByUser) {
    store.commit(MutationTypes.DEACTIVATE_DRAWER)
    shrinkFrameInParentWindow()
  }

  const originalPendingTx = store.state.tx.object
  store.commit(MutationTypes.CLEAR_TX)

  try {
    if (!tx.workNonce) {
      tx = await calcWork(tx)
    }

    store.dispatch(
      MutationTypes.SET_SPINNER_STATE,
      SpinnerState.TRANSACTION_SENDING
    )

    const receipt = await web3.eth.sendTransaction(tx)

    if (loadedInIframe()) {
      replyToParentWindow(receipt)
    }

    store.dispatch(
      MutationTypes.SET_SPINNER_STATE,
      SpinnerState.TRANSACTION_SENT_SUCCESS
    )

    const log = await getTxLogInfo({
      ...originalPendingTx,
      ...receipt,
      hash: receipt.transactionHash,
    })
    store.dispatch(MutationTypes.ADD_LOCAL_LOG, log)
  } catch (err) {
    console.log('calcWorkAndSendTx err', err)

    store.dispatch(MutationTypes.SET_SPINNER_STATE, SpinnerState.FAIL)

    if (loadedInIframe()) {
      replyToParentWindow(null, err.message)
    }
  }
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
  exitDialog()
}

const getTxLogInfo = async receipt => {
  const localAddr = store.state.wallet.address

  const {
    to,
    from: txFrom,
    contractAddress,
    data: txData,
    input,
    hash,
    timestamp,
  } = receipt

  let { value = 0 } = receipt

  let logTitle, logAddress, decodedData

  const isLocal = web3.utils.toChecksumAddress(txFrom) == localAddr
  const isContractCreation = contractAddress && !/^0x0+$/.test(contractAddress)

  const foreignAddress = isLocal ? to : txFrom

  const token = getTokenInfoForContractAddress(foreignAddress)
  const data = txData || input

  value = Vue.options.filters.toEtherFixed(value)

  if (token && data) {
    decodedData = decodeData(data)
  } else if (data) {
    decodedData = await decodeDataUsingAbi(foreignAddress, data)
  }

  if (isLocal) {
    logTitle = `You sent ${value} EBK to:`
    logAddress = to

    if (isContractCreation) {
      logTitle = `You created a new contract at:`
      logAddress = contractAddress
    } else if (decodedData) {
      const { name, params } = decodedData

      if (name === 'transfer') {
        const tokenValue = getValueForParam('_value', params) || 0
        logTitle = `You sent ${web3.utils.fromWei(String(tokenValue))} ${
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
    logTitle = `You received ${value} EBK from:`
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
    timestamp,
  }
}

const checkIfEnoughBalance = tx => {
  if (!tx) {
    tx = store.state.tx.object
  }

  const balance = parseFloat(web3.utils.fromWei(store.state.wallet.balance))
  const value = tx.value ? web3.utils.fromWei(tx.value) : '0'

  if (parseFloat(value) < 0 || parseFloat(value) > balance) {
    if (loadedInIframe()) {
      expandFrameInParentWindow()
      activateDrawerIfClosed()
    }

    store.commit(MutationTypes.SHOW_DIALOG, {
      component: DialogComponents.NO_FUNDS,
      title: 'Attention',
    })

    return false
  }

  return true
}

const getTransactionMessage = async tx => {
  let preTitle = '',
    amountTitle = '',
    emTitle = '',
    postTitle = '',
    to = ''

  to = tx.to

  const value = tx.value ? web3.utils.fromWei(tx.value) : '0'
  let data = tx.data || tx.input

  let decodedData

  preTitle = 'You are about'

  if (value > 0) {
    amountTitle = `to send ${value} EBK`
  }

  const isContractCreation = !tx.to || /^0x0+$/.test(tx.to)
  if (isContractCreation) {
    emTitle = 'to deploy'
    postTitle = 'a new contract. Are you sure?'
  } else {
    const token = getTokenInfoForContractAddress(tx.to)
    if (token && data) {
      decodedData = decodeData(data)
    } else if (data) {
      decodedData = await decodeDataUsingAbi(tx.to, data)
    }

    if (decodedData) {
      const { name, params } = decodedData
      data = params

      if (name === 'transfer') {
        to = getValueForParam('_to', params)
        const value = getValueForParam('_value', params) || 0

        emTitle = `to transfer ${web3.utils.fromWei(String(value))} ${
          token.symbol
        }`
        postTitle = `to "${to}". Are you sure?`
      } else if (name === 'getWei') {
        emTitle = 'to request 1 EBK'
        postTitle = 'from faucet. Are you sure?'
      } else {
        emTitle = `to call ${name}`
        postTitle = `at contract address "${to}". Are you sure?`
      }
    } else {
      postTitle = `to "${to}". Are you sure?`
    }
  }

  if (amountTitle != '' && emTitle != '') {
    postTitle = `and ${emTitle} ${postTitle}`
    emTitle = ''
  }

  return { preTitle, amountTitle, emTitle, postTitle, to, data }
}

const loadTxsInfoFromExplorer = () => {
  const localAddr = store.state.wallet.address
  if (!localAddr) {
    return
  }
  axios
    .get(
      `${process.env.API_ENDPOINT}/transaction/all/${localAddr}?offset=0&limit=20&order=desc`
    )
    .then(
      response => {
        const txs = response.data
        if (txs.length > 0) {
          Promise.all(txs.map(getTxLogInfo)).then(logs =>
            store.dispatch(MutationTypes.PUSH_LOGS, logs)
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
  calcWork,
  calcWorkAndSendTx,
  cancelPendingTx,
  checkIfEnoughBalance,
  getTransactionMessage,
  loadTxsInfoFromExplorer,
}

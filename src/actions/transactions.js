import Vue from 'vue'
import axios from 'axios'

import { SpinnerState } from '@/constants'
import {
  loadedInIframe,
  replyToParentWindow,
} from '@/parentFrameMessenger/parentFrameMessenger'
import { activateDrawerIfClosed } from '@/parentFrameMessenger/handler'

import MutationTypes from '@/store/mutation-types'
import store from '@/store'

import { decodeDataUsingAbi, getValueForParam } from './abi'
import { getTokenInfoForContractAddress, decodeData } from './tokens'
import { web3 } from './web3ebakus'
import { exitDialog } from './wallet'
import { DialogComponents } from '../constants'
import { isVotingCall } from './systemContract'

const addPendingTx = async tx => {
  const walletPublicAddress = store.state.wallet.address
  const from = web3.utils.toChecksumAddress(
    tx.from || store.state.wallet.address
  )

  if (from !== walletPublicAddress) {
    throw new Error(
      `Transaction sender "${from}" is not the same with the wallet account "${walletPublicAddress}"`
    )
  }

  const nonce = await web3.eth.getTransactionCount(from)

  const txObject = {
    chainId: web3.utils.toHex(store.state.network.chainId),
    ...tx,
    from,
    nonce,
  }

  if (tx.to) {
    txObject.to = web3.utils.toChecksumAddress(tx.to)
  }

  if (!txObject.gas) {
    try {
      txObject.gas = await web3.eth.estimateGas(txObject)
    } catch (err) {
      console.warn('Gas estimation failed with error: ', err)
      txObject.gas = 21000
    }
  }

  store.dispatch(MutationTypes.SET_TX_OBJECT, txObject)

  return txObject
}

const estimateGas = async tx => {
  try {
    const estimatedGas = await web3.eth.estimateGas(tx)
    const txWithGas = { ...tx, gas: estimatedGas }
    store.dispatch(MutationTypes.SET_TX_OBJECT, txWithGas)

    return txWithGas
  } catch (err) {
    console.log(
      'Gas estimation failed, but we can still try the transaction',
      err
    )
  }
}

const calcWork = async tx => {
  // TODO: remove this after:
  // 1. pownode.ebakus.com has the latest code
  // 2. for web3.js > beta.41, if possible
  tx.gasPrice = '0'

  let difficulty = store.state.singleTxAmountOfWork
  if (!difficulty) {
    difficulty = store.state.amountOfWork
  }

  try {
    if (difficulty === true || typeof difficulty !== 'number') {
      difficulty = await web3.eth.suggestDifficulty(tx.from)
    }

    const txWithPow = await web3.eth.calculateWorkForTransaction(
      { ...tx },
      difficulty
    )

    // hack for hardware wallets that don't know how to parse workNonce
    if (store.getters.wallet.isUsingHardwareWallet) {
      txWithPow.gasPrice = txWithPow.workNonce
    }

    store.dispatch(MutationTypes.SET_TX_OBJECT, txWithPow)

    return txWithPow
  } catch (err) {
    store.dispatch(MutationTypes.CLEAR_TX)
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

const calcWorkAndSendTx = async (tx, handleErrorUI = true) => {
  if (loadedInIframe() && !store.state.ui.isDrawerActiveByUser) {
    store.dispatch(MutationTypes.DEACTIVATE_DRAWER)
  }

  const originalPendingTxJobId = store.state.tx.jobId
  const originalPendingTx = store.state.tx.object
  const walletPublicAddress = store.state.wallet.address

  store.dispatch(MutationTypes.CLEAR_TX)

  if (
    typeof tx.from !== 'string' ||
    tx.from.toLowerCase() !== walletPublicAddress.toLowerCase()
  ) {
    throw new Error(
      `Transaction sender "${tx.from}" is not the same with the wallet account "${walletPublicAddress}"`
    )
  }

  try {
    if (!tx.workNonce) {
      store.dispatch(MutationTypes.SET_SPINNER_STATE, SpinnerState.CALC_POW)

      tx = await calcWork(tx)
    }

    const isUsingHardwareWallet = store.getters.wallet.isUsingHardwareWallet

    // hack for hardware wallets that don't know how to parse workNonce
    if (isUsingHardwareWallet && tx.workNonce && !tx.gasPrice) {
      tx.gasPrice = tx.workNonce
    }

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

    const receipt = await web3.eth.sendTransaction(tx)

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
          ...originalPendingTx,
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

const getTokenSymbolPrefix = (chainId = store.state.network.chainId) => {
  return web3.utils.hexToNumber(chainId) != process.env.MAINNET_CHAIN_ID
    ? 't'
    : ''
}

const cancelPendingTx = () => {
  console.log('Transaction Cancelled by user')

  store.commit(
    MutationTypes.SET_SPINNER_STATE,
    SpinnerState.TRANSACTION_SENT_CANCELLED
  )

  if (loadedInIframe()) {
    replyToParentWindow(null, {
      code: 'send_tx_cancel',
      msg: 'Transaction cancelled by user',
    })

    if (!store.state.ui.isDrawerActiveByUser) {
      store.commit(MutationTypes.UNSET_OVERLAY_COLOR)
      store.commit(MutationTypes.DEACTIVATE_DRAWER)
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
  const tokenSymbolPrefix = getTokenSymbolPrefix(receipt.chainId)
  const data = txData || input

  value = Vue.options.filters.toEtherFixed(value)

  if (token && data) {
    decodedData = decodeData(data)
  } else if (data) {
    decodedData = await decodeDataUsingAbi(foreignAddress, data)
  }

  if (isLocal) {
    logTitle = `You sent ${value} ${tokenSymbolPrefix}EBK to:`
    logAddress = to

    if (isContractCreation) {
      logTitle = `You created a new contract at:`
      logAddress = contractAddress
    } else if (decodedData) {
      const { name, params } = decodedData

      if (name === 'transfer') {
        const tokenValue = getValueForParam('_value', params) || 0
        logTitle = `You sent ${web3.utils.fromWei(
          String(tokenValue)
        )} ${tokenSymbolPrefix}${token.symbol} to:`
        logAddress = getValueForParam('_to', params)
      } else if (name === 'getWei') {
        logTitle = `You requested 1 ${tokenSymbolPrefix}EBK from faucet:`
      } else {
        logTitle = `You called contract action ${name ? `"${name}"` : ''} at:`
      }
    }
  } else {
    logTitle = `You received ${value} ${tokenSymbolPrefix}EBK from:`
    logAddress = txFrom

    if (decodedData && decodedData.name === 'getWei') {
      logTitle = `You received 1 ${tokenSymbolPrefix}EBK from faucet:`
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

  if (
    parseFloat(value) < 0 ||
    parseFloat(value) > balance ||
    (isVotingCall() && balance <= 0)
  ) {
    if (loadedInIframe()) {
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
  const tokenSymbolPrefix = getTokenSymbolPrefix(tx.chainId)
  let data = tx.data || tx.input

  let decodedData

  preTitle = 'You are about'

  if (value > 0) {
    amountTitle = `to send ${value} ${tokenSymbolPrefix}EBK`
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

        emTitle = `to transfer ${web3.utils.fromWei(
          String(value)
        )} ${tokenSymbolPrefix}${token.symbol}`
        postTitle = `to "${to}". Are you sure?`
      } else if (name === 'getWei') {
        emTitle = `to request 1 ${tokenSymbolPrefix}EBK`
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

  const isTestnet = store.getters.network.isTestnet
  const apiEndpoint = isTestnet
    ? process.env.TESTNET_API_ENDPOINT
    : process.env.MAINNET_API_ENDPOINT

  axios
    .get(
      `${apiEndpoint}/transaction/all/${localAddr}?offset=0&limit=20&order=desc`
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
  estimateGas,
  calcWork,
  calcWorkAndSendTx,
  getTokenSymbolPrefix,
  cancelPendingTx,
  checkIfEnoughBalance,
  getTransactionMessage,
  loadTxsInfoFromExplorer,
}

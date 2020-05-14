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
import { isZeroHash } from '@/utils'

import { decodeDataUsingAbi, getValueForParam } from './abi'
import { getTokenInfoForContractAddress, decodeData } from './tokens'
import { web3 } from './web3ebakus'
import { exitDialog } from './wallet'
import { DialogComponents } from '../constants'
import { getEnsNameForAddress } from './ens'
import { isVotingCall } from './systemContract'
import Transaction from './Transaction'

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
    toEns,
    from: txFrom,
    fromEns,
    contractAddress,
    contractAddressEns,
    data: txData,
    input,
    hash,
    status,
    timestamp,
  } = receipt

  let { value = 0 } = receipt

  let logTitle, logAddress, logAddressEns, decodedData

  const isLocal = web3.utils.toChecksumAddress(txFrom) == localAddr
  const isContractCreation = contractAddress && !isZeroHash(contractAddress)

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
    logAddressEns = toEns

    if (isContractCreation) {
      logTitle = `You created a new contract at:`
      logAddress = contractAddress
      logAddressEns = contractAddressEns
    } else if (decodedData) {
      const { name, params } = decodedData

      if (name === 'transfer') {
        const tokenValue = getValueForParam('_value', params) || 0
        logTitle = `You sent ${web3.utils.fromWei(
          String(tokenValue)
        )} ${tokenSymbolPrefix}${token.symbol} to:`
        logAddress = getValueForParam('_to', params)
        if (logAddress) {
          logAddressEns = await getEnsNameForAddress(logAddress)
        }
      } else if (name === 'getWei') {
        logTitle = `You requested 1 ${tokenSymbolPrefix}EBK from faucet:`
        logAddressEns = ''
      } else {
        logTitle = `You called contract action ${name ? `"${name}"` : ''} at:`
      }
    }
  } else {
    logTitle = `You received ${value} ${tokenSymbolPrefix}EBK from:`
    logAddress = txFrom
    logAddressEns = fromEns

    if (decodedData && decodedData.name === 'getWei') {
      logTitle = `You received 1 ${tokenSymbolPrefix}EBK from faucet:`
      logAddressEns = ''
    }
  }

  return {
    title: logTitle,
    address: logAddress,
    addressEns: logAddressEns,
    txhash: hash,
    local: isLocal,
    failed: status ? !/(true|yes|1|0x1)/i.test(status) : false,
    timestamp,
  }
}

const checkIfEnoughBalance = () => {
  let hasBalance = false

  const tx = store.state.tx
  if (tx instanceof Transaction) {
    let { balance, staked } = store.state.wallet
    balance = parseFloat(web3.utils.fromWei(balance))
    const value = tx.object.value ? web3.utils.fromWei(tx.object.value) : '0'

    hasBalance = !(
      parseFloat(value) < 0 ||
      parseFloat(value) > balance ||
      (isVotingCall() && balance <= 0 && staked <= 0)
    )
  }

  if (!hasBalance) {
    if (loadedInIframe()) {
      activateDrawerIfClosed()
    }

    store.commit(MutationTypes.SHOW_DIALOG, {
      component: DialogComponents.NO_FUNDS,
      title: 'Attention',
    })
  }

  return hasBalance
}

const getTransactionMessage = async tx => {
  let preTitle = '',
    amountTitle = '',
    emTitle = '',
    postTitle = '',
    to = '',
    toEnsAddress,
    toEnsText = ''

  to = tx.to

  if (to) toEnsAddress = await getEnsNameForAddress(to)
  if (toEnsAddress) toEnsText = ` (${toEnsAddress})`

  const value = tx.value ? web3.utils.fromWei(tx.value) : '0'
  const tokenSymbolPrefix = getTokenSymbolPrefix(tx.chainId)
  let data = tx.data || tx.input

  let decodedData

  preTitle = 'You are about'

  if (value > 0) {
    amountTitle = `to send ${value} ${tokenSymbolPrefix}EBK`
  }

  const isContractCreation = !tx.to || isZeroHash(tx.to)
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

        toEnsText = ''
        if (to) toEnsAddress = await getEnsNameForAddress(to)
        if (toEnsAddress) toEnsText = ` (${toEnsAddress})`

        emTitle = `to transfer ${web3.utils.fromWei(
          String(value)
        )} ${tokenSymbolPrefix}${token.symbol}`
        postTitle = `to ${to}${toEnsText}. Are you sure?`
      } else if (
        to === process.env.FAUCET_CONTRACT_ADDRESS &&
        name === 'getWei'
      ) {
        emTitle = `to request 1 ${tokenSymbolPrefix}EBK`
        postTitle = 'from faucet. Are you sure?'
      } else {
        emTitle = `to call ${name}`
        postTitle = `at contract address ${to}${toEnsText}. Are you sure?`
      }
    } else {
      postTitle = `to ${to}${toEnsText}. Are you sure?`
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
  getTokenSymbolPrefix,
  cancelPendingTx,
  checkIfEnoughBalance,
  getTxLogInfo,
  getTransactionMessage,
  loadTxsInfoFromExplorer,
}

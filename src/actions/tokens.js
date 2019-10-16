import abiDecoder from 'abi-decoder'

import store from '@/store'
import { web3 } from './web3ebakus'

const erc20Abi = JSON.parse(
  '[{"constant":true,"inputs":[],"name":"name","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_spender","type":"address"},{"name":"_value","type":"uint256"}],"name":"approve","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"totalSupply","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_from","type":"address"},{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transferFrom","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[],"name":"decimals","outputs":[{"name":"","type":"uint8"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[{"name":"_owner","type":"address"}],"name":"balanceOf","outputs":[{"name":"balance","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"symbol","outputs":[{"name":"","type":"string"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":false,"inputs":[{"name":"_to","type":"address"},{"name":"_value","type":"uint256"}],"name":"transfer","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":true,"inputs":[{"name":"_owner","type":"address"},{"name":"_spender","type":"address"}],"name":"allowance","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"payable":true,"stateMutability":"payable","type":"fallback"},{"anonymous":false,"inputs":[{"indexed":true,"name":"owner","type":"address"},{"indexed":true,"name":"spender","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Approval","type":"event"},{"anonymous":false,"inputs":[{"indexed":true,"name":"from","type":"address"},{"indexed":true,"name":"to","type":"address"},{"indexed":false,"name":"value","type":"uint256"}],"name":"Transfer","type":"event"}]'
)

abiDecoder.addABI(erc20Abi)

const getTokenInfoForContractAddress = address => {
  return store.state.tokens.find(token => token.contractAddress === address)
}

const getTokenInfoForSymbol = symbol => {
  return store.state.tokens.find(
    token => token.symbol.toLowerCase() === symbol.toLowerCase()
  )
}

const decodeData = data => {
  return abiDecoder.decodeMethod(data)
}

const getTransferTxForToken = (token, to, amount) => {
  const { contractAddress } = token

  if (!contractAddress || !to || !amount) {
    return
  }

  // TODO: use token.decimals in toWei conv
  const value = web3.utils.toWei(String(amount))

  const contract = new web3.eth.Contract(erc20Abi, contractAddress)

  return {
    to: contractAddress,
    data: contract.methods.transfer(to, value).encodeABI(),
  }
}

const getBalanceOfAddressForToken = token => {
  const { contractAddress } = token

  if (!contractAddress) {
    return
  }

  const addr = store.state.wallet.address

  const contract = new web3.eth.Contract(erc20Abi, contractAddress)

  return contract.methods.balanceOf(addr).call()
}

export {
  getTokenInfoForContractAddress,
  getTokenInfoForSymbol,
  decodeData,
  getTransferTxForToken,
  getBalanceOfAddressForToken,
}

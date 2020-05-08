import abiDecoder from 'abi-decoder'
import debounce from 'lodash/debounce'
import memoize from 'lodash/memoize'

import { web3, isConnectionErrorAndResolved } from './web3ebakus'

const getAbiWithCaching = memoize(async contractAddress => {
  const abi = await web3.eth.getAbiForAddress(contractAddress)
  return JSON.parse(abi)
})

const cleanAbiCacheForUrl = debounce(function(contractAddress) {
  getAbiWithCaching.cache.delete(contractAddress)
}, 2000)

const getAbi = async contractAddress => {
  let abi

  try {
    abi = await getAbiWithCaching(contractAddress)
  } catch (err) {
    if (await isConnectionErrorAndResolved()) {
      return await getAbi(contractAddress)
    }

    cleanAbiCacheForUrl(contractAddress)
    return false
  }

  return abi
}

const decodeDataUsingAbi = async (contractAddress, data) => {
  const abi = await getAbi(contractAddress)
  if (!abi || !data) {
    return
  }

  const abiDecoderInstance = new abiDecoder.AbiDecoder()
  abiDecoderInstance.addABI(abi)

  return abiDecoderInstance.decodeMethod(data)
}

const getValueForParam = (name, params) => {
  const obj = params.find(item => item.name === name)
  return obj && obj.value
}

export { decodeDataUsingAbi, getValueForParam }

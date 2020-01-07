import abiDecoder from 'abi-decoder'
import axios from 'axios'
import debounce from 'lodash/debounce'
import memoize from 'lodash/memoize'

import store from '@/store'

const requestAbiWithCaching = memoize(async req => await axios.get(req))

const cleanAbiCacheForUrl = debounce(function(url) {
  requestAbiWithCaching.cache.delete(url)
}, 2000)

const getAbi = async contractAddress => {
  const isTestnet = store.getters.network.isTestnet
  const apiEndpoint = isTestnet
    ? process.env.TESTNET_API_ENDPOINT
    : process.env.MAINNET_API_ENDPOINT

  let abi
  const abiUrl = `${apiEndpoint}/abi/${contractAddress}`

  try {
    const req = await requestAbiWithCaching(abiUrl)
    abi = req.data
  } catch (err) {
    cleanAbiCacheForUrl(abiUrl)
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

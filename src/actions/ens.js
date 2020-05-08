import axios from 'axios'
import memoize from 'lodash/memoize'
import debounce from 'lodash/debounce'
import namehash from 'eth-ens-namehash'

import store from '@/store'
import { isZeroHash } from '@/utils'

import { web3, checkConnectionError } from './web3ebakus'

const ContractAddress = process.env.ENS_CONTRACT_ADDRESS

let _contract

const getEnsContract = async () => {
  if (!ContractAddress) return
  if (_contract) return _contract

  try {
    let contractABI = await web3.eth.getAbiForAddress(ContractAddress)
    contractABI = JSON.parse(contractABI)

    _contract = new web3.eth.Contract(contractABI, ContractAddress)
    return _contract
  } catch (err) {
    if (await checkConnectionError(err)) {
      return await getEnsContract()
    }
  }
}

const getAddressWithCaching = memoize(async hash => {
  const contract = await getEnsContract()
  if (!contract) return null

  const address = await contract.methods.getAddress(hash).call()
  return isZeroHash(address) ? null : address
})

const cleanAddressCache = debounce(function(hash) {
  getAddressWithCaching.cache.delete(hash)
}, 2000)

const getAddressForEns = async name => {
  const hash = namehash.hash(name)

  try {
    return await getAddressWithCaching(hash)
  } catch (err) {
    if (await checkConnectionError(err)) {
      return getAddressForEns(name)
    }

    cleanAddressCache(hash)
    return false
  }
}

const getEnsNameForAddressWithCaching = memoize(async address => {
  const isTestnet = store.getters.network.isTestnet
  const apiEndpoint = isTestnet
    ? process.env.TESTNET_API_ENDPOINT
    : process.env.MAINNET_API_ENDPOINT

  try {
    const res = await axios.get(apiEndpoint + '/ens/' + address)

    const { data: { name } = {} } = res
    return name
  } catch (err) {
    console.error('Failed to find ENS name for address', err)
  }
})

const cleanEnsNameForAddressCache = debounce(function(hash) {
  getAddressWithCaching.cache.delete(hash)
}, 2000)

const getEnsNameForAddress = async address => {
  try {
    return await getEnsNameForAddressWithCaching(address)
  } catch (err) {
    cleanEnsNameForAddressCache(address)
    return
  }
}

const storeEnsNameForAddress = async (name, address) => {
  const hash = namehash.hash(name)

  const isTestnet = store.getters.network.isTestnet
  const apiEndpoint = isTestnet
    ? process.env.TESTNET_API_ENDPOINT
    : process.env.MAINNET_API_ENDPOINT

  try {
    const res = await axios.post(apiEndpoint + '/ens', {
      address,
      name,
      hash,
    })
    return res.status >= 200 && res.status < 300
  } catch (err) {
    console.log('Failed to store name for ENS address', err)
    return false
  }
}

export { getAddressForEns, getEnsNameForAddress, storeEnsNameForAddress }

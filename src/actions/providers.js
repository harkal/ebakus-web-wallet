import { Networks } from '@/constants'
import store from '@/store/index'

import { web3 } from './web3ebakus'

const getProvider = network => {
  if (typeof network === 'string') {
    return network
  }

  // handle network object model
  const { networkId = process.env.DEFAULT_NETWORK_ID, nodeAddress } = network
  if (typeof nodeAddress === 'string' && nodeAddress !== '') {
    return nodeAddress
  }

  return getProviderByNetworkId(networkId)
}

const setProvider = network => {
  const provider = getProvider(network)

  if (provider) {
    web3.setProvider(provider)
    return true
  }

  return false
}

const getProviderByNetworkId = id => {
  if (!Networks.hasOwnProperty(id)) {
    alert('The given network is not valid!')
    return
  }

  const { endpoint, provider } = Networks[id]

  if (typeof provider === 'function') {
    return provider()
  } else if (endpoint) {
    return endpoint
  }

  return false
}

const getCurrentProviderEndpoint = () => {
  const provider = getProvider(store.getters.network)
  if (typeof provider == 'string') {
    return provider
  } else if (
    typeof provider.connection !== 'undefined' &&
    typeof provider.connection.url !== 'undefined'
  ) {
    return provider.connection.url
  }
}

const setProviderByNetworkId = id => {
  const provider = getProviderByNetworkId(id)

  if (provider) {
    web3.setProvider(provider)
    return true
  }

  return false
}

export {
  getProvider,
  setProvider,
  getProviderByNetworkId,
  getCurrentProviderEndpoint,
  setProviderByNetworkId,
}

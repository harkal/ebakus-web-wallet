import { Networks, NetworkStatus, SpinnerState } from '@/constants'

import MutationTypes from '@/store/mutation-types'
import store from '@/store'

import {
  loadedInIframe,
  frameEventConnectionStatusUpdated,
} from '@/parentFrameMessenger/parentFrameMessenger'

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
    console.error('The given network is not valid!', id)
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

const checkNodeConnection = async (force = false) => {
  if (!force && store.state.network.status === NetworkStatus.CONNECTED) {
    return
  }

  try {
    const chainId = await web3.eth.getChainId()

    if (store.state.network.status !== NetworkStatus.CONNECTED) {
      store.dispatch(MutationTypes.SET_NETWORK_CHAIN_ID, chainId)

      store.dispatch(
        MutationTypes.SET_SPINNER_STATE,
        SpinnerState.NODE_CONNECTED
      )
      store.dispatch(MutationTypes.SET_NETWORK_STATUS, NetworkStatus.CONNECTED)

      if (loadedInIframe()) {
        frameEventConnectionStatusUpdated(NetworkStatus.CONNECTED)
      }
    }
  } catch (err) {
    console.error('Failed to connect to network', err)

    if (store.state.network.status !== NetworkStatus.DISCONNECTED) {
      store.dispatch(
        MutationTypes.SET_SPINNER_STATE,
        SpinnerState.NODE_DISCONNECTED
      )
      store.dispatch(
        MutationTypes.SET_NETWORK_STATUS,
        NetworkStatus.DISCONNECTED
      )

      if (loadedInIframe()) {
        frameEventConnectionStatusUpdated(NetworkStatus.DISCONNECTED)
      }
    }
  }
}

export {
  getProvider,
  setProvider,
  getProviderByNetworkId,
  getCurrentProviderEndpoint,
  setProviderByNetworkId,
  checkNodeConnection,
}

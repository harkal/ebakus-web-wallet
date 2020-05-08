import Web3 from 'web3'

import { Networks, NetworkStatus, SpinnerState } from '@/constants'

import MutationTypes from '@/store/mutation-types'
import store from '@/store'

import {
  loadedInIframe,
  frameEventConnectionStatusUpdated,
} from '@/parentFrameMessenger/parentFrameMessenger'

import { web3 } from './web3ebakus'
import { HardwareWalletTypes } from '../constants'
import { getLedgerProvider } from './providers/ledger'
import { getTrezorProvider } from './providers/trezor'

/**
 * Get web3 provider endpoint from the predefined network list.
 *
 * @param {number} Network ID of the network to connect
 * @return {string}
 */
const getProviderEndpointByNetworkId = id => {
  id = parseInt(id)

  if (!Networks.hasOwnProperty(id)) {
    console.error('The given network is not valid!', id)
    return
  }

  const { endpoint } = Networks[id]
  if (endpoint) {
    return endpoint
  }

  return ''
}

/**
 * Get web3 provider endpoint.
 *
 * @return {string}
 */
const getProviderEndpoint = (network = store.getters.network) => {
  const { networkId, nodeAddress } = network

  // custom defined network
  if (
    networkId == -1 &&
    typeof nodeAddress === 'string' &&
    nodeAddress !== ''
  ) {
    return nodeAddress
  }

  const predefinedNetwork = getProviderEndpointByNetworkId(networkId)
  if (typeof predefinedNetwork === 'string' && predefinedNetwork !== '') {
    return predefinedNetwork
  }
}

/**
 * Get a web3-provider-engine provider for a hardware wallet.
 *
 * @return {Provider}
 */
const getHardwareWalletProvider = async () => {
  // handle hardware wallets
  const {
    isUsingHardwareWallet,
    hardwareWallet: { type: hardwareWalletType },
  } = store.getters.wallet

  if (isUsingHardwareWallet) {
    const {
      hardwareWallets: { ledger: { connectionType } = {} } = {},
    } = store.getters.network

    try {
      if (hardwareWalletType === HardwareWalletTypes.LEDGER) {
        return await getLedgerProvider(connectionType)
      } else if (hardwareWalletType === HardwareWalletTypes.TREZOR) {
        return await getTrezorProvider()
      }
    } catch (err) {
      throw new Error("Can't load Ledger provider")
    }
  }
}

/**
 * Get a web3 provider.
 *
 * @return {Provider}
 */
const getProvider = async endpoint => {
  if (!endpoint) {
    endpoint = getProviderEndpoint()
  }

  const hardwareWalletProvider = await getHardwareWalletProvider()

  if (hardwareWalletProvider) {
    return hardwareWalletProvider

    // autodetect provider
  } else if (endpoint && typeof endpoint === 'string') {
    try {
      // HTTP
      if (/^http(s)?:\/\//i.test(endpoint)) {
        return new Web3.providers.HttpProvider(endpoint)

        // WS
      } else if (/^ws(s)?:\/\//i.test(endpoint)) {
        return new Web3.providers.WebsocketProvider(endpoint)
      }
    } catch (err) {
      throw new Error('Failed to get web3 provider')
    }
  }

  throw new Error("This provider endpoint can't be handled")
}

/**
 * Set a web3 provider.
 *
 * @param {Provider} An actual web3 provider
 * @return {bool}
 */
const setProvider = provider => {
  if (provider) {
    web3.setProvider(provider)
    return true
  }

  return false
}

const checkNodeConnection = async () => {
  try {
    const chainId = await web3.eth.getChainId()

    store.dispatch(MutationTypes.SET_SPINNER_STATE, SpinnerState.NODE_CONNECTED)

    if (store.state.network.status !== NetworkStatus.CONNECTED) {
      store.dispatch(MutationTypes.SET_NETWORK_CHAIN_ID, chainId)
      store.dispatch(MutationTypes.SET_NETWORK_STATUS, NetworkStatus.CONNECTED)

      if (loadedInIframe()) {
        frameEventConnectionStatusUpdated(NetworkStatus.CONNECTED)
      }
    }

    return Promise.resolve()
  } catch (err) {
    console.error('Failed to connect to network', err)

    // timeout has been added for UX reasons only
    setTimeout(
      () =>
        store.dispatch(
          MutationTypes.SET_SPINNER_STATE,
          SpinnerState.NODE_DISCONNECTED
        ),
      1000
    )

    if (store.state.network.status !== NetworkStatus.DISCONNECTED) {
      store.dispatch(
        MutationTypes.SET_NETWORK_STATUS,
        NetworkStatus.DISCONNECTED
      )

      if (loadedInIframe()) {
        frameEventConnectionStatusUpdated(NetworkStatus.DISCONNECTED)
      }
    }

    return Promise.reject()
  }
}

export { getProviderEndpoint, getProvider, setProvider, checkNodeConnection }

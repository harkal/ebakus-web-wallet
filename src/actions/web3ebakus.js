import Web3 from 'web3'
import ebakus from 'web3-ebakus'

import { NetworkStatus } from '@/constants'
import store from '@/store'
import { waitUntil } from '@/utils'

import { getProviderEndpoint, getProvider } from './providers'

let web3 = null

const init = async () => {
  const providerEndpoint = getProviderEndpoint()
  const provider = await getProvider(providerEndpoint)

  if (web3 === null) {
    web3 = ebakus(new Web3(provider))
  } else {
    web3.setProvider(provider)
  }
  return web3
}

const isConnectionErrorAndResolved = async err => {
  if (err && err.message === 'connection not open') {
    // ensure reconnected before handling any jobs
    // reconnection logic exists in actions/wallet.js -> getBalance()
    await waitUntil(
      () => store.state.network.status === NetworkStatus.CONNECTED,
      () => null,
      200
    )
    return true
  }
}

export { init, web3, isConnectionErrorAndResolved }

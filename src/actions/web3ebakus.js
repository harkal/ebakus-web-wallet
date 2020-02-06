import Web3 from 'web3'
import ebakus from 'web3-ebakus'

import { getProviderEndpoint, getProvider } from './providers'

let web3 = null

const init = async () => {
  const providerEndpoint = getProviderEndpoint()

  // check if currentProvider is same with the one we are going to set
  if (
    web3 !== null &&
    typeof web3.currentProvider !== 'undefined' &&
    typeof web3.currentProvider.connection !== 'undefined' &&
    typeof web3.currentProvider.connection.url === 'string' &&
    web3.currentProvider.connection.url.indexOf(providerEndpoint) != -1
  ) {
    return
  }

  const provider = await getProvider(providerEndpoint)
  // }

  if (web3 === null) {
    web3 = ebakus(new Web3(provider))
  } else {
    web3.setProvider(provider)
  }
  return web3
}

export { init, web3 }

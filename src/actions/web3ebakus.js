import Web3 from 'web3'
import ebakus from 'web3-ebakus'

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

export { init, web3 }

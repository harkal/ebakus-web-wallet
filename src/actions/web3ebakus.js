import Web3 from 'web3'
import ebakus from 'web3-ebakus'

import { getProvider } from './providers'

let web3 = null

const init = provider => {
  if (web3 === null) {
    web3 = ebakus(new Web3(getProvider(provider)))
  } else {
    web3.setProvider(getProvider(provider))
  }
  return web3
}

export { init, web3 }

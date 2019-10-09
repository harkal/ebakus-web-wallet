import Web3 from 'web3'
import ebakus from 'web3-ebakus'
import { getProvider } from './providers'

let web3

const init = provider => {
  web3 = ebakus(new Web3(getProvider(provider)))
  return web3
}

export { init, web3 }

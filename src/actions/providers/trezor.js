import ProviderEngine from 'web3-provider-engine'
import WebsocketSubprovider from 'web3-provider-engine/subproviders/websocket'
import RpcSubprovider from 'web3-provider-engine/subproviders/rpc'

import { HardwareWalletTypes } from '@/constants'

import MutationTypes from '@/store/mutation-types'
import store from '@/store'

import { web3 } from '../web3ebakus'
import { getProviderEndpoint } from '../providers'

import createTrezorSubprovider from './createTrezorSubprovider'
import createCleanRpcReqIdMiddleware from './subproviders/cleanRpcReqId'

let _providerEngine = null

const getProvider = async () => {
  // reset the old one before changing, if still connected
  if (_providerEngine !== null) _providerEngine.stop()

  const engine = new ProviderEngine()

  const trezor = createTrezorSubprovider({
    networkId: store.state.network.networkId || process.env.MAINNET_CHAIN_ID,
  })

  engine.addProvider(trezor)

  // FIXME: temporary fix for https://github.com/MetaMask/eth-block-tracker/pull/42
  const cleanRPCReqIdSubprovider = createCleanRpcReqIdMiddleware()
  engine.addProvider(cleanRPCReqIdSubprovider)

  const providerEndpoint = getProviderEndpoint()

  // autodetect provider
  if (providerEndpoint && typeof providerEndpoint === 'string') {
    // HTTP
    if (/^http(s)?:\/\//i.test(providerEndpoint)) {
      engine.addProvider(new RpcSubprovider({ rpcUrl: providerEndpoint }))

      // WS
    } else if (/^ws(s)?:\/\//i.test(providerEndpoint)) {
      engine.addProvider(new WebsocketSubprovider({ rpcUrl: providerEndpoint }))
    } else {
      return Promise.reject(
        new Error("This provider endpoint can't be handled with Ledger")
      )
    }
  }

  // network connectivity error
  engine.on('connection error', function(err) {
    // report connectivity errors
    console.error('web3-provider-engine connection error', err)
  })

  _providerEngine = engine

  engine.start()

  return engine
}

const setProvider = async type => {
  const engine = await getProvider(type)

  // clear loaded wallet accounts
  web3.eth.accounts.wallet.clear()

  store.dispatch(MutationTypes.SET_HARDWARE_WALLET_TYPE, {
    type: HardwareWalletTypes.TREZOR,
  })

  web3.setProvider(engine)
}

export { getProvider as getTrezorProvider, setProvider as setTrezorProvider }

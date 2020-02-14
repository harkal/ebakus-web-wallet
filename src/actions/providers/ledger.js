import TransportWebBLE from '@ledgerhq/hw-transport-web-ble'
// import TransportWebUSB from '@ledgerhq/hw-transport-webusb'
import TransportU2F from '@ledgerhq/hw-transport-u2f'

import ProviderEngine from 'web3-provider-engine'
import WebsocketSubprovider from 'web3-provider-engine/subproviders/websocket'
import RpcSubprovider from 'web3-provider-engine/subproviders/rpc'

import { loadedInIframe } from '@/parentFrameMessenger/parentFrameMessenger'

import MutationTypes from '@/store/mutation-types'
import store from '@/store'

import { web3 } from '../web3ebakus'
import { getProviderEndpoint } from '../providers'

import createLedgerSubprovider from './createLedgerSubprovider'
import { HardwareWalletTypes } from '../../constants'

const ConnectionTypes = {
  // USB: 'USB',
  U2F: 'USB (using U2F)',
  BLE: 'Bluetooth',
}

let _providerEngine = null
let _activeTransport = {
  /* type, transport */
}

const isTypeSupported = async type => {
  if (type === ConnectionTypes.USB) {
    return false
    // disable USB for now for UX reasons
    // user can use U2F as alternative
    // return await TransportWebUSB.isSupported()
  } else if (type === ConnectionTypes.BLE) {
    // TODO: https://chromium-review.googlesource.com/c/chromium/src/+/657572
    return !loadedInIframe() && (await TransportWebBLE.isSupported())
  } else if (type === ConnectionTypes.U2F) {
    return await TransportU2F.isSupported()
  }
}

const setSupportedTypes = async () => {
  const supportedTypes = []
  for (let key of Object.keys(ConnectionTypes)) {
    const type = ConnectionTypes[key]
    const isSupported = await isTypeSupported(type)
    if (isSupported) {
      supportedTypes.push(key)
    }
  }

  store.dispatch(
    MutationTypes.SET_LEDGER_SUPPORTED_CONNECTION_TYPES,
    supportedTypes
  )
}

const getTransportWrapper = type => {
  const activeTransport = _activeTransport.transport
  if (activeTransport) {
    activeTransport.close()
  }

  _activeTransport = {}

  return async () => {
    const activeTransport = _activeTransport.transport
    if (activeTransport) {
      return activeTransport
    }

    let transport

    if (ConnectionTypes[type] === ConnectionTypes.USB) {
      // transport = await TransportWebUSB.create()
      return Promise.reject(
        new Error('Ledger USB connection type is not supported at the moment')
      )
    } else if (ConnectionTypes[type] === ConnectionTypes.BLE) {
      transport = await TransportWebBLE.create()
    } else if (ConnectionTypes[type] === ConnectionTypes.U2F) {
      transport = await TransportU2F.create()
    }

    transport.on('disconnect', () => {
      _activeTransport = {}
    })

    _activeTransport.type = type
    _activeTransport.transport = transport

    return transport
  }
}

const getProvider = async type => {
  if (!Object.keys(ConnectionTypes).includes(type)) {
    return Promise.reject(
      new Error('This is not a valid transport connection type for Ledger')
    )
  }

  // reset the old one before changing, if still connected
  if (_providerEngine !== null) _providerEngine.stop()

  const getTransport = getTransportWrapper(type)

  const engine = new ProviderEngine()

  const ledger = createLedgerSubprovider(getTransport, {
    networkId: store.state.network.networkId || process.env.MAINNET_CHAIN_ID,
    accountsLength: 5,
  })

  engine.addProvider(ledger)

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

  _providerEngine = engine

  engine.start()

  return engine
}

const setProvider = async type => {
  const engine = await getProvider(type)

  // clear loaded wallet accounts
  web3.eth.accounts.wallet.clear()

  store.dispatch(MutationTypes.SET_HARDWARE_WALLET_TYPE, {
    type: HardwareWalletTypes.LEDGER,
    connectionType: type,
  })

  web3.setProvider(engine)
}

export {
  ConnectionTypes as LedgerConnectionTypes,
  isTypeSupported as isLedgerTypeSupported,
  setSupportedTypes as setLedgerSupportedTypes,
  getTransportWrapper as getLedgerTransport,
  getProvider as getLedgerProvider,
  setProvider as setLedgerProvider,
}

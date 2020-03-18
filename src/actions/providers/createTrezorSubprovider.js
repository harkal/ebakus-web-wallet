import TrezorConnect from 'trezor-connect'
import { TrezorSubprovider } from '@0x/subproviders/lib/src/subproviders/trezor'

const defaultOptions = {
  networkId: process.env.DEFAULT_NETWORK_ID, // mainnet
}

export default function createTrezorSubprovider(options) {
  const { networkId } = {
    ...defaultOptions,
    ...options,
  }

  TrezorConnect.manifest({
    email: 'harry@ebakus.com',
    appUrl: process.env.WALLET_DEPLOYED_URL,
  })

  return new TrezorSubprovider({
    trezorConnectClientApi: TrezorConnect,
    networkId,
  })
}

import Web3 from 'web3'
import ebakus from 'web3-ebakus'

import { HardwareWalletTypes } from '@/constants'
import store from '@/store'

import { getProvider } from './providers'
import { getLedgerProvider } from './providers/ledger'

let web3 = null

const init = async provider => {
  // handle hardware wallets
  const {
    isUsingHardwareWallet,
    hardwareWallet: { type: hardwareWalletType },
  } = store.getters.wallet

  let engine

  if (isUsingHardwareWallet) {
    const {
      hardwareWallets: { ledger: { connectionType } = {} } = {},
    } = store.getters.network

    if (hardwareWalletType === HardwareWalletTypes.LEDGER) {
      try {
        engine = await getLedgerProvider(connectionType)
      } catch (err) {
        console.error("Can't load Ledger provider", err)
      }
    }
  }

  if (!isUsingHardwareWallet || !provider) {
    engine = getProvider(provider)
  }

  if (web3 === null) {
    web3 = ebakus(new Web3(engine))
  } else {
    web3.setProvider(engine)
  }
  return web3
}

export { init, web3 }

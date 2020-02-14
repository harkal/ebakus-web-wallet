import orderBy from 'lodash/orderBy'

import { HardwareWalletTypes } from '@/constants'

import Transaction from '@/actions/Transaction'

export default {
  network(state) {
    return {
      ...state.network,
      isTestnet: state.network.chainId == process.env.TESTNET_CHAIN_ID,
    }
  },

  wallet(state) {
    const hardwareWalletType = state.wallet.hardwareWallet.type

    const isValidHardwareWalletType =
      hardwareWalletType !== null &&
      Object.values(HardwareWalletTypes).includes(hardwareWalletType)
    const isValidHardwareWallet =
      isValidHardwareWalletType && state.wallet.address !== null

    return {
      ...state.wallet,
      locked: isValidHardwareWallet ? false : state.wallet.locked,
      isUsingHardwareWallet: isValidHardwareWalletType,
    }
  },

  txObject(state) {
    const tx = state.tx
    if (!(tx instanceof Transaction)) {
      return {}
    }
    return tx.object
  },

  getSortedLogs(state) {
    const logs = [...state.history.local, ...state.history.remote]
    return orderBy(logs, ['timestamp'], ['desc'])
  },

  getDAppWhitelist(state) {
    return origin => state.whitelist[origin]
  },
}

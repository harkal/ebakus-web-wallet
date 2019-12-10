import orderBy from 'lodash/orderBy'

import { Networks } from '@/constants'

export default {
  network(state) {
    const networkId =
      typeof state.network.networkId !== 'undefined'
        ? state.network.networkId
        : process.env.DEFAULT_NETWORK_ID

    const networkOpts = Networks[networkId]
    const isTestnet =
      (networkOpts && networkOpts.testnet) ||
      state.network.chainId == process.env.TESTNET_CHAIN_ID

    return {
      networkId,
      isTestnet,
      nodeAddress: state.network.nodeAddress,
      status: state.network.status,
    }
  },

  getSortedLogs(state) {
    const logs = [...state.history.local, ...state.history.remote]
    return orderBy(logs, ['timestamp'], ['desc'])
  },

  getDAppWhitelist(state) {
    return origin => state.whitelist[origin]
  },
}

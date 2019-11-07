import orderBy from 'lodash/orderBy'

export default {
  network(state) {
    return {
      networkId: state.network.network_id || process.env.DEFAULT_NETWORK_ID,
      nodeAddress: state.network.node_address,
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

import orderBy from 'lodash/orderBy'

export default {
  network(state) {
    return {
      networkId: state.network.network_id || process.env.DEFAULT_NETWORK_ID,
      nodeAddress: state.network.node_address,
    }
  },

  getSortedLogs(state) {
    return orderBy(state.history, ['timestamp'])
  },

  getDAppWhitelist(state) {
    return origin => state.whitelist[origin]
  },
}

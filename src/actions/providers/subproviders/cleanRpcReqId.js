import { inherits } from 'util'
import Subprovider from 'web3-provider-engine/subproviders/subprovider'

inherits(CleanRpcReqIdSubprovider, Subprovider)

function CleanRpcReqIdSubprovider() {}

CleanRpcReqIdSubprovider.prototype.handleRequest = function(payload, next) {
  const { id, method } = payload
  if (method === 'eth_blockNumber' && id === 1) {
    delete payload.id
  }
  next()
}

export default function createCleanRpcReqIdMiddleware() {
  return new CleanRpcReqIdSubprovider()
}

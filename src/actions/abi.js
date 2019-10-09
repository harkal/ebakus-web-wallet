import Vue from 'vue'
import abiDecoder from 'abi-decoder'

const cachedAbis = {}

const getAbi = async contractAddress => {
  let abi = cachedAbis[contractAddress]

  if (!abi) {
    abi = await loadContractAbiFromExplorer(contractAddress)
    if (!abi) {
      return false
    }

    cachedAbis[contractAddress] = abi
  }

  return abi
}

const decodeDataUsingAbi = async (contractAddress, data) => {
  const abi = await getAbi(contractAddress)
  if (!abi || !data) {
    return
  }

  const abiDecoderInstance = new abiDecoder.AbiDecoder()
  abiDecoderInstance.addABI(abi)

  return abiDecoderInstance.decodeMethod(data)
}

const getValueForParam = (name, params) => {
  const obj = params.find(item => item.name === name)
  return obj && obj.value
}

const loadContractAbiFromExplorer = async address => {
  try {
    const res = await Vue.http.get(`${process.env.API_ENDPOINT}/abi/${address}`)
    return res.data
  } catch {
    return
  }
}

export { decodeDataUsingAbi, getValueForParam }

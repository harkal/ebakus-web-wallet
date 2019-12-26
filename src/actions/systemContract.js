import { addPendingTx, calcWorkAndSendTx } from './transactions'
import { web3 } from './web3ebakus'

import store from '@/store'
import MutationTypes from '@/store/mutation-types'

const EBK_PRECISION_FACTOR = 10000

const SystemContractAddress = '0x0000000000000000000000000000000000000101'
const SystemContractVoteABI = [
  {
    type: 'function',
    name: 'stake',
    inputs: [
      {
        name: 'amount',
        type: 'uint64',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'getStaked',
    inputs: [],
    outputs: [
      {
        name: 'staked',
        type: 'uint64',
      },
    ],
    constant: true,
    payable: false,
    stateMutability: 'view',
  },
  {
    type: 'function',
    name: 'unstake',
    inputs: [
      {
        name: 'amount',
        type: 'uint64',
      },
    ],
    outputs: [],
    stateMutability: 'nonpayable',
  },
  {
    type: 'function',
    name: 'claim',
    inputs: [],
    outputs: [],
    stateMutability: 'nonpayable',
  },
]

let _systemContract

const getContractInstance = () => {
  if (_systemContract) {
    return _systemContract
  }

  _systemContract = new web3.eth.Contract(
    SystemContractVoteABI,
    SystemContractAddress,
    { from: store.state.wallet.address }
  )

  return _systemContract
}

const getStaked = async () => {
  try {
    const systemContract = getContractInstance()
    const staked = await systemContract.methods
      .getStaked()
      .call({ from: store.state.wallet.address })

    const stakedAmountInEbk = staked / EBK_PRECISION_FACTOR

    if (
      parseFloat(stakedAmountInEbk) != parseFloat(store.state.wallet.staked)
    ) {
      store.dispatch(MutationTypes.SET_WALLET_STAKED, stakedAmountInEbk)
    }

    return Promise.resolve(stakedAmountInEbk)
  } catch (err) {
    console.error('Failed to fetch staked amount.', err)

    return Promise.reject(err)
  }
}

const stake = async amount => {
  try {
    const systemContract = getContractInstance()
    const amountInEbk = Math.floor(amount * EBK_PRECISION_FACTOR)

    const txWithPow = await addPendingTx({
      to: SystemContractAddress,
      data: systemContract.methods.stake(amountInEbk).encodeABI(),
    })
    await calcWorkAndSendTx(txWithPow, /* handleErrorUI */ false)

    await getStaked()

    return Promise.resolve()
  } catch (err) {
    console.error('Failed to stake amount.', err)
    return Promise.reject(err)
  }
}

const unstake = async amount => {
  try {
    const systemContract = getContractInstance()
    const amountInEbk = Math.floor(amount * EBK_PRECISION_FACTOR)

    const txWithPow = await addPendingTx({
      to: SystemContractAddress,
      data: systemContract.methods.unstake(amountInEbk).encodeABI(),
    })
    await calcWorkAndSendTx(txWithPow, /* handleErrorUI */ false)

    await getStaked()

    return Promise.resolve()
  } catch (err) {
    console.error('Failed to unstake amount.', err)
    return Promise.reject(err)
  }
}

const getClaimableEntries = async () => {
  try {
    const iter = await web3.db.select(
      SystemContractAddress,
      'Claimable',
      'Id LIKE ' + store.state.wallet.address,
      'Id ASC',
      'latest'
    )

    let entries = []
    let claimable = null

    do {
      claimable = await web3.db.next(iter)
      if (claimable != null) {
        entries.push(claimable)
      }
    } while (claimable != null)

    entries = entries.map(entry => ({
      amount: entry.Amount / EBK_PRECISION_FACTOR,
      timestamp: entry.Timestamp,
    }))

    return Promise.resolve(entries)
  } catch (err) {
    console.error('Failed to fetch claimable entries.', err)
    return Promise.reject(err)
  }
}

const claimUnstaked = async () => {
  try {
    const systemContract = getContractInstance()
    const txWithPow = await addPendingTx({
      to: SystemContractAddress,
      data: systemContract.methods.claim().encodeABI(),
    })
    await calcWorkAndSendTx(txWithPow)

    await getStaked()

    return Promise.resolve()
  } catch (err) {
    console.error('Failed to claim unstaked.', err)
    return Promise.reject(err)
  }
}

export { stake, getStaked, unstake, getClaimableEntries, claimUnstaked }

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

    const stakeMethod = systemContract.methods.stake(amountInEbk)

    const estimatedGas = await stakeMethod.estimateGas()

    const txWithPow = await addPendingTx({
      to: SystemContractAddress,
      data: stakeMethod.encodeABI(),
      gas: estimatedGas + 5000,
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

    const unstakeMethod = systemContract.methods.unstake(amountInEbk)

    const estimatedGas = await unstakeMethod.estimateGas()

    const txWithPow = await addPendingTx({
      to: SystemContractAddress,
      data: unstakeMethod.encodeABI(),
      gas: estimatedGas + 5000,
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

    const claimMethod = systemContract.methods.claim()

    const estimatedGas = await claimMethod.estimateGas()

    const txWithPow = await addPendingTx({
      to: SystemContractAddress,
      data: claimMethod.encodeABI(),
      gas: estimatedGas + 5000,
    })
    await calcWorkAndSendTx(txWithPow)

    await getStaked()

    return Promise.resolve()
  } catch (err) {
    console.error('Failed to claim unstaked.', err)
    return Promise.reject(err)
  }
}

const isVotingCall = () => {
  const tx = store.state.tx.object

  return (
    tx.to === '0x0000000000000000000000000000000000000101' &&
    tx.data.startsWith('0xed081329')
  )
}
const hasStakeForVotingCall = () => {
  return store.state.wallet.staked > 0
}

export {
  stake,
  getStaked,
  unstake,
  getClaimableEntries,
  claimUnstaked,
  isVotingCall,
  hasStakeForVotingCall,
}

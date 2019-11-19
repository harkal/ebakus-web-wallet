<template>
  <button v-if="network.isTestnet" class="full" @click="getWei">
    Get from faucet
  </button>
</template>

<script>
import { mapGetters } from 'vuex'

import { addPendingTx, calcWorkAndSendTx } from '@/actions/transactions'
import { web3 } from '@/actions/web3ebakus'

const abi = JSON.parse(
  '[{"constant":false,"inputs":[],"name":"getWei","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"killMe","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"toWhom","type":"address"}],"name":"sendWei","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"payable":true,"stateMutability":"payable","type":"fallback"},{"constant":true,"inputs":[],"name":"getBalance","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"getSendAmount","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"}]'
)

export default {
  computed: {
    ...mapGetters(['network']),
  },
  methods: {
    getWei: async function() {
      this.$emit('click') // TODO: move this logic out

      const faucetContract = new web3.eth.Contract(
        abi,
        process.env.FAUCET_CONTRACT_ADDRESS
      )
      const txWithPow = await addPendingTx({
        to: process.env.FAUCET_CONTRACT_ADDRESS,
        data: faucetContract.methods.getWei().encodeABI(),
      })
      await calcWorkAndSendTx(txWithPow)
    },
  },
}
</script>

<template>
  <div>
    <button v-if="network.isTestnet" class="full" @click="getWei">
      Get from faucet
    </button>
    <p v-if="error != ''" class="text-error">{{ error }}</p>
  </div>
</template>

<script>
import { mapGetters, mapState } from 'vuex'

import Transaction from '@/actions/Transaction'
import { web3 } from '@/actions/web3ebakus'

const abi = JSON.parse(
  '[{"constant":false,"inputs":[],"name":"getWei","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[],"name":"killMe","outputs":[{"name":"","type":"bool"}],"payable":false,"stateMutability":"nonpayable","type":"function"},{"constant":false,"inputs":[{"name":"toWhom","type":"address"}],"name":"sendWei","outputs":[],"payable":false,"stateMutability":"nonpayable","type":"function"},{"inputs":[],"payable":false,"stateMutability":"nonpayable","type":"constructor"},{"payable":true,"stateMutability":"payable","type":"fallback"},{"constant":true,"inputs":[],"name":"getBalance","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"getSendAmount","outputs":[{"name":"","type":"uint256"}],"payable":false,"stateMutability":"view","type":"function"},{"constant":true,"inputs":[],"name":"owner","outputs":[{"name":"","type":"address"}],"payable":false,"stateMutability":"view","type":"function"}]'
)

export default {
  data() {
    return {
      error: '',
    }
  },
  computed: {
    ...mapGetters(['network']),
    ...mapState({
      tx: state => state.tx,
    }),
  },
  watch: {
    tx(val) {
      if (val === null) {
        const self = this
        // timeout is here for UX, allowing user to read the error message
        setTimeout(() => {
          self.error = ''
        }, 1000)
      }
    },
  },
  methods: {
    getWei: async function() {
      this.error = ''

      this.$emit('click') // TODO: move this logic out

      const faucetContract = new web3.eth.Contract(
        abi,
        process.env.FAUCET_CONTRACT_ADDRESS
      )

      try {
        const tx = await new Transaction({
          to: process.env.FAUCET_CONTRACT_ADDRESS,
          data: faucetContract.methods.getWei().encodeABI(),
        })
        await tx.sendTx()
      } catch (err) {
        console.warn('Failed to fetch from faucet', err)
        this.error = err.message
      }
    },
  },
}
</script>

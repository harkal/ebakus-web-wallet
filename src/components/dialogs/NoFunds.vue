<template>
  <div class="no-funds dialog scroll-wrapper">
    <div class="wrapper">
      <h2>
        {{ title }}
      </h2>
      <h3>
        {{ content }}
      </h3>

      <button class="full" @click="exit">OK</button>
      <GetFaucet v-if="network.isTestnet" @click="exit" />
    </div>
  </div>
</template>

<script>
import Web3 from 'web3'
import { mapState, mapGetters } from 'vuex'

import { exitDialog } from '@/actions/wallet'

import { SpinnerState } from '@/constants'

import {
  loadedInIframe,
  replyToParentWindow,
} from '@/parentFrameMessenger/parentFrameMessenger'

import MutationTypes from '@/store/mutation-types'

import GetFaucet from '@/components/GetFaucet.vue'
import { isVotingCall } from '../../actions/systemContract'

export default {
  components: { GetFaucet },
  data() {
    return {
      title: '',
      content: '',
    }
  },
  computed: {
    ...mapGetters(['network', 'txObject']),
    ...mapState({
      balance: state => state.wallet.balance,
      tx: state => state.tx,
    }),
  },
  mounted: async function() {
    this.$store.commit(MutationTypes.SET_OVERLAY_COLOR, 'red')

    if (loadedInIframe()) {
      replyToParentWindow(null, {
        code: 'no_funds',
        msg: 'Account has not enough balance',
      })
    }

    const balance = parseFloat(Web3.utils.fromWei(this.balance))
    const value = this.txObject.value
      ? Web3.utils.fromWei(this.txObject.value)
      : '0'

    if (parseFloat(value) > balance || (isVotingCall() && balance <= 0)) {
      this.title = 'Not enough funds…'
      this.content = 'Please fund your account with more ebakus and try again.'
    } else if (parseFloat(value) < 0) {
      this.title = 'Invalid input'
      this.content = 'Please enter a valid amount to send.'
    }
  },
  methods: {
    exit: function() {
      this.tx && this.tx.userCancelTx()

      this.$store.commit(MutationTypes.SET_SPINNER_STATE, SpinnerState.NONE)

      exitDialog()
    },
  },
}
</script>

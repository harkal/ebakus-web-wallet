<template>
  <div class="failed-tx dialog scroll-wrapper">
    <div class="wrapper">
      <h2>
        Connection issues!!!
      </h2>
      <h3>
        This transaction wasn't send because of connection issues. Please wait
        for the wallet to reconnect and either retry the transaction or cancel
        it.
      </h3>

      <button class="full cta" @click="retry">Retry</button>
      <button class="full" @click="exit">Skip</button>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'

import Transaction from '@/actions/Transaction'
import { exitDialog } from '@/actions/wallet'

import { SpinnerState } from '@/constants'

import { RouteNames } from '@/router'
import MutationTypes from '@/store/mutation-types'

export default {
  computed: {
    ...mapState({
      tx: state => state.tx,
      data: state => state.ui.dialog.data,
    }),
  },
  mounted: async function() {
    this.$store.commit(MutationTypes.SET_OVERLAY_COLOR, 'black')
  },
  methods: {
    retry: async function() {
      try {
        console.log('Transaction retry')

        const txToResend = await new Transaction(
          { ...this.data.object },
          {
            id: this.data.id,
          }
        )
        txToResend.sendTx()
      } catch (err) {
        console.error('Failed to resend transaction.', err)
      }

      exitDialog()
      this.$router.push({ name: RouteNames.HOME }, () => {})
    },
    exit: function() {
      this.tx && this.tx.userCancelTx()

      this.$store.commit(MutationTypes.SET_SPINNER_STATE, SpinnerState.NONE)

      exitDialog()
    },
  },
}
</script>

<template>
  <div class="whitelist-add-dapp scroll-wrapper">
    <div class="wrapper">
      <h2>
        Do you allow <strong>{{ getDappOrigin || 'this dApp' }}</strong> to
        transact on your behalf with the ebakus network?
      </h2>
      <h3>
        By allowing it, transactions will appear on the top right of your screen
        and you will have 2 seconds to cancel, before sending them without
        further confirmation.
      </h3>

      <button class="col secondary" @click="cancelWhitelistDapp">
        Don't allow
      </button>
      <button class="col cta" @click="whitelistNewDapp">Allow</button>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'

import {
  whitelistNewDapp as whitelistNewDappFunc,
  cancelWhitelistDapp as cancelWhitelistDappFunc,
} from '@/actions/whitelist'
import { exitDialog } from '@/actions/wallet'

import { SpinnerState } from '@/constants'

import { getTargetOrigin } from '@/parentFrameMessenger/parentFrameMessenger'

import { RouteNames } from '@/router'

import MutationTypes from '@/store/mutation-types'

export default {
  computed: {
    ...mapState({
      isDrawerActiveByUser: state => state.ui.isDrawerActiveByUser,
    }),
    getDappOrigin: function() {
      return getTargetOrigin()
    },
  },
  mounted() {
    this.$store.commit(MutationTypes.SHOW_DIALOG, {
      title: 'Important',
    })
    this.$store.commit(MutationTypes.SET_OVERLAY_COLOR, 'black')
  },
  methods: {
    redirectBack: function() {
      const redirectFrom = this.$route.query.redirectFrom || RouteNames.HOME
      this.$router.push({ name: redirectFrom }, () => {})
    },
    whitelistNewDapp: function() {
      whitelistNewDappFunc()

      this.redirectBack()
      exitDialog()

      if (!this.isDrawerActiveByUser) {
        this.$store.commit(MutationTypes.DEACTIVATE_DRAWER)
      }
      this.$store.commit(
        MutationTypes.SET_SPINNER_STATE,
        SpinnerState.TRANSACTION_WHITELISTED_TIMER
      )
    },
    cancelWhitelistDapp: function() {
      this.redirectBack()
      cancelWhitelistDappFunc()
    },
  },
}
</script>

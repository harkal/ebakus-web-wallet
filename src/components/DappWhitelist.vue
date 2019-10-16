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
  beforeDestroy() {
    this.$store.commit(MutationTypes.CLEAR_DIALOG)
    this.$store.commit(MutationTypes.UNSET_OVERLAY_COLOR)
  },
  methods: {
    whitelistNewDapp: function() {
      whitelistNewDappFunc()

      exitDialog()
      this.$router.push({ name: RouteNames.HOME })
    },
    cancelWhitelistDapp: () => cancelWhitelistDappFunc(),
  },
}
</script>

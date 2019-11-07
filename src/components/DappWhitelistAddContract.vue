<template>
  <div class="whitelist-add-contract-to-dapp scroll-wrapper">
    <div class="wrapper">
      <h2>
        Do you allow <strong>{{ getDappOrigin || 'this dApp' }}</strong> to add
        an additional contract address to your whitelist?
      </h2>
      <h3>
        DApp would like to use more than 3 contracts addresses. Would you like
        to also whitelist this contract address
        <strong>{{ contractAddress }}</strong> for this dApp.
      </h3>

      <button class="col secondary" @click="cancelWhitelistDapp">
        Don't allow
      </button>
      <button class="col cta" @click="whitelistDappAddNewContract">
        Allow
      </button>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'

import {
  whitelistDappAddNewContract as whitelistDappAddNewContractFunc,
  cancelWhitelistDapp as cancelWhitelistDappFunc,
} from '@/actions/whitelist'
import { exitDialog } from '@/actions/wallet'

import {
  getTargetOrigin,
  loadedInIframe,
  shrinkFrameInParentWindow,
} from '@/parentFrameMessenger/parentFrameMessenger'

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
    contractAddress: function() {
      return this.$store.state.tx.object.to
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
    whitelistDappAddNewContract: function() {
      whitelistDappAddNewContractFunc()

      if (loadedInIframe()) {
        if (!this.isDrawerActiveByUser) {
          this.$store.commit(MutationTypes.DEACTIVATE_DRAWER)
          shrinkFrameInParentWindow()
        }
      }

      exitDialog()
      const redirectFrom = this.$route.query.redirectFrom || RouteNames.HOME
      this.$router.push({ name: redirectFrom }, () => {})
    },
    cancelWhitelistDapp: () => cancelWhitelistDappFunc(),
  },
}
</script>

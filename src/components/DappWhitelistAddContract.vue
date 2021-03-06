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
        <strong class="address">{{ contractAddress }}</strong>
        <strong v-if="contractAddressEns"> ({{ contractAddressEns }})</strong>
        for this dApp.
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

import { checkIfEnoughBalance } from '@/actions/transactions'
import {
  whitelistDappAddNewContract as whitelistDappAddNewContractFunc,
  cancelWhitelistDapp as cancelWhitelistDappFunc,
} from '@/actions/whitelist'
import { exitDialog } from '@/actions/wallet'

import { SpinnerState } from '@/constants'

import { getTargetOrigin } from '@/parentFrameMessenger/parentFrameMessenger'

import { RouteNames } from '@/router'

import MutationTypes from '@/store/mutation-types'
import { getEnsNameForAddress } from '../actions/ens'

export default {
  data() {
    return {
      contractAddressEns: null,
    }
  },
  computed: {
    ...mapState({
      isDrawerActiveByUser: state => state.ui.isDrawerActiveByUser,
      dialogComponent: state => state.ui.dialog.component,
    }),
    getDappOrigin: function() {
      return getTargetOrigin()
    },
    contractAddress: function() {
      return this.$store.getters.txObject.to
    },
  },
  watch: {
    contractAddress: async function(val) {
      const ens = await getEnsNameForAddress(val)
      this.contractAddressEns = ens
    },
  },
  mounted() {
    this.$store.commit(MutationTypes.SHOW_DIALOG, {
      title: 'Important',
    })
    this.$store.commit(MutationTypes.SET_OVERLAY_COLOR, 'black')
  },
  beforeDestroy() {
    if (this.dialogComponent === '') {
      this.$store.commit(MutationTypes.CLEAR_DIALOG)
    }
    this.$store.commit(MutationTypes.UNSET_OVERLAY_COLOR)
  },
  methods: {
    redirectBack: function() {
      const redirectFrom = this.$route.query.redirectFrom || RouteNames.HOME
      this.$router.push({ name: redirectFrom }, () => {})
    },
    whitelistDappAddNewContract: function() {
      whitelistDappAddNewContractFunc()

      this.redirectBack()
      exitDialog()

      if (checkIfEnoughBalance()) {
        if (!this.isDrawerActiveByUser) {
          this.$store.commit(MutationTypes.DEACTIVATE_DRAWER)
        }

        this.$store.commit(
          MutationTypes.SET_SPINNER_STATE,
          SpinnerState.TRANSACTION_WHITELISTED_TIMER
        )
      }
    },
    cancelWhitelistDapp: function() {
      this.redirectBack()
      cancelWhitelistDappFunc()
    },
  },
}
</script>

<style scoped lang="scss">
strong.address {
  word-break: break-word;
}
</style>

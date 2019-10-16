<template>
  <div>
    <div
      id="ebk-wallet"
      :class="{
        opened: isDrawerActive,
        whitelisted: showWhitelistingTimer,
      }"
    >
      <Status ref="status" />
      <div v-show="isDrawerActive" class="main">
        <component :is="dialog.component" v-if="isDialog && dialog.component" />
        <router-view v-else />
      </div>
    </div>

    <div
      class="overlay"
      :class="{
        black: overlayColor == 'black',
        red: overlayColor == 'red',
      }"
    />
  </div>
</template>

<script>
import debounce from 'lodash/debounce'
import { mapState } from 'vuex'

import { getBalance } from '@/actions/wallet'
import { web3 } from '@/actions/web3ebakus'
import { isContractCall, isContractCallWhitelisted } from '@/actions/whitelist'

import { SpinnerState } from '@/constants'

import {
  loadedInIframe,
  expandOverlayFrameInParentWindow,
  shrinkOverlayFrameInParentWindow,
} from '@/parentFrameMessenger/parentFrameMessenger'

import { RouteNames } from '@/router'

import MutationTypes from '@/store/mutation-types'

import SendTx from '@/components/dialogs/SendTx.vue'
import Status from '@/views/Status'

export default {
  components: {
    Status,
    DeleteWallet: () =>
      import(
        /* webpackChunkName: "delete-wallet" */ '@/components/dialogs/DeleteWallet.vue'
      ),
    NoFunds: () =>
      import(
        /* webpackChunkName: "no-funds" */ '@/components/dialogs/NoFunds.vue'
      ),
    SendTx,
  },
  data() {
    return {
      isWalletActive: false,
      resizeFrameTimer: null,
    }
  },
  computed: {
    ...mapState({
      isDrawerActive: state => state.ui.isDrawerActive,
      isSpinnerActive: state => state.ui.isSpinnerActive,
      spinnerState: state => state.ui.currentSpinnerState,
      isLocked: state => state.wallet.locked,
      publicAddress: state => state.wallet.address,
      balance: state => state.wallet.balance,
      overlayColor: state => state.ui.overlayColor,
      isDialog: state => state.ui.dialog.active,
      dialog: state => state.ui.dialog,
    }),
    SpinnerState: () => SpinnerState,
    showWhitelistingTimer: function() {
      return (
        isContractCall() &&
        isContractCallWhitelisted() &&
        this.$route.name !== RouteNames.UNLOCK
      )
    },
  },
  watch: {
    // spinnerState: function(val, oldVal) {
    //   if (val !== oldVal) {
    //     // check if state needs update in order to present the balance
    //     if (
    //       [
    //         SpinnerState.TRANSACTION_SENT_SUCCESS,
    //         SpinnerState.NODE_CONNECTED,
    //       ].includes(val)
    //     ) {
    //       clearTimeout(this.resizeFrameTimer)
    //       this.resizeFrameTimer = setTimeout(() => {
    //         store.commit(MutationTypes.SET_SPINNER_STATE, SpinnerState.SUCCESS)
    //       }, 1000)
    //     }

    //     if (
    //       !this.isDrawerActive &&
    //       loadedInIframe() &&
    //       [SpinnerState.CANCEL, SpinnerState.SUCCESS].includes(val)
    //     ) {
    //       clearTimeout(this.resizeFrameTimer)
    //       this.resizeFrameTimer = setTimeout(() => {
    //         resizeFrameWidthInParentWindow(this.$refs.statusBar.clientWidth + 2)
    //       }, 1000)
    //     }

    //     if (
    //       !this.isDrawerActive &&
    //       loadedInIframe() &&
    //       [SpinnerState.TRANSACTION_WHITELISTED_TIMER].includes(val)
    //     ) {
    //       resizeFrameWidthInParentWindow(400, 120)

    //       clearTimeout(this.resizeFrameTimer)
    //       this.resizeFrameTimer = setTimeout(() => {
    //         resizeFrameWidthInParentWindow(
    //           this.$refs.statusBar.clientWidth + 2,
    //           this.$refs.statusBar.clientHeight + 2
    //         )
    //       }, 600)
    //     }
    //   }
    // },
    isDrawerActive: function(val, oldVal) {
      if (val !== oldVal) {
        if (val) {
          if (this.isDrawerActive && this.$route.name != RouteNames.NEW) {
            this.loadWalletState()
          }
          // } else {
          //   resizeFrameWidthInParentWindow(400, 120)
          //   clearTimeout(this.resizeFrameTimer)
          //   this.resizeFrameTimer = setTimeout(() => {
          //     resizeFrameWidthInParentWindow(
          //       this.$refs.statusBar.clientWidth + 2,
          //       this.$refs.statusBar.clientHeight + 2
          //     )
          //   }, 600)
        }
      }
    },
    overlayColor: function(val, oldVal) {
      if (loadedInIframe()) {
        if (val !== oldVal) {
          if (val) {
            expandOverlayFrameInParentWindow()
          } else {
            shrinkOverlayFrameInParentWindow()
          }
        }
      }
    },
  },

  created() {
    setInterval(() => {
      getBalance().catch(() => {}) // just for catching exceptions
    }, 1000)

    this.getViewportInnerHeight()

    window.addEventListener(
      'resize',
      debounce(this.getViewportInnerHeight, 150)
    )
  },
  mounted() {
    this.checkNodeConnectivity()
    this.loadWalletState()
  },
  methods: {
    checkNodeConnectivity: function() {
      const self = this

      this.$store.commit(
        MutationTypes.SET_SPINNER_STATE,
        SpinnerState.NODE_CONNECT
      )

      web3.eth.net
        .getId()
        .then(() => {
          self.$store.dispatch(
            MutationTypes.SET_SPINNER_STATE,
            SpinnerState.NODE_CONNECTED
          )
        })
        .catch(err => {
          self.$store.dispatch(
            MutationTypes.SET_SPINNER_STATE,
            SpinnerState.NODE_DISCONNECTED
          )

          console.error('Failed to connect to network', err)
        })
    },
    loadWalletState: function() {
      if (this.publicAddress !== null && !this.isLocked) {
        console.log('Wallet Loaded')
        // console.log('Wallet Locked')
      } else if (this.publicAddress !== null && this.isLocked) {
        this.$router.push({ name: RouteNames.UNLOCK }, () => {})
      } else if (this.$route.name !== RouteNames.NEW) {
        this.$router.push({ name: RouteNames.NEW }, () => {})
      }
    },
    getViewportInnerHeight: function() {
      // handle "iOS viewport scroll bug", https://css-tricks.com/the-trick-to-viewport-units-on-mobile/
      // set the value in the --vh custom property to the root of the document
      const vh = window.innerHeight * 0.01
      document.documentElement.style.setProperty('--vh', `${vh}px`)
    },
  },
}
</script>

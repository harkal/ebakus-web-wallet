<template>
  <div>
    <div
      id="wallet"
      ref="wallet"
      :class="{
        opened: isDrawerActive,
        whitelisted: showWhitelistingTimer,
        'has-dialog': isDialog,
      }"
    >
      <Status ref="status" @showWallet="showWallet" @hideWallet="hideWallet" />

      <div v-show="isDrawerActive" class="main">
        <transition-group
          name="fade-transition"
          enter-active-class="main-fade-transition-enter-active"
          leave-active-class="main-fade-transition-leave-active"
          :duration="{
            enter: styles.animationFadeEnter,
            leave: isDrawerActive ? styles.animationFadeLeave : 0,
          }"
          appear
        >
          <component
            :is="dialog.component"
            v-if="isDialog && dialog.component"
            :key="dialog.component"
          />
          <router-view v-else key="router" class="dialog" />
        </transition-group>
      </div>
    </div>

    <transition
      name="overlay-transition"
      :duration="styles.animationOverlay"
      appear
    >
      <div
        v-if="overlayColor !== ''"
        class="overlay"
        :class="{
          black: overlayColor == 'black',
          red: overlayColor == 'red',
        }"
      />
    </transition>
  </div>
</template>

<script>
import debounce from 'lodash/debounce'
import { mapState } from 'vuex'

import { checkNodeConnection } from '@/actions/providers'
import { getBalance } from '@/actions/wallet'
import { isContractCall, isContractCallWhitelisted } from '@/actions/whitelist'

import { SpinnerState, DialogComponents } from '@/constants'

import {
  loadedInIframe,
  expandOverlayFrameInParentWindow,
  shrinkOverlayFrameInParentWindow,
} from '@/parentFrameMessenger/parentFrameMessenger'

import { RouteNames } from '@/router'

import MutationTypes from '@/store/mutation-types'

import SendTx from '@/components/dialogs/SendTx.vue'
import Status from '@/views/Status'

import styleVariables from '@/assets/css/_variables.scss'
import styleAnimationVariables from '@/assets/css/_animations.scss'

export default {
  components: {
    Status,
    DeleteWallet: () =>
      import(
        /* webpackChunkName: "delete-wallet" */ './components/dialogs/DeleteWallet'
      ),
    NoFunds: () =>
      import(/* webpackChunkName: "no-funds" */ './components/dialogs/NoFunds'),
    SendTx,
  },
  data() {
    return {
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
    styles: () => styleAnimationVariables,
    showWhitelistingTimer: function() {
      return (
        isContractCall() &&
        isContractCallWhitelisted() &&
        this.$route.name !== RouteNames.UNLOCK &&
        this.dialog.component !== DialogComponents.NO_FUNDS
      )
    },
  },
  watch: {
    isDrawerActive: function(val, oldVal) {
      if (val !== oldVal) {
        if (val) {
          if (this.isDrawerActive && this.$route.name != RouteNames.NEW) {
            this.loadWalletState()
          }
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
    this.getViewportInnerHeight()

    window.addEventListener(
      'resize',
      debounce(this.getViewportInnerHeight, 150)
    )
  },
  mounted() {
    this.$store.commit(
      MutationTypes.SET_SPINNER_STATE,
      SpinnerState.NODE_CONNECT
    )

    checkNodeConnection(true)

    setInterval(() => {
      getBalance().catch(() => {}) // just for catching exceptions
    }, 1000)

    this.loadWalletState()
  },
  methods: {
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
    showWallet: function() {
      const width = getComputedStyle(this.$refs.wallet).width

      this.$refs.wallet.style.transition = `width ${styleAnimationVariables.animationWallet}ms linear`
      this.$refs.wallet.style.width = width

      this.$refs.wallet.style.minWidth = null
      this.$refs.wallet.style.height = '100vh'

      // Force repaint to make sure the
      // animation is triggered correctly.
      getComputedStyle(this.$refs.wallet).width

      requestAnimationFrame(() => {
        this.$refs.wallet.style.width = styleVariables.walletOpenedWidth
      })
    },
    hideWallet: function() {
      this.$refs.wallet.style.transition = `min-width ${styleAnimationVariables.animationWallet}ms linear, height ${styleAnimationVariables.animationWallet}ms linear`
      this.$refs.wallet.style.minWidth = styleVariables.walletOpenedWidth
      this.$refs.wallet.style.width = styleVariables.walletOpenedWidth
      const height = getComputedStyle(this.$refs.wallet).height
      this.$refs.wallet.style.height = height
      // Force repaint to make sure the
      // animation is triggered correctly.
      getComputedStyle(this.$refs.wallet).height
      requestAnimationFrame(() => {
        this.$refs.wallet.style.width = 'auto'
        this.$refs.wallet.style.minWidth = '60px'
        this.$refs.wallet.style.height = styleVariables.walletClosedHeight
      })
    },
  },
}
</script>

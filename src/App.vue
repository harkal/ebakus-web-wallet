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

      <transition name="fade-transition" appear>
        <div v-show="isDrawerActive" ref="main" class="main">
          <component
            :is="dialog.component"
            v-if="isDialog && dialog.component"
            :key="dialog.component"
          />
          <router-view v-else key="router" />
        </div>
      </transition>
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

import { nextAnimationFrame } from '@/utils'

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
      widthWhileAnimating: null,
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
      networkStatus: state => state.network.status,
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
    balance: function(val, oldVal) {
      if (oldVal !== '0') {
        nextAnimationFrame(this.hideWalletAnimation)
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

    nextAnimationFrame(this.hideWalletAnimation)

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
      nextAnimationFrame(this.showWalletAnimation)
    },
    hideWallet: function() {
      nextAnimationFrame(this.hideWalletAnimation)
    },
    showWalletAnimation: function() {
      const wallet = this.$refs.wallet
      const status = this.$refs.status.$el
      const identiconWidget = this.$refs.status.$refs.identicon.$el

      status.style.width = 0
      status.style.height = 'auto'
      const finalStatusHeight = getComputedStyle(status).height
      status.style.height = styleVariables.walletClosedHeight

      identiconWidget.style.right = getComputedStyle(identiconWidget).right

      getComputedStyle(status).height
      nextAnimationFrame(() => {
        wallet.style.height = '100vh'

        status.style.width = styleVariables.walletOpenedWidth
        status.style.height = `calc(${finalStatusHeight} + ${styleVariables.walletOpenedMinHeight})`

        identiconWidget.style.right = '126.5px'
      })
    },
    hideWalletAnimation: function() {
      const wallet = this.$refs.wallet
      const status = this.$refs.status.$el
      const identiconWidget = this.$refs.status.$refs.identicon.$el
      const main = this.$refs.main

      wallet.style.height = styleVariables.walletClosedHeight

      const mainDisplay = main.style.display
      main.style.display = 'none'

      status.style.width = 'auto'
      const finalWidth = getComputedStyle(status).width
      status.style.width = styleVariables.walletOpenedWidth

      main.style.display = mainDisplay

      // Force repaint to make sure the
      // animation is triggered correctly.
      getComputedStyle(status).width

      nextAnimationFrame(() => {
        status.style.width = finalWidth
        status.style.height = styleVariables.walletClosedHeight

        identiconWidget.style.right = `calc(${finalWidth} - 33px)` // includes widget size + padding
      })
    },
  },
}
</script>

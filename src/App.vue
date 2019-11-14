<template>
  <div>
    <div
      id="wallet"
      ref="wallet"
      :class="{
        opened: isDrawerActive,
        whitelisted: showWhitelistingTimer,
      }"
    >
      <Status
        ref="status"
        @showWallet="enableUserTriggeredAnimation"
        @hideWallet="enableUserTriggeredAnimation"
      />

      <transition name="fade-drawer-appear-transition">
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

    <transition name="overlay-transition" appear>
      <div
        v-if="overlayColor && overlayColor !== ''"
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
  shrinkFrameInParentWindow,
  expandFrameInParentWindow,
  resizeFrameWidthInParentWindow,
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
      isInitialRender: true,
      userTriggeredAnimatingWallet: false,
      isAnimating: false,
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

          if (loadedInIframe()) {
            expandFrameInParentWindow()
          }
        }
        const isClosingWallet = !val
        this.restyleWallet(isClosingWallet)
      }
    },
    spinnerState: async function(val, oldVal) {
      if (val !== oldVal && !this.isDrawerActive && loadedInIframe()) {
        this.restyleWallet()
      }
    },
    overlayColor: function(val, oldVal) {
      if (loadedInIframe()) {
        if (val !== oldVal) {
          if (val) {
            expandOverlayFrameInParentWindow()
          } else {
            setTimeout(function() {
              shrinkOverlayFrameInParentWindow()
            }, styleAnimationVariables.animationOverlay)
          }
        }
      }
    },
    balance: function(val, oldVal) {
      if (!this.isDrawerActive && (val !== oldVal || oldVal !== '0')) {
        nextAnimationFrame(this.hideWalletAnimation())
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

    nextAnimationFrame(this.hideWalletAnimation())

    checkNodeConnection(true)

    setInterval(() => {
      getBalance().catch(() => {}) // just for catching exceptions
    }, 1000)

    this.loadWalletState()

    this.$root.$on('restyleWallet', this.restyleWallet)
  },
  methods: {
    restyleWallet: async function(closeWallet) {
      if (this.isDrawerActive) {
        nextAnimationFrame(this.showWalletAnimation)
      } else {
        nextAnimationFrame(this.hideWalletAnimation(closeWallet))
      }
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
    enableUserTriggeredAnimation: function() {
      this.userTriggeredAnimatingWallet = true
    },
    showWalletAnimation: function() {
      const self = this
      if (this.isAnimating) {
        return
      }
      this.isAnimating = true

      const wallet = this.$refs.wallet
      const status = this.$refs.status.$el

      let identiconWidget
      if (
        this.$refs.status.$refs.identicon &&
        // check if element is visible
        this.$refs.status.$refs.identicon.$el.offsetParent !== null
      ) {
        identiconWidget = this.$refs.status.$refs.identicon.$el
      }

      status.style.width = 0
      if (identiconWidget) {
        identiconWidget.style.right = getComputedStyle(identiconWidget).right
      }

      wallet.style.width = getComputedStyle(status).width
      wallet.style.height = getComputedStyle(wallet).height
      nextAnimationFrame(() => {
        wallet.style.width = styleVariables.walletOpenedWidth
        wallet.style.height = '105vh'
        status.style.width = styleVariables.walletOpenedWidth

        if (identiconWidget) {
          identiconWidget.style.left = 'auto'
          identiconWidget.style.right = '126.5px'
        }

        self.isAnimating = false
      })
    },
    hideWalletAnimation: function(closeWallet) {
      const self = this
      return () => {
        if (this.isAnimating) {
          return
        }
        this.isAnimating = true

        let status, finalStatusWidth, finalStatusHeight, identiconWidget
        const wallet = this.$refs.wallet
        const main = this.$refs.main

        if (this.$refs.status) {
          status = this.$refs.status.$el
        }
        if (
          this.$refs.status.$refs.identicon &&
          // check if element is visible
          this.$refs.status.$refs.identicon.$el.offsetParent !== null
        ) {
          identiconWidget = this.$refs.status.$refs.identicon.$el
        }

        wallet.style.width = null
        wallet.style.height = '105vh'

        const mainDisplay = main.style.display
        main.style.display = 'none'

        if (status) {
          status.style.height = null // clears height from whitelisting status bar

          const previousStatusWidth = getComputedStyle(status).width
          status.style.width = 'auto'
          finalStatusWidth = getComputedStyle(status).width
          finalStatusHeight = getComputedStyle(status).height

          if (!this.isInitialRender && this.userTriggeredAnimatingWallet) {
            status.style.width = styleVariables.walletOpenedWidth
          } else {
            status.style.width = previousStatusWidth
          }

          this.isInitialRender = false
          this.userTriggeredAnimatingWallet = false
        }

        if (identiconWidget) {
          identiconWidget.style.left = 'auto'
        }

        main.style.display = mainDisplay

        nextAnimationFrame(() => {
          if (status) {
            wallet.style.height = finalStatusHeight
            status.style.width = finalStatusWidth
          }

          if (identiconWidget && finalStatusWidth) {
            identiconWidget.style.right = `${parseInt(finalStatusWidth, 10) -
              33}px` // includes widget size + padding
          }

          self.isAnimating = false

          if (closeWallet) {
            setTimeout(() => {
              if (status && loadedInIframe()) {
                resizeFrameWidthInParentWindow(
                  finalStatusWidth,
                  finalStatusHeight
                )
                shrinkFrameInParentWindow()
              }
            }, styleAnimationVariables.animationWallet)
          }
        })
      }
    },
  },
}
</script>

<style scoped lang="scss">
@import 'assets/css/_variables';
@import 'assets/css/_animations';
@import 'assets/css/_z-index.scss';

#wallet {
  @include z-index(wallet);
  @include accelerate(height, box-shadow);

  position: fixed;
  right: 0;

  width: auto;
  height: auto;

  // close animation
  transition: width animation-duration(status, base) ease-out
      animation-duration(fade, leave),
    height animation-duration(wallet) cubic-bezier(0.25, 0.46, 0.45, 0.94)
      animation-duration(fade, leave),
    box-shadow animation-duration(overlay, leave) ease-out
      animation-duration(fade, leave);

  > div {
    margin: 0;
  }

  &:not(.opened) {
    max-width: $wallet-opened-width;
    border-bottom-left-radius: 5px;

    &:not(.whitelisted) {
      cursor: pointer;
    }
  }

  &.whitelisted {
    max-width: 400px;
  }

  &.opened {
    height: 105vh;
    padding-bottom: 5vh;

    // open animation
    transition: width animation-duration(status, base) ease-out 0s,
      height animation-duration(wallet) cubic-bezier(0.25, 0.46, 0.45, 0.94) 0s,
      box-shadow animation-duration(overlay, enter) ease-out
        animation-duration(status, base);

    background: #fff;

    box-shadow: -2px -20px 14px 0 rgba(0, 0, 0, 0.15);
  }
}

.main {
  @include z-index(main);
  position: relative;
  background-color: #fff;
}

.overlay {
  &.red,
  &.black {
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    opacity: 0.8;
    @include z-index(overlay);
  }
  &.red {
    background: #fd315f;
  }
  &.black {
    background: #000;
  }
}

.overlay-transition-enter-active,
.overlay-transition-leave-active {
  transition: opacity animation-duration(overlay, enter) ease-in
    animation-duration(wallet);
}

.overlay-transition-leave-active {
  transition-timing-function: ease-out;
  transition-duration: 0;
}

.overlay-transition-enter,
.overlay-transition-leave-to {
  opacity: 0 !important;
}
</style>

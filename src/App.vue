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
        :show-whitelisting-timer="showWhitelistingTimer"
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
import {
  isContractCall,
  isContractCallWhitelisted,
  getWhitelistDappTimer,
} from '@/actions/whitelist'

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

import { nextAnimationFrame, animationQueue } from '@/utils'

import styleVariables from '@/assets/css/_variables.scss'
import styleAnimationVariables from '@/assets/css/_animations.scss'

function timeout(ms) {
  return new Promise(resolve => setTimeout(resolve, ms))
}

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
      parentOverlayShrinkTimeout: null,
      successTimeout: null,
      closeWalletAfterAnimation: false,
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
      isTxFromParentFrame: state => !!state.tx.jobId,
      isTxWhitelistAnimationReady: state => state.tx.whitelistAnimationReady,
    }),
    SpinnerState: () => SpinnerState,
    styles: () => styleAnimationVariables,
    showWhitelistingTimer: function() {
      return (
        this.isTxFromParentFrame &&
        this.isTxWhitelistAnimationReady &&
        // this.spinnerState === SpinnerState.TRANSACTION_WHITELISTED_TIMER &&
        isContractCall() &&
        isContractCallWhitelisted() &&
        getWhitelistDappTimer() > 0 &&
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

        // set the wallet to shrink parent frame after animations ends
        if (!this.closeWalletAfterAnimation && /* wasOpened */ !val) {
          this.closeWalletAfterAnimation = true
        }

        // skip UI update from this watcher as it is handled in spinnerState watcher
        if (
          !val &&
          this.spinnerState === SpinnerState.TRANSACTION_WHITELISTED_TIMER
        ) {
          return
        }
        this.restyleWallet()
      }
    },
    spinnerState: async function(val, oldVal) {
      const self = this
      if (val !== oldVal) {
        if (
          [
            SpinnerState.TRANSACTION_SENT_SUCCESS,
            SpinnerState.NODE_CONNECTED,
          ].includes(val)
        ) {
          if (self.successTimeout) {
            clearTimeout(self.successTimeout)
          }
          self.successTimeout = setTimeout(() => {
            self.$store.dispatch(
              MutationTypes.SET_SPINNER_STATE,
              SpinnerState.SUCCESS
            )
            self.successTimeout = null
          }, 800)
        }

        if (
          !self.isDrawerActive &&
          !(val & SpinnerState.SKIP_WALLET_ANIMATIONS) &&
          loadedInIframe()
        ) {
          self.restyleWallet()
        }
      }
    },
    overlayColor: function(val, oldVal) {
      const self = this
      if (loadedInIframe() && val !== oldVal) {
        if (val) {
          if (self.parentOverlayShrinkTimeout) {
            clearTimeout(self.parentOverlayShrinkTimeout)
            self.parentOverlayShrinkTimeout = null
          }
          expandOverlayFrameInParentWindow()
        } else {
          nextAnimationFrame(
            () =>
              (self.parentOverlayShrinkTimeout = setTimeout(function() {
                shrinkOverlayFrameInParentWindow()
              }, styleAnimationVariables.animationOverlayLeave))
          )
        }
      }
    },
    balance: function(val, oldVal) {
      const self = this
      if (!self.isDrawerActive && (val !== oldVal || oldVal !== '0')) {
        setTimeout(() => {
          animationQueue.add(() => nextAnimationFrame(self.hideWalletAnimation))
        }, styleAnimationVariables.animationFadeEnter)
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
    const self = this
    this.$store.commit(
      MutationTypes.SET_SPINNER_STATE,
      SpinnerState.NODE_CONNECT
    )

    animationQueue.add(() => nextAnimationFrame(self.hideWalletAnimation))

    checkNodeConnection(true)

    setInterval(() => {
      getBalance().catch(() => {}) // just for catching exceptions
    }, 1000)

    this.loadWalletState()
  },
  methods: {
    restyleWallet: function() {
      const self = this
      if (this.isDrawerActive) {
        animationQueue.add(() => nextAnimationFrame(self.showWalletAnimation))
      } else {
        animationQueue.add(() => nextAnimationFrame(self.hideWalletAnimation))
      }
    },
    loadWalletState: function() {
      if (this.publicAddress !== null && !this.isLocked) {
        console.log('Wallet is loaded')
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

      if (loadedInIframe()) {
        expandFrameInParentWindow()
      }

      const wallet = this.$refs.wallet
      const status = this.$refs.status.$el
      const main = self.$refs.main

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

      main.style.display = null

      nextAnimationFrame(() => {
        wallet.style.width = styleVariables.walletOpenedWidth
        wallet.style.height = '105vh'
        status.style.width = styleVariables.walletOpenedWidth

        if (identiconWidget) {
          identiconWidget.style.left = 'auto'
          identiconWidget.style.right = '126.5px'
        }

        setTimeout(() => {
          animationQueue.next()
        }, styleAnimationVariables.animationWallet)
      })
    },
    hideWalletAnimation: async function() {
      const self = this
      const closeWalletAfterAnimation = self.closeWalletAfterAnimation

      if (self.isDrawerActive && !closeWalletAfterAnimation) {
        animationQueue.next()
        return
      }

      let waitForParentUpdate = false
      if (
        self.spinnerState == SpinnerState.TRANSACTION_WHITELISTED_TIMER &&
        window.outerWidth >= 400
      ) {
        await resizeFrameWidthInParentWindow(400, 120)
        waitForParentUpdate = true
      }

      let status,
        finalStatusWidth,
        finalStatusHeight,
        identiconWidget,
        whitelistStatusBar
      const wallet = self.$refs.wallet
      const main = self.$refs.main

      if (!closeWalletAfterAnimation) {
        wallet.className += ' animating-closed-state'
        wallet.offsetHeight // force repaint
      }

      if (self.$refs.status) {
        status = self.$refs.status.$el

        if (
          self.$refs.status.$refs.identicon &&
          // check if element is visible
          self.$refs.status.$refs.identicon.$el.offsetParent !== null
        ) {
          identiconWidget = self.$refs.status.$refs.identicon.$el
        }

        if (self.$refs.status.$refs.whitelist) {
          whitelistStatusBar = self.$refs.status.$refs.whitelist.$el
        }
      }

      wallet.style.width = null
      wallet.style.height = '105vh'
      const mainDisplay = main.style.display
      main.style.display = 'none'

      if (status) {
        status.style.height = null // clears height from whitelisting status bar

        const previousStatusWidth = getComputedStyle(status).width
        const previousStatusHeight = getComputedStyle(status).height
        status.style.width = 'auto'

        if (closeWalletAfterAnimation) {
          status.style.height = 'auto'
        }

        // fixes safari issues with animation, try to remove it
        if (waitForParentUpdate) {
          status.style.minWidth = previousStatusWidth
          // TODO: check what happens and this timeout is needed while wallet closed and whitelisted status bar animates
          await timeout(200)
          status.style.minWidth = null
        }

        if (whitelistStatusBar) {
          whitelistStatusBar.style.display = 'flex'
        }

        finalStatusWidth = getComputedStyle(status).width
        finalStatusHeight = getComputedStyle(status).height

        //  there is no reason for status bar to be totally hidden
        if (parseInt(finalStatusWidth, 10) <= 0) {
          finalStatusWidth = previousStatusWidth
        }

        // check that element size is smaller than parent window size
        finalStatusWidth =
          parseInt(finalStatusWidth, 10) > window.outerWidth
            ? window.outerWidth + 'px'
            : finalStatusWidth

        // check that when on small screens and whitelistStatusBar shown it's full width
        if (
          whitelistStatusBar &&
          window.outerWidth <=
            parseInt(styleVariables.statusBarWhitelistMobileBreakpoint, 10)
        ) {
          finalStatusWidth = window.outerWidth + 'px'
        }
        if (!self.isInitialRender && self.userTriggeredAnimatingWallet) {
          status.style.width = styleVariables.walletOpenedWidth
        } else {
          status.style.width = previousStatusWidth
        }

        self.isInitialRender = false
        self.userTriggeredAnimatingWallet = false

        if (closeWalletAfterAnimation) {
          status.style.height = previousStatusHeight
        }
      }

      if (identiconWidget) {
        identiconWidget.style.left = 'auto'
      }

      if (!closeWalletAfterAnimation) {
        main.style.display = mainDisplay
      }

      nextAnimationFrame(async () => {
        if (status) {
          if (whitelistStatusBar) {
            whitelistStatusBar.style.opacity = 1
          }

          wallet.style.height = finalStatusHeight
          status.style.width = finalStatusWidth

          if (closeWalletAfterAnimation) {
            status.style.height = null
          }

          if (identiconWidget && finalStatusWidth) {
            identiconWidget.style.right = `${parseInt(finalStatusWidth, 10) -
              33}px` // includes widget size + padding
          }

          if (loadedInIframe()) {
            await resizeFrameWidthInParentWindow(
              finalStatusWidth,
              finalStatusHeight
            )
          }
        }

        // wait for animations to finish
        await timeout(styleAnimationVariables.animationWallet)

        if (closeWalletAfterAnimation) {
          self.closeWalletAfterAnimation = false
          if (loadedInIframe()) {
            shrinkFrameInParentWindow()
          }
        }

        wallet.className = wallet.className.replace(
          /\s?\banimating-closed-state\b/g,
          ''
        )

        animationQueue.next()
      })
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
  @include accelerate(width, height, box-shadow);

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
    // width: $wallet-opened-width; // handle in JS animation
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

  &.animating-closed-state {
    transition: width animation-duration(status, base) / 3 ease-out 0s,
      height animation-duration(wallet) / 3 cubic-bezier(0.25, 0.46, 0.45, 0.94)
        0s,
      box-shadow animation-duration(overlay, leave) / 3 ease-out 0s;

    * {
      transition-delay: 0s !important;
    }
  }
}

.main {
  @include z-index(main);
  position: relative;
  background-color: #fff;
  width: $wallet-opened-width;
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
    opacity: 0.8 !important;
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
  transition: opacity animation-duration(overlay, leave) ease-in 0s;
}

.overlay-transition-enter,
.overlay-transition-leave-to {
  opacity: 0 !important;
}
</style>

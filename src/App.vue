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
        :is-initial-render="isInitialRender"
        @hideWallet="enableUserTriggeredAnimation"
      />

      <transition appear name="fade-drawer-appear-transition">
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
        v-if="isLoadedFromDapp && overlayColor && overlayColor !== ''"
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
import Web3 from 'web3'
import debounce from 'lodash/debounce'
import { mapState } from 'vuex'

import Transaction from '@/actions/Transaction'
import { checkNodeConnection } from '@/actions/providers'
import { setLedgerSupportedTypes } from '@/actions/providers/ledger'
import { hasWallet, getBalance } from '@/actions/wallet'
import {
  isContractCall,
  isContractCallWhitelisted,
  getWhitelistDappTimer,
} from '@/actions/whitelist'
import { getStaked, getUnstakingAmount } from '@/actions/systemContract'
import { init as initWeb3, web3 } from '@/actions/web3ebakus'

import { SpinnerState, DialogComponents } from '@/constants'

import {
  loadedInIframe,
  shrinkFrameInParentWindow,
  expandFrameInParentWindow,
  resizeFrameWidthInParentWindow,
  expandOverlayFrameInParentWindow,
  shrinkOverlayFrameInParentWindow,
  frameEventAccountAddressChanged,
} from '@/parentFrameMessenger/parentFrameMessenger'

import { RouteNames } from '@/router'

import MutationTypes from '@/store/mutation-types'

import SendTx from '@/components/dialogs/SendTx.vue'
import Status from '@/views/Status'

import { isSafari, nextAnimationFrame, animationQueue } from '@/utils'

import styleVariables from '@/assets/css/_variables.scss'
import styleAnimationVariables from '@/assets/css/_animations.scss'

const timeout = ms => new Promise(resolve => setTimeout(resolve, ms))

export default {
  components: {
    Status,
    SendTx,
    FailedTx: () =>
      import(
        /* webpackChunkName: "failed-tx" */ './components/dialogs/FailedTx'
      ),
    RetryTx: () =>
      import(/* webpackChunkName: "retry-tx" */ './components/dialogs/RetryTx'),
    DeleteWallet: () =>
      import(
        /* webpackChunkName: "delete-wallet" */ './components/dialogs/DeleteWallet'
      ),
    NoFunds: () =>
      import(/* webpackChunkName: "no-funds" */ './components/dialogs/NoFunds'),
    Ledger: () =>
      import(/* webpackChunkName: "ledger" */ './components/dialogs/Ledger'),
    Trezor: () =>
      import(/* webpackChunkName: "trezor" */ './components/dialogs/Trezor'),
  },
  data() {
    return {
      isInitialRender: true,
      userTriggeredAnimatingWallet: false,
      parentOverlayShrinkTimeout: null,
      successTimeout: null,
      cancelTimeout: null,
      closeWalletAfterAnimation: false,
      fetchBalanceInterval: null,
    }
  },
  computed: {
    ...mapState({
      isDrawerActive: state => state.ui.isDrawerActive,
      isSpinnerActive: state => state.ui.isSpinnerActive,
      spinnerState: state => state.ui.currentSpinnerState,
      publicAddress: state => state.wallet.address,
      balance: state => state.wallet.balance,
      overlayColor: state => state.ui.overlayColor,
      isDialog: state => state.ui.dialog.active,
      dialog: state => state.ui.dialog,
      networkStatus: state => state.network.status,
      isTxFromParentFrame: state => {
        return state.tx instanceof Transaction ? state.tx._updateParent : false
      },
      isTxWhitelistAnimationReady: state => {
        return state.tx instanceof Transaction
          ? state.tx.allowWhitelistAnimations
          : false
      },
    }),
    isLocked: function() {
      return this.$store.getters.wallet.locked
    },
    isUsingHardwareWallet: function() {
      return this.$store.getters.wallet.isUsingHardwareWallet
    },
    isRegistration: function() {
      return !this.isUsingHardwareWallet && !hasWallet()
    },
    isLoadedFromDapp: () => loadedInIframe(),
    SpinnerState: () => SpinnerState,
    styles: () => styleAnimationVariables,
    showWhitelistingTimer: function() {
      return (
        this.isTxFromParentFrame &&
        this.isTxWhitelistAnimationReady &&
        ![
          SpinnerState.CALC_POW,
          SpinnerState.TRANSACTION_SENDING,
          SpinnerState.LEDGER_CONFIRM,
          SpinnerState.TREZOR_CONFIRM,
        ].includes(this.spinnerState) &&
        isContractCall() &&
        isContractCallWhitelisted() &&
        getWhitelistDappTimer() > 0 &&
        this.$route.name !== RouteNames.UNLOCK &&
        this.dialog.component !== DialogComponents.NO_FUNDS
      )
    },
  },
  watch: {
    publicAddress: function(val, oldVal) {
      if (val !== oldVal) {
        const isAddress = Web3.utils.isAddress(val)
        if (isAddress && !this.isLocked) {
          this.startBalanceUpdater()
        }

        if (loadedInIframe()) {
          frameEventAccountAddressChanged(val)
        }
      }
    },
    isLocked: function(isLocked, oldVal) {
      if (isLocked !== oldVal && !isLocked) {
        this.startBalanceUpdater()
      }
    },
    isDrawerActive: function(val, oldVal) {
      if (val !== oldVal) {
        if (val) {
          if (this.$route.name != RouteNames.NEW) {
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

        if (val === SpinnerState.TRANSACTION_SENT_CANCELLED) {
          if (self.cancelTimeout) {
            clearTimeout(self.cancelTimeout)
          }
          self.cancelTimeout = setTimeout(() => {
            self.$store.dispatch(
              MutationTypes.SET_SPINNER_STATE,
              SpinnerState.CANCEL
            )
            self.cancelTimeout = null
          }, 2000)
        }

        if (
          !self.isDrawerActive &&
          !(val & SpinnerState.SKIP_WALLET_ANIMATIONS)
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
        animationQueue.add(() => nextAnimationFrame(self.hideWalletAnimation))
      }
    },
  },

  created() {
    if (!this.isLoadedFromDapp) {
      document.documentElement.className += ' notInIframe'
      this.restyleWallet()
    }

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

    const unsubscribeWatcher = this.$store.watch(
      () => self.$store.state.isStateLoaded,
      async loaded => {
        if (loaded) {
          unsubscribeWatcher()

          // init web3 ebakus instance
          await initWeb3()

          checkNodeConnection()

          self.loadWalletState()

          setLedgerSupportedTypes()
        }
      }
    )

    if (isSafari && loadedInIframe()) {
      this.$store.dispatch(MutationTypes.INITIALISE_REMOTE_STORE)
    } else {
      this.$store.commit(MutationTypes.INITIALISE_STORE)
    }
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
    startBalanceUpdater: function() {
      if (this.fetchBalanceInterval === null) {
        if (!web3) {
          const self = this
          setTimeout(() => {
            self.startBalanceUpdater()
          }, 0)
          return
        }

        // call immediatelly the first time and wait for 1000ms
        getBalance()

        this.fetchBalanceInterval = setInterval(() => {
          getBalance().catch(() => {}) // just for catching exceptions
        }, 1000)

        // keep it here, as the call in getBalance, won't be called
        // if everything is staked and balance is 0
        getStaked()
        getUnstakingAmount()
      }
    },
    loadWalletState: function() {
      if (this.publicAddress !== null && !this.isLocked) {
        console.log('Wallet is loaded')
        if (this.isInitialRender) {
          this.$router.push({ name: RouteNames.HOME }, () => {})
        }
      } else if (this.isLocked) {
        const routeName = this.isRegistration
          ? RouteNames.NEW
          : RouteNames.UNLOCK

        if (this.$route.name !== routeName) {
          this.$router.push({ name: routeName }, () => {})
        }
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

      if (identiconWidget && this.isLoadedFromDapp) {
        identiconWidget.style.right = getComputedStyle(identiconWidget).right
      }

      wallet.style.width = getComputedStyle(status).width
      wallet.style.height = getComputedStyle(wallet).height

      main.style.display = null

      nextAnimationFrame(() => {
        wallet.style.width = styleVariables.walletOpenedWidth
        wallet.style.height = this.isLoadedFromDapp ? '105vh' : '100vh'
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
        window.outerWidth >=
          parseInt(styleVariables.statusBarWhitelistMobileBreakpoint, 10)
      ) {
        const width =
          window.outerWidth >=
          parseInt(styleVariables.statusBarWhitelistMobileBreakpoint, 10)
            ? 400
            : window.outerWidth
        await resizeFrameWidthInParentWindow(width, 120)
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
      wallet.style.height = this.isLoadedFromDapp ? '105vh' : '100vh'
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
              35}px` // includes widget size + padding
          }

          if (loadedInIframe()) {
            const extraShadowSize = whitelistStatusBar ? 13 : 0
            await resizeFrameWidthInParentWindow(
              Math.ceil(parseFloat(finalStatusWidth)) + extraShadowSize,
              Math.ceil(parseFloat(finalStatusHeight)) + extraShadowSize
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

  background-color: transparent;

  // close animation
  transition: width animation-duration(status, base) ease-out
      animation-duration(fade, leave),
    height animation-duration(wallet) / 2 cubic-bezier(0.25, 0.46, 0.45, 0.94)
      animation-duration(fade, leave),
    background-color animation-duration(overlay, leave) ease-out
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

    background: #fff;
    box-shadow: -2px -20px 14px 0 rgba(0, 0, 0, 0.15);

    // open animation
    transition: width animation-duration(status, base) ease-out 0s,
      height animation-duration(wallet) cubic-bezier(0.25, 0.46, 0.45, 0.94) 0s,
      background-color animation-duration(overlay, enter) ease-out
        animation-duration(status, base),
      box-shadow animation-duration(overlay, enter) ease-out
        animation-duration(status, base);
  }

  .notInIframe & {
    position: relative;
    right: auto;
    height: 100vh;

    margin: 0 auto;
    padding-bottom: 0;

    box-shadow: -2px 0 14px 0 rgba(0, 0, 0, 0.5);
    transition: none;
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

<template>
  <div>
    <div
      id="ebk-wallet"
      :class="{
        opened: isDrawerActive,
        whitelisted: showWhitelistingTimer,
      }"
    >
      <Status />
      <div v-show="isDrawerActive" class="main">
        <router-view />
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
import { isContractCall, isContractCallWhitelisted } from '@/actions/whitelist'
import { SpinnerState, DialogComponents, DialogType } from '@/constants'
import Status from '@/views/Status'
import MutationTypes from '@/store/mutation-types'
import store from '@/store'
import { getBalance } from '@/actions/wallet'
import { web3 } from '@/actions/web3ebakus'
import {
  loadedInIframe,
  expandOverlayFrameInParentWindow,
  shrinkOverlayFrameInParentWindow,
} from '@/parentFrameMessenger/parentFrameMessenger'
import { RouteNames } from '@/router'

export default {
  components: { Status },
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
      dialog: state => state.ui.dialog,
    }),
    SpinnerState: () => SpinnerState,
    showWhitelistingTimer: function() {
      const { component, type } = this.dialog
      return (
        isContractCall() &&
        isContractCallWhitelisted() &&
        (component !== DialogComponents.DIALOGUE &&
          type !== DialogType.UNLOCK_WALLET)
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
          if (
            this.isDrawerActive &&
            this.dialog.component != DialogComponents.ONBOARDING
          ) {
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
    // showWallet: function() {
    //   if (loadedInIframe()) {
    //     expandFrameInParentWindow()
    //   }

    //   store.commit(MutationTypes.ACTIVATE_DRAWER)
    // },
    checkNodeConnectivity: function() {
      store.commit(MutationTypes.SET_SPINNER_STATE, SpinnerState.NODE_CONNECT)

      web3.eth.net
        .getId()
        .then(() => {
          store.dispatch(
            MutationTypes.SET_SPINNER_STATE,
            SpinnerState.NODE_CONNECTED
          )
        })
        .catch(err => {
          store.dispatch(
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
        // store.commit(MutationTypes.SHOW_DIALOG, {
        //   component: DialogComponents.DIALOGUE,
        //   type: DialogType.UNLOCK_WALLET,
        // })
        // TODO
        if (this.$route.name != RouteNames.UNLOCK) {
          this.$router.push({ name: RouteNames.UNLOCK })
        }
      } else {
        // store.commit(MutationTypes.SHOW_DIALOG, {
        //   component: DialogComponents.ONBOARDING,
        // })
        if (this.$route.name != RouteNames.NEW) {
          this.$router.push({ name: RouteNames.NEW })
        }
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

<style lang="scss">
span.ebk-wallet.error {
  color: red;
  font-size: 14px;
  font-weight: 400;
}

.overlay {
  display: none;
  // opacity: 0;
  transition: all 0.5s ease-out;

  &.red,
  &.black {
    display: block;
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    bottom: 0;
    opacity: 0.8;
    z-index: 1000;
    animation: 0.3s show ease-out;
  }
  &.red {
    background: #fd315f;
  }
  &.black {
    background: #000;
  }
}

.status-bar .balance {
  font-weight: 700;
  text-align: center;
}
#receive > div > div > img {
  width: 240px;
  padding: 10px 0px;
}
@keyframes show {
  0% {
    opacity: 0;
    display: none;
  }
  1% {
    display: block;
    opacity: 0;
  }
  100% {
    opacity: 0.8;
  }
}
</style>

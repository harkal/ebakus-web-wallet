<template>
  <div
    ref="statusBar"
    class="status-bar"
    :class="{
      hasBalance: hasBalance,
      hasTitle: hasTitle,
      hasNavigation: hasNavigation,
    }"
    @click="!isDrawerActive && !showWhitelistingTimer && showWallet()"
  >
    <identicon
      v-show="isDrawerActive || (!isDrawerActive && !showWhitelistingTimer)"
      key="identicon"
      ref="identicon"
      :public-key="publicAddress"
      :class="{ loading: isSpinnerActive }"
    />

    <transition name="fade-transition" appear>
      <div
        v-if="
          !isDrawerActive &&
            [
              SpinnerState.CALC_POW,
              SpinnerState.TRANSACTION_SENDING,
              SpinnerState.TRANSACTION_SENT_SUCCESS,
              SpinnerState.NODE_CONNECT,
              SpinnerState.NODE_CONNECTED,
              SpinnerState.NODE_DISCONNECTED,
            ].includes(spinnerState)
        "
        key="closedState"
        class="closed-state"
      >
        <span
          v-if="
            [SpinnerState.CALC_POW, SpinnerState.TRANSACTION_SENDING].includes(
              spinnerState
            )
          "
          key="working"
          class="animate-fade-in-out-slow"
        >
          Working...
        </span>

        <span
          v-else-if="spinnerState === SpinnerState.TRANSACTION_SENT_SUCCESS"
          key="sent"
        >
          Sent

          <img src="@/assets/img/ic_sent.svg" width="13" height="7" />
        </span>

        <img
          v-else-if="spinnerState === SpinnerState.NODE_CONNECT"
          key="connecting"
          src="@/assets/img/ic_connecting.svg"
          width="16"
          height="31"
          class="animate-fade-in-out"
        />
        <img
          v-else-if="spinnerState === SpinnerState.NODE_CONNECTED"
          key="connected"
          src="@/assets/img/ic_connected.svg"
          width="16"
          height="31"
        />
        <img
          v-else-if="spinnerState === SpinnerState.NODE_DISCONNECTED"
          key="disconnected"
          src="@/assets/img/ic_disconnected.svg"
          width="21"
          height="31"
          title="Connection lost try refreshing the page."
        />
      </div>

      <div
        v-else-if="!isDrawerActive && !showWhitelistingTimer"
        key="balanceClosed"
        class="balance balanceClosed"
      >
        {{ balance | toEtherFixed }}

        <img
          v-if="tokenSymbol == 'EBK'"
          src="@/assets/img/ebakus_logo_small.svg"
          width="14"
          height="14"
        />

        <span v-else>{{ tokenSymbol }}</span>
      </div>
    </transition>

    <transition name="fade-transition" appear>
      <div
        v-if="isDrawerActive && !isDialog"
        key="balanceOpened"
        class="balance balanceOpened"
      >
        {{ balance | toEtherFixed }}
        <p>{{ tokenSymbol }}</p>
      </div>
    </transition>

    <transition name="fade-transition" appear>
      <p v-if="hasTitle" key="title" class="title">
        {{ dialog.title }}
      </p>
    </transition>

    <transition name="fade-transition" appear>
      <Navigation v-if="hasNavigation" key="navigation" />
    </transition>

    <DappWhitelistedStatusBar v-if="showWhitelistingTimer" key="whitelist" />

    <transition name="fade-drawer-appear-transition" appear>
      <div v-if="isDrawerActive" key="buttons" class="buttons">
        <transition-group name="fade-transition">
          <button
            v-show="buttonState === ButtonStates.EXIT"
            key="exit"
            class="btn-circle exit"
            @click.stop="exit"
          />
          <button
            v-show="buttonState === ButtonStates.MAIN"
            key="settings"
            class="btn-circle settings"
            @click.stop="showSettings"
          />
          <button
            v-show="
              [ButtonStates.UNLOCK, ButtonStates.MAIN].includes(buttonState)
            "
            key="close"
            class="btn-circle close"
            @click.stop="hideWallet"
          />
        </transition-group>
      </div>
    </transition>
  </div>
</template>

<script>
import { mapState } from 'vuex'

import { SpinnerState, DialogComponents } from '@/constants'

import { isContractCall, isContractCallWhitelisted } from '@/actions/whitelist'

import MutationTypes from '@/store/mutation-types'

import {
  loadedInIframe,
  shrinkFrameInParentWindow,
  expandFrameInParentWindow,
} from '@/parentFrameMessenger/parentFrameMessenger'

import Identicon from '@/components/Identicon'
import DappWhitelistedStatusBar from '@/components/DappWhitelistedStatusBar'
import Navigation from '@/components/Navigation'

import { RouteNames } from '@/router'

const ButtonStates = {
  NONE: 'NONE',
  MAIN: 'MAIN',
  UNLOCK: 'UNLOCK',
  EXIT: 'EXIT',
}

export default {
  components: { Identicon, Navigation, DappWhitelistedStatusBar },
  computed: {
    ...mapState({
      isDrawerActive: state => state.ui.isDrawerActive,
      isSpinnerActive: state => state.ui.isSpinnerActive,
      spinnerState: state => state.ui.currentSpinnerState,
      isDialog: state => state.ui.dialog.active,
      dialog: state => state.ui.dialog,
      isLocked: state => state.wallet.locked,
      publicAddress: state => state.wallet.address,
      balance: state => state.wallet.balance,
      tokenSymbol: state => state.wallet.token,
      isTxFromParentFrame: state => state.tx.jobId,
    }),

    SpinnerState: () => SpinnerState,
    ButtonStates: () => ButtonStates,

    buttonState: function() {
      if (this.$route.name == RouteNames.UNLOCK) {
        return ButtonStates.UNLOCK
      } else if (this.isDialog) {
        if (
          [DialogComponents.SEND_TX, DialogComponents.WHITELIST_DAPP].includes(
            this.dialog.component
          )
        ) {
          return ButtonStates.NONE
        } else {
          return ButtonStates.EXIT
        }
      }
      return ButtonStates.MAIN
    },

    hasBalance: function() {
      return (
        (!this.isDrawerActive && !this.showWhitelistingTimer) ||
        (this.isDrawerActive && !this.isDialog)
      )
    },
    hasTitle: function() {
      return this.isDrawerActive && this.isDialog && this.dialog.title != ''
    },
    hasNavigation: function() {
      return this.isDrawerActive && !this.isDialog && !this.isLocked
    },

    showWhitelistingTimer: function() {
      return (
        this.isTxFromParentFrame &&
        isContractCall() &&
        isContractCallWhitelisted() &&
        this.$route.name !== RouteNames.UNLOCK &&
        this.dialog.component !== DialogComponents.NO_FUNDS
      )
    },
  },
  watch: {
    spinnerState: async function(val, oldVal) {
      if (val !== oldVal) {
        if (
          [
            SpinnerState.TRANSACTION_SENT_SUCCESS,
            SpinnerState.NODE_CONNECTED,
          ].includes(val)
        ) {
          setTimeout(() => {
            this.$store.commit(
              MutationTypes.SET_SPINNER_STATE,
              SpinnerState.SUCCESS
            )
          }, 800)
        }
      }
    },
  },
  mounted() {
    this.updateInnerHeight()
  },
  updated() {
    this.updateInnerHeight()
  },
  methods: {
    showWallet: function() {
      if (loadedInIframe()) {
        expandFrameInParentWindow()
      }

      this.$store.commit(MutationTypes.ACTIVATE_DRAWER, true)
    },
    hideWallet: function() {
      this.$emit('hideWallet') // IMPORTANT: call before DEACTIVATE_DRAWER
      this.$store.commit(MutationTypes.DEACTIVATE_DRAWER)
      this.$store.commit(MutationTypes.UNSET_OVERLAY_COLOR)

      if (loadedInIframe()) {
        shrinkFrameInParentWindow()
      }
    },
    exit: function() {
      if (this.$route.name == RouteNames.NEW) {
        this.$store.commit(MutationTypes.DEACTIVATE_DRAWER)

        if (loadedInIframe()) {
          shrinkFrameInParentWindow()
        }
      } else if (this.$route.name == RouteNames.IMPORT) {
        const redirectFrom = this.$route.query.redirectFrom || RouteNames.HOME
        this.$router.push({ name: redirectFrom }, () => {})
        this.$store.commit(MutationTypes.CLEAR_DIALOG)
      } else if (this.$route.name == RouteNames.SETTINGS) {
        this.$router.push({ name: RouteNames.HOME }, () => {})
        this.$store.commit(MutationTypes.CLEAR_DIALOG)
      } else if (this.isDialog) {
        this.$store.commit(MutationTypes.CLEAR_DIALOG)
      }
    },
    showSettings: function() {
      this.$router.push({ name: RouteNames.SETTINGS }, () => {})
    },
    updateInnerHeight: function() {
      // handle "iOS viewport scroll bug", https://css-tricks.com/the-trick-to-viewport-units-on-mobile/
      // set the value in the --status-bar-vh custom property to the root of the document
      this.$nextTick(() => {
        const height = this.$refs.statusBar.clientHeight * 0.01
        document.documentElement.style.setProperty(
          '--status-bar-vh',
          `${height}px`
        )
      })
    },
  },
}
</script>

<style scoped lang="scss">
@import '../assets/css/_variables';
@import '../assets/css/_animations';
@import '../assets/css/_z-index.scss';

.title {
  position: absolute;
  top: $widget-opened-top + $widget-size-opened + $status-bar-padding;

  right: ($wallet-opened-width / 2);
  transform: translateX(50%);

  margin: 0 auto;

  color: white;
  font-family: sans-serif;
  font-size: 13px;
  font-weight: 400;
  line-height: 13px;
  text-align: center;
}

.balance {
  color: white;
  text-align: right;

  font-family: 'Arial';
  font-size: 17px;
  font-weight: 400;
  white-space: nowrap;

  span,
  p {
    margin: 0;
    font-size: 13px;
    line-height: 13px;
  }

  img {
    margin: -2px 4px 0;
  }
}

.balanceClosed {
  position: relative;
  top: ($wallet-closed-height / 2);
  transform: translateY(-50%);

  display: flex;
  align-items: center;
  justify-content: flex-end;

  margin: 0 8px;
}

.balanceOpened {
  display: block;
  position: absolute;
  top: $widget-opened-top + $widget-size-opened + $status-bar-padding;

  right: ($wallet-opened-width / 2);
  transform: translateX(50%);

  padding-top: 0;

  text-align: center;
  font-family: sans-serif;
  font-size: 34px;
  line-height: 34px;
  font-weight: 600;

  p {
    font-weight: 400;
  }
}

.closed-state {
  position: relative;
  top: ($wallet-closed-height / 2);
  transform: translateY(-50%);

  margin: 0 8px;

  color: white;
  text-align: right;
}

.buttons {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
}

.btn-circle {
  position: absolute;
  width: 34px;
  height: 34px;
  border: 1px solid #333333;
  background-repeat: no-repeat;
  border-radius: 100%;
  margin: 18px;
  background-position: center;

  &.exit {
    background-image: url(../assets/img/ic_exit.png);
    background-size: 11px;
  }
  &.close {
    background-image: url(../assets/img/ic_close.png);
    background-size: 6px 11px;
  }
  &.settings {
    background-image: url(../assets/img/ic_settings.png);
    background-size: 18px;
  }

  &.settings,
  &.exit {
    right: 0px;
  }
}

.status-bar {
  @include z-index(status);
  @include accelerate(width, height);

  min-height: $wallet-closed-height;
  height: $wallet-closed-height;

  background-color: rgb(10, 17, 31);

  padding-left: $widget-size-base + 8px;
  margin-left: auto !important;

  // close animation
  transition: width animation-duration(status, base) ease-out
      animation-duration(fade, leave),
    height animation-duration(status, base) ease-out
      animation-duration(fade, leave);

  #wallet:not(.opened) & {
    width: fit-content;

    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-width: 0;
    border-right-width: 0;
    border-bottom-left-radius: 5px;
    box-shadow: -2px 0 14px 0 rgba(0, 0, 0, 0.15);
  }

  .opened & {
    height: $widget-opened-top + $widget-size-opened + ($status-bar-padding * 2);
    padding: 0;
    overflow: hidden;

    // open animation
    transition: width animation-duration(status, base) ease-out 0s,
      height animation-duration(status, base) ease-out 0s;

    &.hasBalance {
      height: $widget-opened-top + $widget-size-opened + $status-bar-padding +
        $status-balance-height + $status-bar-padding;
    }

    &.hasTitle {
      height: $widget-opened-top + $widget-size-opened + $status-bar-padding +
        $status-title-height + $status-bar-padding;
    }

    &.hasNavigation {
      height: $widget-opened-top + $widget-size-opened + $status-bar-padding +
        $status-navigation-height;
    }

    &.hasBalance.hasNavigation {
      height: $widget-opened-top + $widget-size-opened + $status-bar-padding +
        $status-balance-height + $status-bar-padding + $status-navigation-height;
    }
  }

  .whitelisted:not(.opened) & {
    min-height: 74px;
    height: auto;
    padding: 12px 16px;
  }
}
</style>

<template>
  <div
    ref="statusBar"
    class="status-bar"
    :class="{
      hasBalance: hasBalance,
      hasStaked: hasStaked,
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

    <div
      v-if="
        !isDrawerActive &&
          [
            SpinnerState.CALC_POW,
            SpinnerState.TRANSACTION_SENDING,
            SpinnerState.TRANSACTION_SENT_SUCCESS,
            SpinnerState.TRANSACTION_SENT_CANCELLED,
            SpinnerState.LEDGER_CONFIRM,
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

      <span
        v-else-if="spinnerState === SpinnerState.TRANSACTION_SENT_CANCELLED"
        key="cancel"
      >
        Cancelled
      </span>

      <span
        v-else-if="spinnerState === SpinnerState.LEDGER_CONFIRM"
        key="confirm-ledger"
        class="confirm-on-ledger"
      >
        Confirm on Ledger
      </span>

      <img
        v-else-if="spinnerState === SpinnerState.NODE_CONNECT"
        key="connecting"
        :src="require('!!url-loader?limit=true!@/assets/img/ic_connecting.svg')"
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
        :src="
          require('!!url-loader?limit=true!@/assets/img/ic_disconnected.svg')
        "
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
        v-if="!network.isTestnet && tokenSymbol == 'EBK'"
        src="@/assets/img/ebakus_logo_small.svg"
        width="14"
        height="14"
      />

      <span v-else>{{
        network.isTestnet ? ` t${tokenSymbol}` : ` ${tokenSymbol}`
      }}</span>
    </div>

    <div
      v-if="isDrawerActive && !isDialog"
      key="balanceOpened"
      class="balance balanceOpened"
    >
      {{ balance | toEtherFixed }}
      <p><span v-if="network.isTestnet">t</span>{{ tokenSymbol }}</p>

      <p v-if="hasStaked" class="staked">
        + {{ staked }} <span v-if="network.isTestnet">t</span>EBK staked
      </p>
    </div>

    <p v-if="hasTitle" key="title" class="title">
      {{ dialog.title }}
    </p>

    <Navigation v-if="hasNavigation" key="navigation" />

    <DappWhitelistedStatusBar
      v-if="showWhitelistingTimer"
      ref="whitelist"
      key="whitelist"
    />

    <div
      v-if="
        isDrawerActive &&
          [
            SpinnerState.TRANSACTION_SENT_CANCELLED,
            SpinnerState.CALC_POW,
            SpinnerState.TRANSACTION_SENDING,
            SpinnerState.TRANSACTION_SENT_SUCCESS,
            SpinnerState.LEDGER_FETCH_ACCOUNTS,
            SpinnerState.LEDGER_CONFIRM,
          ].includes(spinnerState)
      "
      key="openedState"
      class="opened-state"
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

      <span
        v-else-if="spinnerState === SpinnerState.TRANSACTION_SENT_CANCELLED"
        key="cancel"
      >
        Cancelled by user
      </span>

      <span
        v-if="spinnerState === SpinnerState.LEDGER_FETCH_ACCOUNTS"
        key="fetching-accounts"
        class="animate-fade-in-out-slow"
      >
        Fetching accounts
      </span>

      <span
        v-else-if="spinnerState === SpinnerState.LEDGER_CONFIRM"
        key="confirm-ledger"
      >
        Confirm on Ledger
      </span>
    </div>

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

    <div
      v-if="
        network.isTestnet &&
          ![
            SpinnerState.NODE_CONNECT,
            SpinnerState.NODE_CONNECTED,
            SpinnerState.NODE_DISCONNECTED,
          ].includes(spinnerState)
      "
      class="testnet"
    >
      test-network
    </div>
  </div>
</template>

<script>
import { mapGetters, mapState } from 'vuex'

import { SpinnerState, DialogComponents } from '@/constants'

import MutationTypes from '@/store/mutation-types'

import Identicon from '@/components/Identicon'
import DappWhitelistedStatusBar from '@/components/DappWhitelistedStatusBar'
import Navigation from '@/components/Navigation'

import { RouteNames } from '@/router'

import {
  loadedInIframe,
  getParentWindowCurrentJob,
  replyToParentWindow,
} from '@/parentFrameMessenger/parentFrameMessenger'
import { animationQueue } from '@/utils'

import styleAnimationVariables from '@/assets/css/_animations.scss'
import { isVotingCall } from '../actions/systemContract'

const ButtonStates = {
  NONE: 'NONE',
  MAIN: 'MAIN',
  UNLOCK: 'UNLOCK',
  EXIT: 'EXIT',
}

export default {
  components: { Identicon, Navigation, DappWhitelistedStatusBar },
  props: {
    isInitialRender: {
      type: Boolean,
      default: false,
    },
    showWhitelistingTimer: {
      type: Boolean,
      default: false,
    },
  },
  computed: {
    ...mapGetters(['network']),
    ...mapState({
      isDrawerActive: state => state.ui.isDrawerActive,
      isSpinnerActive: state => state.ui.isSpinnerActive,
      spinnerState: state => state.ui.currentSpinnerState,
      isDialog: state => state.ui.dialog.active,
      dialog: state => state.ui.dialog,
      publicAddress: state => state.wallet.address,
      balance: state => state.wallet.balance,
      tokenSymbol: state => state.wallet.tokenSymbol,
      staked: state => state.wallet.staked,
    }),
    isLocked: function() {
      return this.$store.getters.wallet.locked
    },
    SpinnerState: () => SpinnerState,
    ButtonStates: () => ButtonStates,

    buttonState: function() {
      if (
        [RouteNames.UNLOCK, RouteNames.SAFARI_WARNING].includes(
          this.$route.name
        )
      ) {
        if ([DialogComponents.LEDGER].includes(this.dialog.component)) {
          return ButtonStates.EXIT
        }

        return ButtonStates.UNLOCK
      } else if (this.$route.name == RouteNames.WHITELIST_DAPP) {
        return ButtonStates.NONE
      } else if (this.isDialog) {
        if ([DialogComponents.SEND_TX].includes(this.dialog.component)) {
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
    hasStaked: function() {
      return (
        this.isDrawerActive && !this.isDialog && this.staked && this.staked > 0
      )
    },
    hasTitle: function() {
      return this.isDrawerActive && this.isDialog && this.dialog.title != ''
    },
    hasNavigation: function() {
      return this.isDrawerActive && !this.isDialog && !this.isLocked
    },
  },
  mounted() {
    this.updateInnerHeight()
  },
  updated() {
    this.updateInnerHeight()
  },
  methods: {
    isAnimating: function() {
      return (
        animationQueue.isAnimating() || this.isInitialRender
      ) /* isAnimating or new page load */
    },
    showWallet: function() {
      if (this.isAnimating()) {
        return
      }

      this.$store.commit(MutationTypes.ACTIVATE_DRAWER, true)
    },
    hideWallet: function() {
      if (this.isAnimating()) {
        return
      }

      this.$emit('hideWallet') // IMPORTANT: call before DEACTIVATE_DRAWER
      this.$store.commit(MutationTypes.DEACTIVATE_DRAWER)
      this.$store.commit(MutationTypes.UNSET_OVERLAY_COLOR)
    },
    exit: function() {
      if (this.$route.name == RouteNames.NEW) {
        if (
          this.isDialog &&
          [DialogComponents.LEDGER].includes(this.dialog.component)
        ) {
          this.$store.commit(MutationTypes.CLEAR_DIALOG)
        } else {
          this.$store.commit(MutationTypes.DEACTIVATE_DRAWER)
        }
      } else if (this.$route.name == RouteNames.IMPORT) {
        const redirectFrom = this.$route.query.redirectFrom || RouteNames.HOME
        this.$router.push({ name: redirectFrom }, () => {})
        this.$store.commit(MutationTypes.CLEAR_DIALOG)
      } else if (this.$route.name == RouteNames.SETTINGS) {
        if (![DialogComponents.LEDGER].includes(this.dialog.component)) {
          this.$router.push({ name: RouteNames.HOME }, () => {})
        }
        this.$store.commit(MutationTypes.CLEAR_DIALOG)
      } else if (this.$route.name == RouteNames.STAKE) {
        this.$router.go(-1)
      } else if (this.$route.name == RouteNames.VOTING_STAKE) {
        this.$store.commit(MutationTypes.DEACTIVATE_DRAWER)
        this.$store.commit(MutationTypes.CLEAR_DIALOG)
        this.$router.go(-1)

        if (loadedInIframe() && isVotingCall()) {
          const currentJob = getParentWindowCurrentJob()
          const { data: { cmd } = {} } = currentJob || {}
          if (cmd === 'sendTransaction') {
            replyToParentWindow(
              null,
              {
                code: 'send_tx_cancel',
                msg: 'User cancelled setting stake (voting action)',
              },
              currentJob
            )
          }
        }
      } else if (this.isDialog) {
        this.$store.commit(MutationTypes.CLEAR_DIALOG)
      }
    },
    showSettings: function() {
      this.$router.push({ name: RouteNames.SETTINGS }, () => {})
    },
    updateInnerHeight: function() {
      const self = this

      // handle "iOS viewport scroll bug", https://css-tricks.com/the-trick-to-viewport-units-on-mobile/
      // set the value in the --status-bar-vh custom property to the root of the document
      setTimeout(() => {
        self.$nextTick(() => {
          const height = self.$refs.statusBar.clientHeight * 0.01
          document.documentElement.style.setProperty(
            '--status-bar-vh',
            `${height}px`
          )
        })
      }, styleAnimationVariables.animationStatusBase)
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

  span {
    margin-left: 2px;
  }
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

  .staked {
    margin: $status-bar-padding / 2 0;
    color: rgba(10, 206, 235, 0.59);
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

.opened-state {
  position: absolute;
  bottom: $status-bar-padding;
  right: 50%;
  transform: translateX(50%);
  max-width: 300px;
  padding: 12px;
  z-index: 10000;
  background-color: rgb(38, 51, 75);
  box-shadow: 0 0 20px rgb(4, 5, 23);
  border-radius: 6px;
  text-align: center;
  font-size: 0.9em;
  font-weight: 500;
  color: #bec2c9;

  .hasNavigation & {
    bottom: $status-bar-padding + $status-navigation-height;
  }
}

.buttons {
  position: absolute;
  top: 0;
  right: 0;
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

.confirm-on-ledger {
  white-space: nowrap;
}

.testnet {
  position: absolute;
  top: 2px;
  right: 8px;

  color: #f3067c;

  font-family: sans-serif;
  font-size: 8px;
  font-weight: 600;
  letter-spacing: 0.3px;
  text-align: center;

  white-space: nowrap;
  overflow: hidden;
  text-overflow: ellipsis;

  user-select: none;
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
      animation-duration(fade, leave),
    border animation-duration(status, base) ease-out
      animation-duration(fade, leave);

  #wallet:not(.opened) & {
    width: fit-content;

    border: 2px solid rgba(255, 255, 255, 0.3);
    border-top-width: 0;
    border-right-width: 0;
    border-bottom-left-radius: 5px;
    box-shadow: -2px 0 14px 0 rgba(0, 0, 0, 0.15);

    user-select: none;
  }

  #wallet.whitelisted:not(.opened) & {
    height: auto;
    padding-left: 0;

    @media only screen and (max-width: $status-bar-whitelist-mobile-breakpoint) {
      width: 100vw !important;
      border-left: 0;
      border-bottom-left-radius: 0;
    }

    .buttons {
      display: none;
    }
  }

  .opened & {
    height: $widget-opened-top + $widget-size-opened + ($status-bar-padding * 2);
    padding: 0;
    overflow: hidden;

    // open animation
    transition: width animation-duration(status, base) ease-out 0s,
      height animation-duration(status, base) ease-out 0s,
      border animation-duration(status, base) ease-out 0s;

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

    &.hasBalance.hasStaked {
      height: $widget-opened-top + $widget-size-opened + $status-bar-padding +
        $status-balance-height + $status-staked-height + $status-bar-padding;
    }

    &.hasBalance.hasNavigation {
      height: $widget-opened-top + $widget-size-opened + $status-bar-padding +
        $status-balance-height + $status-bar-padding + $status-navigation-height;
    }

    &.hasBalance.hasStaked.hasNavigation {
      height: $widget-opened-top + $widget-size-opened + $status-bar-padding +
        $status-balance-height + $status-staked-height + $status-bar-padding +
        $status-navigation-height;
    }

    .testnet {
      top: 8px;
      right: 50%;
      transform: translateX(50%);

      width: 88px;
      border: solid 1px #f3067c;
      border-radius: 2rem;

      font-size: 11px;
      font-weight: 400;
    }
  }
}

.animate-fade-in-out {
  animation: fadeInOutAnimation 0.5s infinite;
}
.animate-fade-in-out-slow {
  animation: fadeInOutAnimation 1s infinite;
}

@keyframes fadeInOutAnimation {
  0% {
    opacity: 1;
  }
  50% {
    opacity: 0.5;
  }
  100% {
    opacity: 1;
  }
}
</style>

<template>
  <div
    ref="statusBar"
    class="status-bar"
    @click="!isDrawerActive && !showWhitelistingTimer && showWallet()"
  >
    <identicon
      v-if="isDrawerActive || (!isDrawerActive && !showWhitelistingTimer)"
      key="identicon"
      :public-key="publicAddress"
      :class="{ loading: isSpinnerActive }"
    />

    <transition
      name="fade-transition"
      :duration="{
        enter: styles.animationFadeEnter,
        leave: 0,
      }"
      appear
    >
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

      <p
        v-else-if="
          (!isDrawerActive && !showWhitelistingTimer) ||
            (isDrawerActive && !isDialog)
        "
        key="balance"
        class="balance"
      >
        {{ balance | toEtherFixed }}

        <transition
          name="fade-transition"
          :duration="{
            enter: styles.animationFadeEnter,
            leave: 0,
          }"
        >
          <img
            v-if="!isDrawerActive && tokenSymbol == 'EBK'"
            src="@/assets/img/ebakus_logo_small.svg"
            width="14"
            height="14"
          />

          <span v-else>{{ tokenSymbol }}</span>
        </transition>
      </p>
    </transition>

    <transition
      name="fade-transition"
      :duration="{
        enter: styles.animationFadeEnter,
        leave: 0,
      }"
    >
      <p
        v-if="isDrawerActive && isDialog && dialog.title != ''"
        key="title"
        class="title"
      >
        {{ dialog.title }}
      </p>
    </transition>

    <transition
      name="fade-transition"
      :duration="{
        enter: styles.animationFadeEnter,
        leave: 0,
      }"
    >
      <Navigation
        v-if="isDrawerActive && !isDialog && !isLocked"
        key="navigation"
      />
    </transition>

    <transition
      name="whitelist-transition"
      :duration="{ enter: styles.animationStatusWhitelist, leave: 0 }"
      appear
    >
      <DappWhitelistedStatusBar v-if="showWhitelistingTimer" key="whitelist" />
    </transition>

    <transition
      name="status-buttons-transition"
      :duration="{
        enter: styles.animationStatusButtonsEnter,
        leave: styles.animationStatusButtonsLeave,
      }"
      appear
    >
      <div v-if="isDrawerActive" key="buttons" class="buttons">
        <transition-group
          name="fade-transition"
          :duration="{
            enter: styles.animationFadeEnter,
            leave: 0,
          }"
          appear
        >
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
  resizeFrameWidthInParentWindow,
} from '@/parentFrameMessenger/parentFrameMessenger'

import Identicon from '@/components/Identicon'
import DappWhitelistedStatusBar from '@/components/DappWhitelistedStatusBar'
import Navigation from '@/components/Navigation'

import { RouteNames } from '@/router'

import styles from '@/assets/css/_animations.scss'

const ButtonStates = {
  NONE: 'NONE',
  MAIN: 'MAIN',
  UNLOCK: 'UNLOCK',
  EXIT: 'EXIT',
}

export default {
  components: { Identicon, Navigation, DappWhitelistedStatusBar },
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
    styles: () => styles,

    buttonState() {
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
    spinnerState: function(val, oldVal) {
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

        if (!this.isDrawerActive) {
          if (loadedInIframe()) {
            if ([SpinnerState.CANCEL, SpinnerState.SUCCESS].includes(val)) {
              clearTimeout(this.resizeFrameTimer)
              this.resizeFrameTimer = setTimeout(() => {
                resizeFrameWidthInParentWindow(
                  this.$refs.statusBar.clientWidth + 2
                )
              }, 800)
            } else if (
              [SpinnerState.TRANSACTION_WHITELISTED_TIMER].includes(val)
            ) {
              resizeFrameWidthInParentWindow(400, 120)

              clearTimeout(this.resizeFrameTimer)
              this.resizeFrameTimer = setTimeout(() => {
                resizeFrameWidthInParentWindow(
                  this.$refs.statusBar.clientWidth + 2,
                  this.$refs.statusBar.clientHeight + 2
                )
              }, 800)
            }
          }
        }
      }
    },
    isDrawerActive: function(val, oldVal) {
      if (val !== oldVal && val == false) {
        resizeFrameWidthInParentWindow(400, 120)
        clearTimeout(this.resizeFrameTimer)
        this.resizeFrameTimer = setTimeout(() => {
          resizeFrameWidthInParentWindow(
            this.$refs.statusBar.clientWidth + 2,
            this.$refs.statusBar.clientHeight + 2
          )
        }, 800)
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
      this.$emit('showWallet')

      clearTimeout(this.resizeFrameTimer)

      if (loadedInIframe()) {
        expandFrameInParentWindow()
      }

      this.$store.commit(MutationTypes.ACTIVATE_DRAWER, true)
    },
    hideWallet: function() {
      this.$emit('hideWallet')

      this.$store.commit(MutationTypes.DEACTIVATE_DRAWER)

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
@import '../assets/css/_animations.scss';

.title {
  color: white;
  font-family: sans-serif;
  font-size: 13px;
  font-weight: 400;
  line-height: 13px;
  text-align: center;
}

.balance {
  display: flex;
  flex-wrap: wrap;
  flex-direction: row;
  align-items: center;
  align-content: center;
  justify-content: center;

  color: white;
  text-align: center;

  font-family: 'Arial';
  font-size: 17px;
  font-weight: 500;
  white-space: nowrap;

  .opened & {
    flex-wrap: wrap;

    font-family: sans-serif;
    font-size: 34px;
    line-height: 34px;
    font-weight: 600;

    span {
      flex-basis: 100%;
      font-weight: 400;
    }
  }

  .hidden {
    opacity: 0;
  }

  span {
    font-size: 13px;
    line-height: 13px;
  }

  img {
    margin: 2px 6px;
  }
}

.closed-state {
  color: white;
}

.buttons {
  position: absolute;
  top: 0;
  left: 0;
  margin: 0 !important;
}

.btn-circle {
  position: absolute;

  &.settings,
  &.exit {
    right: 0px;
  }
}
</style>

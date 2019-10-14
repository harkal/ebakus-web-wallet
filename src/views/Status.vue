<template>
  <div
    ref="statusBar"
    class="status-bar"
    @click="!isDrawerActive && !showWhitelistingTimer && showWallet()"
  >
    <identicon
      v-if="isDrawerActive || (!isDrawerActive && !showWhitelistingTimer)"
      :public-key="publicAddress"
      :class="{ loading: isSpinnerActive }"
    />

    <!-- <template v-if="!isDrawerActive && showWhitelistingTimer">
      <WhitelistedStatusBar />
    </template> -->

    <!-- <div key="header" class="header" :class="{ dialog: isDialog }"> -->
    <!-- <div v-if="buttonState === ButtonStates.EXIT" key="exit">
        <button class="btn-circle exit" @click="exitPopUP" />
      </div>
      <div v-else-if="buttonState === ButtonStates.UNLOCK" key="unlock">
        <button class="btn-circle close" @click="hideWallet" />
      </div>
      <div v-else-if="buttonState === ButtonStates.MAIN" key="main">
        <button class="btn-circle settings" @click="showSettings" />
        <button class="btn-circle close" @click="hideWallet" />
      </div> -->

    <!-- <div :class="{ hidden: isDialog }" class="balance">
        <h1>{{ balance | toEtherBalance }}</h1>
        <p>{{ tokenSymbol }}</p>
      </div> -->
    <!-- <p :class="{ hidden: !isDialog || dialog.title == '' }" class="title">
        {{ dialog.title }}
      </p> -->
    <!-- </div> -->

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
        class="animate-hide-me"
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
        class="animate-hide-me"
      />
      <img
        v-else-if="spinnerState === SpinnerState.NODE_DISCONNECTED"
        key="disconnected"
        src="@/assets/img/ic_disconnected.svg"
        width="21"
        height="31"
        title="Connection lost try refreshing the page."
      />

      <!-- <span v-else key="balance" class="balance">
        {{ balance | toEtherBalance }}
        <img src="@/assets/img/ebakus_logo_small.svg" width="14" height="14" />
      </span> -->
    </div>

    <p v-else-if="!isDrawerActive || !isDialog" class="balance">
      {{ balance | toEtherBalance }}

      <!-- <p> -->
      <span v-if="isDrawerActive || tokenSymbol != 'EBK'">{{
        tokenSymbol
      }}</span>

      <img
        v-if="!isDrawerActive && tokenSymbol == 'EBK'"
        src="@/assets/img/ebakus_logo_small.svg"
        width="14"
        height="14"
        :class="{ hidden: isDialog || isDrawerActive }"
      />
      <!-- </p> -->
    </p>

    <p v-if="isDrawerActive && isDialog && dialog.title != ''" class="title">
      {{ dialog.title }}
    </p>
    <!-- <p class="title">{{ dialog.title }}Test title</p> -->

    <Navigation v-if="isDrawerActive && !isDialog && !isLocked" />

    <div v-if="isDrawerActive" key="buttons" class="buttons">
      <template v-if="buttonState === ButtonStates.EXIT">
        <button class="btn-circle exit" @click.stop="exitPopUP" />
      </template>
      <template v-else-if="buttonState === ButtonStates.UNLOCK">
        <button class="btn-circle close" @click.stop="hideWallet" />
      </template>
      <template v-else-if="buttonState === ButtonStates.MAIN">
        <button class="btn-circle settings" @click.stop="showSettings" />
        <button class="btn-circle close" @click.stop="hideWallet" />
      </template>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'

import { SpinnerState, DialogComponents, DialogType } from '@/constants'

import { isContractCall, isContractCallWhitelisted } from '@/actions/whitelist'

import MutationTypes from '@/store/mutation-types'
import store from '@/store'

import {
  loadedInIframe,
  shrinkFrameInParentWindow,
  expandFrameInParentWindow,
  resizeFrameWidthInParentWindow,
} from '@/parentFrameMessenger/parentFrameMessenger'

import Identicon from '@/components/Identicon'
// import WhitelistedStatusBar from './components/UI/WhitelistedStatusBar'
import Navigation from '@/components/Navigation'

import { RouteNames } from '@/router'

const ButtonStates = {
  NONE: 'NONE',
  MAIN: 'MAIN',
  UNLOCK: 'UNLOCK',
  EXIT: 'EXIT',
}

export default {
  components: { Identicon, Navigation },
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
    }),

    SpinnerState: () => SpinnerState,
    ButtonStates: () => ButtonStates,

    buttonState() {
      if (this.isDialog) {
        if (
          [DialogType.SEND_TX, DialogType.WHITELIST_DAPP].includes(
            this.dialog.type
          )
        ) {
          return ButtonStates.NONE
        } else {
          return ButtonStates.EXIT
        }
      } else if (this.$route.name == RouteNames.UNLOCK) {
        return ButtonStates.UNLOCK
      }
      return ButtonStates.MAIN
    },

    showWhitelistingTimer: function() {
      return (
        isContractCall() &&
        isContractCallWhitelisted() &&
        this.$route.name !== RouteNames.UNLOCK
      )
    },
  },
  watch: {
    spinnerState: function(val, oldVal) {
      if (val !== oldVal) {
        // check if state needs update in order to present the balance
        if (
          [
            SpinnerState.TRANSACTION_SENT_SUCCESS,
            SpinnerState.NODE_CONNECTED,
          ].includes(val)
        ) {
          clearTimeout(this.resizeFrameTimer)
          this.resizeFrameTimer = setTimeout(() => {
            store.commit(MutationTypes.SET_SPINNER_STATE, SpinnerState.SUCCESS)
          }, 1000)
        }

        if (
          !this.isDrawerActive &&
          loadedInIframe() &&
          [SpinnerState.CANCEL, SpinnerState.SUCCESS].includes(val)
        ) {
          clearTimeout(this.resizeFrameTimer)
          this.resizeFrameTimer = setTimeout(() => {
            resizeFrameWidthInParentWindow(this.$refs.statusBar.clientWidth + 2)
          }, 1000)
        }

        if (
          !this.isDrawerActive &&
          loadedInIframe() &&
          [SpinnerState.TRANSACTION_WHITELISTED_TIMER].includes(val)
        ) {
          resizeFrameWidthInParentWindow(400, 120)

          clearTimeout(this.resizeFrameTimer)
          this.resizeFrameTimer = setTimeout(() => {
            resizeFrameWidthInParentWindow(
              this.$refs.statusBar.clientWidth + 2,
              this.$refs.statusBar.clientHeight + 2
            )
          }, 600)
        }
      }
    },
    isDrawerActive: function(val, oldVal) {
      if (val !== oldVal && val == true) {
        resizeFrameWidthInParentWindow(400, 120)
        clearTimeout(this.resizeFrameTimer)
        this.resizeFrameTimer = setTimeout(() => {
          resizeFrameWidthInParentWindow(
            this.$refs.statusBar.clientWidth + 2,
            this.$refs.statusBar.clientHeight + 2
          )
        }, 600)
      }
    },
  },
  methods: {
    showWallet: function() {
      if (loadedInIframe()) {
        expandFrameInParentWindow()
      }

      store.commit(MutationTypes.ACTIVATE_DRAWER)
    },
    hideWallet: function() {
      store.commit(MutationTypes.DEACTIVATE_DRAWER)
      // store.commit('setActiveTab', 'ebk-tab_history')

      if (loadedInIframe()) {
        shrinkFrameInParentWindow()
      }
    },
    exitPopUP: function() {
      console.log('TCL: this.dialog', JSON.stringify(this.dialog))
      if (this.dialog.component == DialogComponents.ONBOARDING) {
        store.commit(MutationTypes.DEACTIVATE_DRAWER)

        if (loadedInIframe()) {
          shrinkFrameInParentWindow()
        }
      } else if (this.dialog.type == DialogType.IMPORT_KEY_ONBOARDING) {
        store.commit(MutationTypes.SHOW_DIALOG, {
          component: DialogComponents.ONBOARDING,
        })
      } else {
        store.commit(MutationTypes.CLEAR_DIALOG)
      }
    },
    showSettings: function() {
      this.$router.push({ name: RouteNames.SETTINGS })
    },
  },
}
</script>

<style scoped lang="scss">
// .header {
//   position: absolute;
//   top: 0px;
//   width: 100%;
//   height: 255px;
//   background: #0a111f;
//   transition: all 0.15s ease-out;

//   z-index: 9000;

//   &.dialog {
//     height: 147px;
//   }
// }

.title {
  // position: absolute;
  // top: 118px;
  // left: 50%;
  // transform: translateX(-50%);

  color: white;
  font-family: sans-serif;
  font-size: 13px;
  font-weight: 400;
  line-height: 13px;
  text-align: center;
  transition: opacity 0.2s ease-out;

  &.hidden {
    transition: opacity 0.2s ease-in;
    opacity: 0;
  }
}

.balance {
  // position: absolute;
  // top: 75px;
  // left: 50%;
  // transform: translateX(-50%);
  // transition: opacity 0.3s ease-out;
  display: flex;
  justify-content: center;
  align-items: center;

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
    }
  }

  &.hidden {
    opacity: 0;
  }

  // & > * {
  //   margin: 0;
  // }

  // & > h1 {
  //   // margin-top: 48px;
  // }

  span {
    font-size: 13px;
    line-height: 13px;
  }

  img {
    margin: 2px 6px;
  }
}

.buttons {
  position: absolute;
}

.btn-circle {
  position: fixed;
  top: 0px;

  &.settings,
  &.exit {
    right: 0px;
  }
}
</style>

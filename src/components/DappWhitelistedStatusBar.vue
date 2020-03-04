<template>
  <div
    v-if="preTitle || to"
    ref="whitelistStatusBar"
    class="status-bar-whitelisted"
    :class="{ popup: isDrawerActive }"
    @mouseover="pause"
    @mouseleave="unpause"
  >
    <div class="info">
      <h2>
        {{ preTitle }}
        <strong v-if="amountTitle != ''" class="caution">
          {{ amountTitle }}</strong
        >
        <strong v-if="emTitle != ''"> {{ emTitle }}</strong>
        <span v-if="postTitle != ''"> {{ postTitle }}</span>
      </h2>
      <h3>
        {{ to | lowercase }}
      </h3>

      <div class="progress-bar">
        <div class="state" :style="{ width: getProgressWidth + '%' }"></div>
      </div>
    </div>

    <button class="cancel" @click="cancel">Cancel</button>
  </div>
</template>

<script>
import Vue from 'vue'
import Web3 from 'web3'
import { mapState, mapGetters } from 'vuex'

import { decodeDataUsingAbi, getValueForParam } from '@/actions/abi'
import {
  loadWhitelistedDapp,
  removeDappFromWhitelist,
} from '@/actions/whitelist'
import { getTokenInfoForContractAddress, decodeData } from '@/actions/tokens'

import {
  checkIfEnoughBalance,
  getTokenSymbolPrefix,
} from '@/actions/transactions'

import {
  DefaultDappWhitelistTimer,
  SpinnerState,
  DialogComponents,
} from '@/constants'

import MutationTypes from '@/store/mutation-types'

import { activateDrawerIfClosed } from '@/parentFrameMessenger/handler'

import { nextAnimationFrame, cancelAnimationFrame } from '@/utils'

export default {
  filters: {
    lowercase: function(val) {
      return typeof val === 'string' ? val.toLowerCase() : val
    },
  },
  data() {
    return {
      remainingTime: 0,
      progressWidth: 100,
      preTitle: '',
      amountTitle: '',
      emTitle: '',
      postTitle: '',
      to: '',
      countdownAnimationFrameStartTime: null,
      countdownAnimationFrame: null,
      countdownStopped: false, // handle edge cases where countdown doesn't stop because of race conditions
    }
  },
  computed: {
    ...mapGetters(['txObject']),
    ...mapState({
      isDrawerActive: state => state.ui.isDrawerActive,
      tx: state => state.tx,
    }),
    getTimer: function() {
      const { all: { timer = DefaultDappWhitelistTimer } = {} } =
        loadWhitelistedDapp() || {}
      return timer
    },
    getProgressWidth: function() {
      return (this.remainingTime / this.getTimer) * 100
    },
  },
  beforeDestroy() {
    this.stopCountdown()
  },
  beforeMount() {
    this.remainingTime = this.getTimer
  },
  mounted() {
    if (checkIfEnoughBalance()) {
      this.getTxInfo()

      if (this.isDrawerActive) {
        nextAnimationFrame(this.openedWalletEntranceAnimation)
      }

      this.countdownAnimationFrame = nextAnimationFrame(this.countdown)
    }
  },
  methods: {
    countdown(timestamp) {
      if (this.countdownStopped) {
        return
      }

      if (!this.countdownAnimationFrameStartTime) {
        this.countdownAnimationFrameStartTime = timestamp
      }

      let diff = timestamp - this.countdownAnimationFrameStartTime
      this.countdownAnimationFrameStartTime = timestamp
      this.remainingTime -= diff

      if (this.remainingTime > 0) {
        this.countdownAnimationFrame = nextAnimationFrame(this.countdown)
      } else {
        this.stopCountdown()
        this.tx.sendTx()
      }
    },
    stopCountdown() {
      if (this.countdownAnimationFrame) {
        cancelAnimationFrame(this.countdownAnimationFrame)
        this.countdownAnimationFrameStartTime = null
        this.countdownAnimationFrame = null
      }
    },
    pause() {
      this.stopCountdown()
    },
    unpause() {
      this.countdownAnimationFrame = nextAnimationFrame(this.countdown)
    },
    cancel() {
      this.countdownStopped = true
      this.stopCountdown()
      this.$store.commit(MutationTypes.SET_SPINNER_STATE, SpinnerState.NONE)
      removeDappFromWhitelist()

      this.$store.commit(MutationTypes.SHOW_DIALOG, {
        component: DialogComponents.SEND_TX,
        title: 'Send Confirmation',
      })
      activateDrawerIfClosed()
    },
    openedWalletEntranceAnimation() {
      const whitelistStatusBar = this.$refs.whitelistStatusBar
      whitelistStatusBar.style.display = 'flex'
      whitelistStatusBar.style.opacity = 1
    },
    async getTxInfo() {
      const txObject = this.txObject
      this.to = txObject.to

      let value = txObject.value || '0'
      value = Vue.options.filters.toEther(value)

      const tokenSymbolPrefix = getTokenSymbolPrefix(txObject.chainId)
      let data = txObject.data || txObject.input

      let decodedData

      this.preTitle = 'You are about'

      if (value > 0) {
        this.amountTitle = `to spend ${value} ${tokenSymbolPrefix}EBK`
      } else {
        this.postTitle = '...' // for slow networks, where the await below takes too long
      }

      const isContractCreation = !txObject.to || /^0x0+$/.test(txObject.to)
      if (isContractCreation) {
        this.emTitle = 'to deploy'
        this.postTitle = 'a new contract'
      } else {
        const token = getTokenInfoForContractAddress(txObject.to)
        if (token && data) {
          decodedData = decodeData(data)
        } else if (data) {
          decodedData = await decodeDataUsingAbi(txObject.to, data)
        }

        if (this.postTitle === '...') {
          this.postTitle = ''
        }

        if (decodedData) {
          const { name, params } = decodedData
          data = params

          if (name === 'transfer') {
            this.to = getValueForParam('_to', params)
            const tokenValue = getValueForParam('_value', params) || 0

            this.emTitle = `to transfer ${Web3.utils.fromWei(
              String(tokenValue)
            )} ${token.symbol}`
          } else if (name === 'getWei') {
            this.emTitle = `to request 1 ${tokenSymbolPrefix}EBK`
            this.postTitle = 'from faucet'
          } else {
            this.emTitle = `to call ${name}`
          }
        } else {
          this.emTitle = `to call a contract action`
        }
      }

      if (this.amountTitle != '' && this.emTitle != '') {
        this.postTitle = `and ${this.emTitle} ${this.postTitle}`
        this.emTitle = ''
      }
    },
  },
}
</script>

<style scoped lang="scss">
@import '../assets/css/_variables';
@import '../assets/css/_animations';

$button-width: 50px;

.status-bar-whitelisted {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;

  min-width: 263px;
  max-width: 370px;
  padding: 12px 16px;

  transition: opacity animation-duration(fade, enter) ease-in;

  // display and opacity are set in App.js by animation handler
  display: none;
  opacity: 0;

  #wallet.whitelisted:not(.opened) & {
    min-height: 92px;
  }
}

.popup {
  position: absolute;
  right: 10px;
  top: 58px;
  max-width: 300px;
  padding: 12px;
  z-index: 10000;
  background-color: rgb(38, 51, 75);
  box-shadow: 0 0 20px rgb(4, 5, 23);
  border-radius: 6px;
  text-align: center;

  .cancel {
    margin-bottom: 0;
    padding: 10px 0;
    width: 100%;

    &:hover {
      background-color: rgba(0, 0, 0, 0.3);
    }
  }

  h3 {
    color: #bec2c9;
  }
}

.info {
  min-width: 262px;
  width: min-content;
}

h2,
h3 {
  color: white;
  margin: 0;
  line-height: 1.4em;
  font-weight: 400;
}

h2 {
  font-size: 1em;
  min-height: 44px;
}

h2 .caution {
  color: #fd315f;
}

h3 {
  font-family: sans-serif;
  font-size: 0.7em;
  letter-spacing: 0.3px;
  color: #b6b8bc;
}

.cancel {
  width: $button-width;
  margin: 0;
  margin-left: $status-bar-padding;

  background-color: transparent;
  border: transparent;
  font-weight: 700;
  cursor: pointer;

  &:hover {
    background-color: transparent;
    border: 0;
    outline: 0;
  }
}

.progress-bar {
  margin-top: 8px;

  &,
  .state {
    height: 3px;
    border-radius: 1em;
    background: rgba(0, 0, 0, 0.3);
  }

  .state {
    background: rgba(255, 255, 255, 0.3);
  }
}

@media only screen and (max-width: $status-bar-whitelist-mobile-breakpoint) {
  .status-bar-whitelisted {
    flex-direction: column;
    width: 100vw;
  }
  .info {
    width: 100%;
  }

  .cancel {
    margin: 10px 0;
    padding: 0;
    width: 100%;
  }
}
</style>

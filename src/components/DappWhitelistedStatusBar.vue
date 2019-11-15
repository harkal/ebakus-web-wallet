<template>
  <div
    v-if="preTitle || to"
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
import { mapState } from 'vuex'

import { decodeDataUsingAbi, getValueForParam } from '@/actions/abi'
import {
  loadWhitelistedDapp,
  removeDappFromWhitelist,
} from '@/actions/whitelist'
import { getTokenInfoForContractAddress, decodeData } from '@/actions/tokens'

import { checkIfEnoughBalance, calcWorkAndSendTx } from '@/actions/transactions'
import { web3 } from '@/actions/web3ebakus'

import {
  DefaultDappWhitelistTimer,
  SpinnerState,
  DialogComponents,
} from '@/constants'

import MutationTypes from '@/store/mutation-types'

import { activateDrawerIfClosed } from '@/parentFrameMessenger/handler'

import { nextAnimationFrame } from '@/utils'

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
      countdownAnimationFrameStartTime: null,
      countdownAnimationFrame: null,
      preTitle: '',
      amountTitle: '',
      emTitle: '',
      postTitle: '',
      to: '',
    }
  },
  computed: {
    ...mapState({
      isDrawerActive: state => state.ui.isDrawerActive,
      balance: state => state.wallet.balance,
      tx: state => state.tx.object,
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
  async mounted() {
    if (!checkIfEnoughBalance()) {
      activateDrawerIfClosed()
    } else {
      await this.getTxInfo()

      this.countdownAnimationFrame = nextAnimationFrame(this.countdown)
    }
  },
  methods: {
    countdown(timestamp) {
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
        calcWorkAndSendTx(this.tx)
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
      this.stopCountdown()
      this.$store.commit(MutationTypes.SET_SPINNER_STATE, SpinnerState.NONE)
      removeDappFromWhitelist()

      this.$store.commit(MutationTypes.SHOW_DIALOG, {
        component: DialogComponents.SEND_TX,
        title: 'Send Confirmation',
      })
      activateDrawerIfClosed()
    },
    async getTxInfo() {
      const tx = this.tx
      this.to = tx.to

      let value = tx.value || '0'
      value = Vue.options.filters.toEther(value)

      let data = tx.data || tx.input

      let decodedData

      this.preTitle = 'You are about'

      if (value > 0) {
        this.amountTitle = `to spend ${value} EBK`
      } else {
        this.postTitle = '...' // for slow networks, where the await below takes too long
      }

      const isContractCreation = !tx.to || /^0x0+$/.test(tx.to)
      if (isContractCreation) {
        this.emTitle = 'to deploy'
        this.postTitle = 'a new contract'
      } else {
        const token = getTokenInfoForContractAddress(tx.to)
        if (token && data) {
          decodedData = decodeData(data)
        } else if (data) {
          decodedData = await decodeDataUsingAbi(tx.to, data)
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

            this.emTitle = `to transfer ${web3.utils.fromWei(
              String(tokenValue)
            )} ${token.symbol}`
          } else if (name === 'getWei') {
            this.emTitle = 'to request 1 EBK'
            this.postTitle = 'from faucet'
          } else {
            this.emTitle = `to call ${name}`
          }
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

.status-bar-whitelisted {
  display: flex;
  flex-direction: row;
  flex-wrap: nowrap;
  justify-content: stretch;
  align-content: stretch;
  align-items: stretch;
  padding-right: 0;
  max-width: $wallet-opened-width;
}

.popup {
  flex-wrap: wrap;
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

  .info {
    margin-right: 0;
  }

  .cancel {
    padding-top: 10px;
    padding-bottom: 6px;
  }
}

.info {
  flex: 1 1 auto;
  align-self: auto;
  margin-right: 16px;
  max-width: 262px;
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
}

h2 .caution {
  color: #fd315f;
}

h3 {
  font-size: 0.7em;
  letter-spacing: 0.3px;
  opacity: 0.7;
}

.cancel {
  display: block;
  flex: 1 1 auto;
  align-self: center;
  width: auto;
  height: 100%;
  margin: auto 0;
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

@media only screen and (max-width: 353px) {
  .status-bar-whitelisted {
    flex-wrap: wrap;
  }

  .info {
    flex-basis: 100%;
    margin-right: 0;
    max-width: auto;
  }

  button {
    padding-top: 10px;
    padding-bottom: 6px;
  }
}
</style>

<template>
  <div class="stake scroll-wrapper">
    <div class="wrapper">
      <h2>Stake some EBK to proceed with voting</h2>

      <div
        class="slider-container"
        :data-staked="newStakedAmount.toFixed(4)"
        :data-liquid="newLiquidAmount"
      >
        <input
          type="range"
          class="slider"
          min="0"
          :max="maxStakeAmount"
          step="0.0001"
          :value="newStakedAmount"
          @input="setNewStakedAmount($event)"
        />
      </div>

      <hr />

      <section v-if="claimableEntries.length > 0" class="unstaking">
        <header class="header">
          <h4>Unstaking</h4>
          <span
            >{{ claimableEntries.length }} out of {{ MaxUnstakedEntries }}</span
          >
        </header>

        <ul>
          <li
            v-for="(entry, index) in claimableEntries"
            :key="index"
            class="unstaking-entry"
          >
            <div class="unstaking-info">
              <span class="unstaking-amount"> {{ entry.amount }} EBK </span>
              <span class="unstaking-remaining-time">
                {{ entry.remainingTime }}
              </span>

              <div class="progress-bar">
                <div
                  class="state"
                  :style="{
                    width: getRemainingTimeProgressWidth(entry.timestamp) + '%',
                  }"
                ></div>
              </div>
            </div>
          </li>
        </ul>

        <button
          v-if="hasClaimable"
          class="full cta"
          @click="claimUnstakedAmount"
        >
          Claim Unstaked
        </button>
        <hr v-if="hasClaimable" />
      </section>

      <span v-if="error != ''" class="text-error">{{ error }}</span>

      <button v-if="hasStakeChanged" class="full cta" @click="setStake">
        Set Stake <span v-if="isVotingCall"> and Vote</span>
      </button>
      <button v-if="hasStakeChanged" class="full" @click="discardChanges">
        Cancel
      </button>

      <h3>
        To vote for block producers and to improve performance while using the
        ebakus network you can temporarily reserve some of your ebakus tokens.
        Adjust your balance utilization above. Staked tokens take 3 Days to
        unstake and become liquid again. There are 5 concurent unstaking slots.
      </h3>
    </div>
  </div>
</template>

<script>
import Vue from 'vue'
import { mapState } from 'vuex'

import floor from 'lodash/floor'

import {
  stake,
  unstake,
  getClaimableEntries,
  claimUnstaked,
  isVotingCall,
  hasStakeForVotingCall,
} from '@/actions/systemContract'
import { addPendingTx, estimateGas, calcWork } from '@/actions/transactions'
import { performWhitelistedAction } from '@/actions/whitelist'
import { exitDialog } from '@/actions/wallet'

import MutationTypes from '@/store/mutation-types'
import { loadedInIframe } from '@/parentFrameMessenger/parentFrameMessenger'

import { RouteNames } from '@/router'

const MAX_UNSTAKED_ENTRIES = 5
const UNSTAKE_PERIOD = 60 * 60 * 24 * 3 // 3 days
const CLAIMABLE_LABEL = 'claimable'

const timeLeft = UNIX_timestamp => {
  const now = new Date()
  const ttime = new Date(UNIX_timestamp * 1000)
  const diff = ttime - now

  const divideBy = { w: 604800000, d: 86400000, h: 3600000, m: 60000, s: 1000 }

  if (diff <= 0) {
    return CLAIMABLE_LABEL
  }

  let out = ''

  const days = Math.floor(diff / divideBy.d)
  if (days > 0) {
    out += `${days} days`
  }

  const hours = Math.floor(diff / divideBy.h) % 24
  if (hours > 0) {
    out += ` ${hours} hours`
  }

  const minutes = Math.floor(diff / divideBy.m) % 60
  if (days == 0 && minutes > 0) {
    out += ` ${minutes} min`
    if (minutes > 1) out += 's'
  }

  const seconds = Math.floor(diff / divideBy.s) % 60
  if (days == 0 && hours == 0 && minutes == 0 && seconds > 0) {
    out += ` 1 min` // ` ${seconds} secs`
  }

  return `${out} left`
}

export default {
  data() {
    return {
      newStakedAmount: this.$store.state.wallet.staked,
      newLiquidAmount: Vue.options.filters.toEtherFixed(
        this.$store.state.wallet.balance
      ),
      claimableEntriesStorage: [],
      hasClaimable: false,
      error: '',
    }
  },
  computed: {
    MaxUnstakedEntries: () => MAX_UNSTAKED_ENTRIES,
    ...mapState({
      balance: state => Vue.options.filters.toEtherFixed(state.wallet.balance),
      staked: state => state.wallet.staked,
    }),
    claimableEntries: function() {
      let hasClaimable = false
      const entries = this.claimableEntriesStorage.map(entry => {
        const remainingTime = timeLeft(entry.timestamp)
        if (remainingTime === CLAIMABLE_LABEL) {
          hasClaimable = true
        }

        return {
          ...entry,
          remainingTime,
        }
      })

      this.$set(this, 'hasClaimable', hasClaimable)

      return entries
    },
    maxStakeAmount: function() {
      const claimable = this.claimableEntriesStorage.reduce(
        (acc, entry) => acc + entry.amount,
        0
      )
      return (
        parseFloat(this.staked) +
        parseFloat(this.balance) +
        parseFloat(claimable)
      )
    },
    hasStakeChanged: function() {
      return this.staked != this.newStakedAmount
    },
    isVotingCall: () => isVotingCall(),
  },
  watch: {
    balance: async function(val, oldVal) {
      if (val !== oldVal) {
        this.$set(this, 'newLiquidAmount', val) // computed balance has converted the val to ether already

        await this.getClaimable()
      }
    },
    staked: function(val, oldVal) {
      if (val !== oldVal) {
        this.$set(this, 'newStakedAmount', val)
        setTimeout(() => {
          this.$set(
            this,
            'newLiquidAmount',
            floor(this.maxStakeAmount - val, 4).toFixed(4)
          )
        }, 0)
      }
    },
  },
  mounted() {
    this.$store.commit(MutationTypes.SHOW_DIALOG, {
      title: 'Attention',
    })
    this.$store.commit(MutationTypes.SET_OVERLAY_COLOR, 'black')

    this.getClaimable()
  },
  beforeDestroy() {
    this.$store.commit(MutationTypes.UNSET_OVERLAY_COLOR)
  },
  methods: {
    getRemainingTimeProgressWidth: function(UNIX_timestamp) {
      const now = new Date()
      const ttime = new Date(UNIX_timestamp * 1000)
      const diff = ttime - now

      if (diff <= 0) {
        return 0
      }

      return (Math.floor(diff / 1000) / UNSTAKE_PERIOD) * 100
    },
    setStake: async function() {
      if (this.newStakedAmount > this.staked) {
        try {
          if (loadedInIframe() && isVotingCall() && !hasStakeForVotingCall()) {
            const upstreamTx = { ...this.$store.state.tx.object }
            const upstreamJobId = this.$store.state.tx.jobId

            this.$store.dispatch(MutationTypes.SET_TX_JOB_ID, null)

            this.$store.dispatch(MutationTypes.UNSET_OVERLAY_COLOR)

            await stake(floor(this.newStakedAmount - this.staked, 4))

            exitDialog()
            this.$router.push({ name: RouteNames.HOME }, () => {})

            this.$store.dispatch(MutationTypes.SET_TX_JOB_ID, upstreamJobId)
            const pendingTx = await addPendingTx(upstreamTx)

            // remove gas, workNonce and recalculate
            const votePendingTx = { ...pendingTx }
            delete votePendingTx.gas
            delete votePendingTx.workNonce

            const txWithGas = await estimateGas(votePendingTx)

            calcWork({ ...txWithGas, gas: txWithGas.gas + 5000 })

            performWhitelistedAction()
          } else {
            await stake(floor(this.newStakedAmount - this.staked, 4))
          }
        } catch (err) {
          console.error('Failed to set new stake amount: ', err)
          this.error = 'Failed to set new stake amount.'
        }
      } else {
        if (this.claimableEntries.length >= MAX_UNSTAKED_ENTRIES) {
          this.error =
            'Your are not allowed to have more than 5 unstaking entries.'
          return
        }

        try {
          await unstake(floor(this.staked - this.newStakedAmount, 4))
        } catch (err) {
          console.error('Failed to set unstake amount: ', err)
          this.error = 'Failed to set unstake amount.'
        }
      }

      this.getClaimable()
    },
    discardChanges: function() {
      this.newLiquidAmount = this.balance
      this.newStakedAmount = this.staked

      this.error = ''
    },
    claimUnstakedAmount: async function() {
      await claimUnstaked()

      this.error = ''
    },
    setNewStakedAmount: function({ target: { valueAsNumber } }) {
      this.newLiquidAmount = floor(
        this.maxStakeAmount - valueAsNumber,
        4
      ).toFixed(4)

      this.newStakedAmount = valueAsNumber

      this.error = ''
    },
    getClaimable: async function() {
      try {
        const entries = await getClaimableEntries()
        this.claimableEntriesStorage = entries
      } catch (err) {
        console.error('Failed to get claimable entries: ', err)
        this.error = 'Failed to get claimable entries'
      }
    },
  },
}
</script>

<style scoped lang="scss">
@import '../assets/css/_variables';

$button-width: 10px;

h2 {
  margin-bottom: 12px;
}

hr {
  width: 110%;
  margin: 10px 0 10px -5%;
  border: 0;
  border-top: 1px solid #d8d8d8;
}

.unstaking {
  .header {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;

    h4 {
      margin: 0 auto 0 0;
      font-size: 10px;
      font-weight: 500;
      color: #677a86;
    }

    span {
      font-size: 10px;
      color: #dbdbdb;
    }
  }

  ul {
    margin-bottom: 24px;
    padding: 0;
    list-style: none;
  }
}

.unstaking-entry {
  display: flex;
  flex-direction: row;
  justify-content: center;
  align-items: center;

  margin-bottom: 12px;
  padding: 6px 10px;

  border-radius: 4px;
  border: solid 1px #edeaea;
}

.unstaking-info {
  display: flex;
  flex-direction: row;
  flex-wrap: wrap;

  width: calc(100% - #{$button-width});
}

.unstaking-amount {
  margin-right: auto;
  font-size: 12px;
  font-weight: 500;
  color: #112f42;
}

.unstaking-remaining-time {
  font-size: 10px;
  font-weight: 600;
  color: #677a86;
}

.progress-bar {
  width: 100%;
  margin-top: 8px;

  &,
  .state {
    height: 3px;
    border-radius: 1em;
    background: #d8d8d8;
  }

  .state {
    background: rgba(0, 0, 0, 0.6);
  }
}

.unstaking-cancel {
  width: $button-width;
  margin: 0;
  margin-left: $status-bar-padding;

  color: transparent;
  text-decoration: none;

  background-image: url(../assets/img/ic_exit.png);
  background-repeat: no-repeat;
  background-size: $button-width;
  background-position: center center;
  filter: brightness(0.7);
}

.slider-container {
  position: relative;
  width: 100%; /* Full-width */
  margin: 60px 0px 45px 0px;

  &::before {
    // display: block;
    position: absolute;
    font-size: 12px;
    content: attr(data-staked) ' ebakus staked  \A'attr(data-liquid) ' ebakus liquid';
    white-space: pre; /* or pre-wrap */
    width: 100%;
    text-align: center;
    top: -45px;
    background-image: url(../assets/img/ic_fast.png),
      url(../assets/img/ic_slow.png);
    background-repeat: no-repeat;
    background-size: 32px, 32px;
    background-position: top right, top left;
    height: 30px;
    color: #000;
  }

  &::after {
    position: absolute;
    top: 32px;
    left: 0;
    content: 'Liquidity                                                      Performance';
    font-size: 10px;
    font-weight: 600;
    white-space: pre;
    opacity: 0.7;
  }
}

.slider {
  position: relative;
  width: 100%; /* Full-width */
  height: 11px; /* Specified height */
  background: rgb(212, 212, 212); /* Grey background */
  outline: none; /* Remove outline */
  opacity: 0.7; /* Set transparency (for mouse-over effects on hover) */
  transition: opacity 0.2s;
  border-radius: 20px;
  --range: calc(var(--max) - var(--min));
  --ratio: calc((var(--val) - var(--min)) / var(--range));
  --sx: calc(0.5 * 1.5em + var(--ratio) * (100% - 1.5em));

  -webkit-appearance: none;
  appearance: none;

  /* The slider handle (use -webkit- (Chrome, Opera, Safari, Edge) and -moz- (Firefox) to override default look) */
  &::-webkit-slider-thumb {
    appearance: none;
    width: 27px; /* Set a specific slider handle width */
    height: 27px; /* Slider handle height */
    cursor: pointer; /* Cursor on hover */
    background: #fcfcfc;
    box-shadow: 0 1px 8px 0 rgba(0, 0, 0, 0.28),
      inset 0 1px 3px 0 rgba(255, 255, 255, 0.5);
    border-radius: 100%;
    border: 1px solid transparent;
  }

  &::-moz-range-thumb {
    width: 27px; /* Set a specific slider handle width */
    height: 27px; /* Slider handle height */
    cursor: pointer; /* Cursor on hover */
    background: #fcfcfc;
    box-shadow: 0 1px 4px 0 rgba(0, 0, 0, 0.28),
      inset 0 1px 3px 0 rgba(255, 255, 255, 0.5);
    border-radius: 100%;
    border: 1px solid transparent;
  }
}
</style>

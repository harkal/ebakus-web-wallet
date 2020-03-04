<template>
  <div class="stake scroll-wrapper">
    <div class="wrapper">
      <section>
        <h2>Total Balance</h2>
        <div class="balance">
          <p class="amount f-number">
            {{ totalBalance.toFixed(4) }}
          </p>
          <p><span v-if="network.isTestnet">t</span>{{ tokenSymbol }}</p>
        </div>

        <div class="progressBar">
          <div
            class="progress liquidBg"
            :style="{ width: liquidProgressWidthPercent }"
          />
          <div
            class="progress stakedBg"
            :style="{ width: stakedProgressWidthPercent }"
          />
          <div
            class="progress unstakingBg"
            :style="{ width: unstakingProgressWidthPercent }"
          />
        </div>

        <dl class="teardown">
          <dt class="liquid">Liquid</dt>
          <dd>{{ (balance || '0') | toEtherFixed }} EBK</dd>
          <dt class="staked">Staked</dt>
          <dd>{{ staked.toFixed(4) }} EBK</dd>
          <dt class="unstaking">Unstaking</dt>
          <dd>{{ unstaking.toFixed(4) }} EBK</dd>
        </dl>
      </section>

      <section class="stakingSection">
        <h2>Change Stake</h2>
        <p class="info">
          Adjust stake for high liquidity OR performance and voting power.
        </p>

        <label for="amount">Amount (EBK)</label>
        <input
          id="amount"
          v-model.number="amount"
          type="number"
          :min="0"
          :max="totalBalance"
          :placeholder="0"
        />

        <p v-if="error != ''" class="text-error">{{ error }}</p>

        <button class="cta" :disabled="onFlightTx" @click="stakeAmount">
          Stake <span v-if="isVotingCall"> and Vote</span>
        </button>

        <button :disabled="onFlightTx" @click="unstakeAmount">
          Unstake
        </button>
      </section>

      <section v-if="claimableEntries.length > 0" class="unstakingSection">
        <h2>Unstaking slots</h2>
        <header class="header">
          <h4>Claimable in…</h4>
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
              <span class="unstaking-amount">
                {{ entry.amount.toFixed(4) }} EBK
              </span>
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

        <p class="note">
          Staked tokens take 3 Days to unstake and become liquid again. There
          are 5 concurent unstaking slots.
        </p>

        <button
          v-if="hasClaimable"
          class="full cta"
          @click="claimUnstakedAmount"
        >
          Claim
        </button>
      </section>
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex'

import {
  stake,
  unstake,
  getClaimableEntries,
  claimUnstaked,
  isVotingCall,
  hasStakeForVotingCall,
  getUnstakingAmount,
} from '@/actions/systemContract'
import Transaction, { TransactionUIError } from '@/actions/Transaction'
import { performWhitelistedAction } from '@/actions/whitelist'
import { exitDialog } from '@/actions/wallet'
import { web3 } from '@/actions/web3ebakus'

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
      amount: null,
      claimableEntriesStorage: [],
      hasClaimable: false,
      onFlightTx: false,
      error: '',
    }
  },
  computed: {
    MaxUnstakedEntries: () => MAX_UNSTAKED_ENTRIES,
    ...mapGetters(['network']),
    ...mapState({
      balance: state => state.wallet.balance,
      tokenSymbol: state => state.wallet.tokenSymbol,
      staked: state => state.wallet.staked,
      unstaking: state => state.wallet.unstaking,
      claimable: state => state.wallet.claimable,
      tx: state => state.tx,
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
    totalBalance: function() {
      let total = 0

      if (this.balance !== null) {
        total += parseFloat(web3.utils.fromWei(this.balance))
      }

      if (this.staked) {
        total += parseFloat(this.staked)
      }

      if (this.unstaking) {
        total += parseFloat(this.unstaking)
      }

      return total
    },
    liquidProgressWidthPercent: function() {
      let width = 0
      if (this.balance !== null) {
        width = parseFloat(web3.utils.fromWei(this.balance)) / this.totalBalance
      }
      return `${width * 100}%`
    },
    stakedProgressWidthPercent: function() {
      let width = 0
      if (this.staked) {
        width = parseFloat(this.staked) / this.totalBalance
      }
      return `${width * 100}%`
    },
    unstakingProgressWidthPercent: function() {
      let width = 0
      if (this.unstaking) {
        width = parseFloat(this.unstaking) / this.totalBalance
      }
      return `${width * 100}%`
    },
    isVotingCall: () => isVotingCall(),
  },
  watch: {
    tx(val) {
      if (val === null) {
        const self = this
        // timeout is here for UX, allowing user to read the error message
        setTimeout(() => {
          self.error = ''
        }, 4000)
      }
    },
    balance: async function(val, oldVal) {
      if (val !== oldVal) {
        await this.getClaimable()
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
    stakeAmount: async function() {
      const amount = this.amount
      if (
        isNaN(amount) ||
        amount < 0 ||
        amount > this.totalBalance - this.staked
      ) {
        this.error = 'Please set a valid amount to be staked.'
        return
      }

      this.onFlightTx = true
      this.error = ''

      try {
        if (loadedInIframe() && isVotingCall() && !hasStakeForVotingCall()) {
          const upstreamTx = this.$store.state.tx
          const upstreamTxId = upstreamTx.id
          const upstreamTxObject = { ...upstreamTx.object }
          // remove nonce, gas, workNonce so as we recalculate
          delete upstreamTxObject.nonce
          delete upstreamTxObject.gas
          delete upstreamTxObject.workNonce

          this.$store.dispatch(MutationTypes.CLEAR_TX)

          this.$store.dispatch(MutationTypes.UNSET_OVERLAY_COLOR)

          await stake(amount)

          exitDialog()
          this.$router.push({ name: RouteNames.HOME }, () => {})

          try {
            await new Transaction(upstreamTxObject, {
              id: upstreamTxId,
              extraGas: 5000,
            })

            performWhitelistedAction()
          } catch (err) {
            console.warn('Failed to handle vote: ', err)
            if (err instanceof TransactionUIError) {
              this.error = err.message
            } else {
              this.error = 'Failed to send vote transaction.'
            }
          }
        } else {
          await stake(amount)
        }
      } catch (err) {
        console.warn('Failed to set new stake amount: ', err)
        if (err instanceof TransactionUIError) {
          this.error = err.message
        } else {
          this.error = 'Failed to set new stake amount.'
        }
      }

      this.amount = null
      this.onFlightTx = false

      this.getClaimable()
      getUnstakingAmount()
    },
    unstakeAmount: async function() {
      const amount = this.amount
      if (isNaN(amount) || amount < 0 || amount > this.staked) {
        this.error = 'Please set a valid amount to be unstaked.'
        return
      }

      this.onFlightTx = true
      this.error = ''

      if (this.claimableEntries.length >= MAX_UNSTAKED_ENTRIES) {
        this.error =
          'Your are not allowed to have more than 5 unstaking entries.'
        this.onFlightTx = false
        return
      }

      try {
        await unstake(amount)
      } catch (err) {
        console.warn('Failed to set unstake amount: ', err)
        if (err instanceof TransactionUIError) {
          this.error = err.message
        } else {
          this.error = 'Failed to set unstake amount.'
        }
      }

      this.amount = null
      this.onFlightTx = false

      this.getClaimable()
      getUnstakingAmount()
    },
    claimUnstakedAmount: async function() {
      await claimUnstaked()
      getUnstakingAmount()

      this.error = ''
    },
    getClaimable: async function() {
      try {
        const entries = await getClaimableEntries()
        this.claimableEntriesStorage = entries
      } catch (err) {
        console.warn('Failed to get claimable entries: ', err)
        if (err instanceof TransactionUIError) {
          this.error = err.message
        } else {
          this.error = 'Failed to get claimable entries'
        }
      }
    },
  },
}
</script>

<style scoped lang="scss">
@import '../assets/css/_variables';

$button-width: 10px;

$liquid-color: #1da1f2;
$staked-color: #fe4184;
$unstaking-color: #fec841;

.liquidBg {
  background-color: $liquid-color;
}
.stakedBg {
  background-color: $staked-color;
}
.unstakingBg {
  background-color: $unstaking-color;
}

h2 {
  margin: 0 auto;
  font-size: 12px;
  font-weight: 600;
  text-align: center;
  color: #112f42;
}

.balance {
  text-align: center;
  white-space: nowrap;

  .amount {
    font-size: 26px;
    font-weight: 600;
  }

  span,
  p {
    margin: 0;
    font-size: 11px;
  }
}

.progressBar {
  width: 100%;
  height: 9px;
  margin: 18px auto;
  border-radius: 5px;
  overflow: hidden;

  .progress {
    float: left;
    height: 100%;
  }
}

.teardown {
  dt,
  dd {
    display: inline-block;
    width: 50%;
    margin: 8px 0;
    vertical-align: middle;
    font-size: 15px;
    font-weight: 600;
  }

  dt {
    font-size: 14px;

    &::before {
      content: '';
      display: inline-block;
      height: 9px;
      width: 9px;
      margin-right: 10px;
      border-radius: 50%;
    }

    &.liquid::before {
      background-color: $liquid-color;
    }

    &.staked::before {
      background-color: $staked-color;
    }

    &.unstaking::before {
      background-color: $unstaking-color;
    }
  }

  dd {
    text-align: right;
  }
}

.stakingSection {
  margin-left: -39px;
  margin-right: -39px;
  padding: 20px 39px;
  background-color: #eaf3f9;

  p.info {
    font-size: 14px;
    font-weight: 300;
    color: #576b76;
  }

  label {
    font-weight: 600;
  }

  button {
    width: 48%;
    margin-top: 4px;
    margin-bottom: 4px;

    &.cta {
      margin-right: 4%;
    }
  }
}

.unstakingSection {
  padding: 20px 0;

  .header {
    display: flex;
    flex-direction: row;
    justify-content: center;
    align-items: center;

    font-size: 12px;
    font-weight: 600;

    h4 {
      margin: 0 auto 0 0;
      color: #677a86;
      font-size: inherit;
    }

    span {
      color: #dbdbdb;
    }
  }

  ul {
    margin: 8px auto;
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
  font-weight: 600;
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

.note {
  font-size: 14px;
  font-weight: 300;
}
</style>

<template>
  <div class="ledger dialog scroll-wrapper">
    <div class="wrapper">
      <img src="@/assets/img/ledger-logo.svg" width="97" alt="Ledger" />

      <div v-if="supportedConnectionTypes.length > 0">
        <div
          v-if="supportedConnectionTypes.length > 0"
          class="dropdown-wrapper"
        >
          <select
            v-model="connectionType"
            class="dropdown"
            @change="connectLedger"
          >
            <option value="">Select connection method</option>
            <option
              v-for="key in supportedConnectionTypes"
              :key="key"
              :value="key"
            >
              {{ LedgerConnectionTypes[key] }}
            </option>
          </select>
        </div>

        <span v-if="error != ''" class="text-error">{{ error }}</span>

        <div v-if="accounts.length > 0" class="select-account">
          <h3>
            Choose the account you want to import from below:
          </h3>

          <ul class="accounts">
            <li v-for="(account, idx) in accounts" :key="account">
              <input
                :id="idx"
                v-model="selectedAccount"
                type="radio"
                :value="account"
              />
              <label :for="idx">{{ account }}</label>
            </li>
          </ul>

          <button class="full" @click="setAccount">
            Next
          </button>
        </div>
      </div>
      <div v-else>
        <h3>
          Unfortunately the Ledger hardware wallet is not being supported in
          this browser at this time. Please try again using Chrome browser.
        </h3>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'

import { SpinnerState } from '@/constants'

import { getBalance } from '@/actions/wallet'
import {
  LedgerConnectionTypes,
  setLedgerProvider,
} from '@/actions/providers/ledger'
import { web3 } from '@/actions/web3ebakus'
import { performWhitelistedAction } from '@/actions/whitelist'

import { RouteNames } from '@/router'
import MutationTypes from '@/store/mutation-types'

import { loadedInIframe } from '@/parentFrameMessenger/parentFrameMessenger'

export default {
  data() {
    return {
      connectionType: '',
      accounts: [],
      selectedAccount: '',
      error: '',
    }
  },
  computed: {
    ...mapState({
      isDrawerActiveByUser: state => state.ui.isDrawerActiveByUser,
      tx: state => state.tx.object,
      supportedConnectionTypes: state =>
        state.network.hardwareWallets.ledger.supportedConnectionTypes,
    }),
    LedgerConnectionTypes: () => LedgerConnectionTypes,
  },
  watch: {
    error: function(val, oldVal) {
      if (val !== oldVal && val) {
        this.connectionType = ''
      }
    },
  },
  mounted() {
    this.$store.commit(
      MutationTypes.SET_SPINNER_STATE,
      SpinnerState.LEDGER_CONNECT
    )
  },
  methods: {
    connectLedger: async function() {
      if (!this.supportedConnectionTypes.includes(this.connectionType)) {
        this.error = 'Please select a valid connection type.'
        this.$store.commit(MutationTypes.SET_SPINNER_STATE, SpinnerState.NONE)
        return
      }

      this.accounts = []
      this.selectedAccount = ''
      this.error = ''

      try {
        await setLedgerProvider(this.connectionType)

        this.$store.commit(
          MutationTypes.SET_SPINNER_STATE,
          SpinnerState.LEDGER_FETCH_ACCOUNTS
        )

        const accounts = await web3.eth.getAccounts()

        if (accounts.length === 0) {
          throw new Error('No accounts found on Ledger')
        }

        this.accounts = accounts.map(account =>
          web3.utils.toChecksumAddress(account)
        )
      } catch (err) {
        console.error(
          `Connecting to ledger using ${this.connectionType} failed with error`,
          err
        )

        this.error =
          'Failed to connect to Ledger device. Please check that it is unlocked and the Ethereum app is opened.'
      } finally {
        this.$store.commit(MutationTypes.SET_SPINNER_STATE, SpinnerState.NONE)
      }
    },
    setAccount: async function() {
      if (!this.selectedAccount || this.selectedAccount === '') {
        this.error = `The account selected "${this.selectedAccount}" is not available, please check your ledger.`
        return
      }

      if (this.accounts && this.accounts.includes(this.selectedAccount)) {
        this.$store.dispatch(
          MutationTypes.SET_WALLET_ADDRESS,
          this.selectedAccount
        )

        const accountIndex = this.accounts.findIndex(this.selectedAccount)
        if (accountIndex >= 0) {
          this.$store.commit(
            MutationTypes.SET_HARDWARE_WALLET_TYPE_ACCOUNT_INDEX,
            accountIndex
          )
        }
      }

      this.$store.dispatch(MutationTypes.CLEAR_DIALOG)
      this.$router.push({ name: RouteNames.HOME }, () => {})

      if (loadedInIframe()) {
        // just in order we are sure that balance has been fetched for connected account
        try {
          await getBalance()
        } catch (err) {
          console.error('Failed to fetch balance for Ledger account', err)
        }

        const { to, value, data } = this.tx
        if (to || value || data) {
          performWhitelistedAction()
        } else if (!this.isDrawerActiveByUser) {
          this.$store.dispatch(MutationTypes.DEACTIVATE_DRAWER)
        }
      }
    },
  },
}
</script>

<style scoped lang="scss">
.wrapper {
  padding-top: 30px;
}

h3 {
  margin-top: 30px;
}

.accounts {
  margin-left: -39px;
  margin-right: -39px;
  padding: 5px 15px;

  list-style: none;

  background-color: #f7f9fd;

  li {
    margin: 10px 0;
    white-space: nowrap;
  }

  label {
    margin-left: 4px;
    font-size: 11px;
  }
}
</style>

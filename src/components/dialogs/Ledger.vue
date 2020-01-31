<template>
  <div class="ledger dialog scroll-wrapper">
    <div class="wrapper">
      <img src="@/assets/img/ledger-logo.svg" width="97" alt="Ledger" />

      <div v-if="supportedConnectionTypes.length > 0" class="dropdown-wrapper">
        <select
          v-model="connectionType"
          class="dropdown"
          @change="connectLedger"
        >
          <option value="">Select connection method</option>
          <option
            v-for="key in supportedConnectionTypes"
            :key="key"
            :value="LedgerConnectionTypes[type]"
          >
            {{ type }}
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
  </div>
</template>

<script>
import { mapState } from 'vuex'

import {
  LedgerConnectionTypes,
  setLedgerProvider,
} from '@/actions/providers/ledger'
import { web3 } from '@/actions/web3ebakus'

import { RouteNames } from '@/router'
import MutationTypes from '@/store/mutation-types'

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
      tx: state => state.tx.object,
      supportedConnectionTypes: state =>
        state.network.ledger.supportedConnectionTypes,
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

  methods: {
    connectLedger: async function() {
      if (
        !Object.values(this.supportedConnectionTypes).includes(
          this.connectionType
        )
      ) {
        this.error = 'Please select a valid connection type.'
        return
      }

      this.accounts = []
      this.selectedAccount = ''
      this.error = ''

      try {
        await setLedgerProvider(this.connectionType)

        const accounts = await web3.eth.getAccounts()
        this.accounts = accounts
      } catch (err) {
        console.error(
          `Connecting to ledger using ${this.connectionType} failed with error`,
          err
        )

        this.error =
          'Failed to connect to Ledger device. Please check that it is unlocked and the Ethereum app is opened.'
      }
    },
    setAccount: async function() {
      if (!this.selectedAccount || this.selectedAccount === '') {
        this.error = `The account selected "${this.selectedAccount}" is not available, please check your ledger`
        return
      }

      if (this.accounts && this.accounts.includes(this.selectedAccount)) {
        this.$store.dispatch(
          MutationTypes.SET_WALLET_ADDRESS,
          this.selectedAccount
        )
        this.$store.dispatch(MutationTypes.UNLOCK_WALLET)
      }

      this.$store.dispatch(MutationTypes.CLEAR_DIALOG)
      this.$router.push({ name: RouteNames.HOME }, () => {})
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

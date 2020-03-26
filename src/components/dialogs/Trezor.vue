<template>
  <div class="trezor dialog scroll-wrapper">
    <div class="wrapper">
      <div>
        <img src="@/assets/img/trezor-logo.svg" width="97" alt="Trezor" />

        <div v-if="isSupportedBrowser">
          <p v-if="error != ''" class="text-error">{{ error }}</p>
          <h3 v-else-if="accounts.length == 0">
            Fetching accounts...
          </h3>

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
            Unfortunately the Trezor hardware wallet is not being supported in
            this browser at this time. Please try again using Chrome browser.
          </h3>
        </div>
      </div>
      <div v-if="isSupportedBrowser">
        <hr />
        <h3>
          Trezor might ask you to open a popup once or twice, for handling your
          account and signing a transaction.
        </h3>
      </div>
    </div>
  </div>
</template>

<script>
import Web3 from 'web3'
import { mapState, mapGetters } from 'vuex'

import { SpinnerState } from '@/constants'

import { getBalance, signOutWallet } from '@/actions/wallet'
import { setTrezorProvider } from '@/actions/providers/trezor'
import { web3 } from '@/actions/web3ebakus'
import { performWhitelistedAction } from '@/actions/whitelist'

import { RouteNames } from '@/router'
import MutationTypes from '@/store/mutation-types'

import { loadedInIframe } from '@/parentFrameMessenger/parentFrameMessenger'
import { isSafari } from '../../utils'

export default {
  data() {
    return {
      accounts: [],
      selectedAccount: '',
      error: '',
    }
  },
  computed: {
    ...mapGetters(['txObject']),
    ...mapState({
      isDrawerActiveByUser: state => state.ui.isDrawerActiveByUser,
      publicAddress: state => state.wallet.address,
    }),
    isSupportedBrowser: () => !isSafari,
  },
  watch: {
    error: function(val, oldVal) {
      if (val !== oldVal && val) {
        this.connectionType = ''
      }
    },
  },
  mounted() {
    if (!this.isSupportedBrowser) {
      return
    }

    this.$store.commit(
      MutationTypes.SET_SPINNER_STATE,
      SpinnerState.TREZOR_CONNECT
    )

    this.connectTrezor()
  },
  beforeDestroy() {
    if (
      this.isSupportedBrowser &&
      this.selectedAccount !== this.publicAddress
    ) {
      signOutWallet()
    }
  },
  methods: {
    connectTrezor: async function() {
      this.accounts = []
      this.selectedAccount = ''
      this.error = ''

      try {
        await setTrezorProvider()

        this.$store.commit(
          MutationTypes.SET_SPINNER_STATE,
          SpinnerState.TREZOR_FETCH_ACCOUNTS
        )

        const accounts = await web3.eth.getAccounts()

        if (accounts.length === 0) {
          throw new Error('No accounts found on Trezor')
        }

        this.accounts = accounts.map(account =>
          Web3.utils.toChecksumAddress(account)
        )
      } catch (err) {
        console.error(`Connecting to trezor failed with error`, err)

        this.error =
          'Failed to connect to Trezor device. Please check that it is unlocked.'
      } finally {
        this.$store.commit(MutationTypes.SET_SPINNER_STATE, SpinnerState.NONE)
      }
    },
    setAccount: async function() {
      if (!this.selectedAccount || this.selectedAccount === '') {
        this.error = `The account selected "${this.selectedAccount}" is not available, please check your trezor.`
        return
      }

      if (this.accounts && this.accounts.includes(this.selectedAccount)) {
        this.$store.dispatch(
          MutationTypes.SET_WALLET_ADDRESS,
          this.selectedAccount
        )

        const accountIndex = this.accounts.findIndex(
          acct => acct === this.selectedAccount
        )
        if (accountIndex >= 0) {
          this.$store.commit(
            MutationTypes.SET_HARDWARE_WALLET_ACCOUNT_INDEX,
            accountIndex
          )
        }

        this.$store.commit(MutationTypes.ADD_LOCAL_LOG, {
          title: 'Account loaded',
          address: this.selectedAccount,
          local: true,
        })
      }

      this.$store.dispatch(MutationTypes.CLEAR_DIALOG)
      this.$router.push({ name: RouteNames.HOME }, () => {})

      if (loadedInIframe()) {
        // just in order we are sure that balance has been fetched for connected account
        try {
          await getBalance()
        } catch (err) {
          console.error('Failed to fetch balance for Trezor account', err)
        }

        const { to, value, data } = this.txObject
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
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  justify-content: space-between;
  align-content: stretch;

  height: calc(
    (var(--vh, 1vh) * 100) - (var(--status-bar-vh, 1vh) * 100)
  ); /* --vh is set at App.vue and --status-bar-vh at Status.vue */

  padding-top: 30px;

  > div {
    flex: 0 1 auto;
  }
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

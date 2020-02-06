<template>
  <div class="onboarding">
    <ul class="onboarding_progress">
      <li :class="{ active: activePane == Panes.CREATE }">Create</li>
      <li :class="{ active: activePane == Panes.SECURE }">Secure</li>
      <li :class="{ active: activePane == Panes.BACKUP }">Backup</li>
      <li :class="{ active: activePane == Panes.FINISH }">Finish</li>
    </ul>

    <div class="scroll-wrapper">
      <div class="pane create" :class="{ display: activePane == Panes.CREATE }">
        <div class="wrapper">
          <div>
            <h1>Hello!</h1>
            <h2>Let's start by securing your account</h2>
            <button class="full" @click="requestNewPassword">Next</button>
          </div>
          <div>
            <h3>
              Additional options
            </h3>
            <router-link
              :to="{
                name: RouteNames.IMPORT,
                query: { redirectFrom: RouteNames.NEW },
              }"
              class="full outline"
              tag="button"
            >
              Import wallet backup
            </router-link>
            <button class="full outline ledger" @click="connectWithLedger">
              Connect with Ledger
            </button>
          </div>
        </div>
      </div>
      <div class="pane secure" :class="{ display: activePane == Panes.SECURE }">
        <div class="wrapper">
          <h3>
            Your password will be used to encrypt your keys for this wallet. We
            only store your keys localy.
          </h3>
          <label for="password"> Password </label>
          <Password
            v-if="isDrawerActive"
            ref="pass"
            :value="pass"
            @input="pass = $event"
            @onEnter="secureWallet"
          />
          <span v-if="error" class="text-error">{{ error }}</span>
          <button class="full" @click="secureWallet">Next</button>
        </div>
      </div>
      <div class="pane backup" :class="{ display: activePane == Panes.BACKUP }">
        <div class="wrapper">
          <Backup type="mnemonic" :mnemonic="mnemonic" />
          <button class="secondary col" @click="requestNewPassword">
            Back
          </button>
          <button class="col" @click="finish">Next</button>
        </div>
      </div>
      <div class="pane finish" :class="{ display: activePane == Panes.FINISH }">
        <div class="wrapper">
          <h1>All done!</h1>
          <h2>Your account is set up!</h2>
        </div>
      </div>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'

import {
  generateWallet,
  secureWallet as secureWalletFunc,
} from '@/actions/wallet'
import {
  isContractCall,
  isContractCallWhitelisted,
  showWhitelistNewDappView,
} from '@/actions/whitelist'

import { SpinnerState, DialogComponents } from '@/constants'

import { loadedInIframe } from '@/parentFrameMessenger/parentFrameMessenger'

import MutationTypes from '@/store/mutation-types'

import { RouteNames } from '@/router'

import Password from '@/components/elements/Password'
import Backup from './Backup'

const Panes = {
  CREATE: 'CREATE',
  SECURE: 'SECURE',
  BACKUP: 'BACKUP',
  FINISH: 'FINISH',
}

export default {
  components: { Backup, Password },
  data: function() {
    return {
      activePane: Panes.CREATE,
      pass: '',
      mnemonic: null,
      error: '',
    }
  },
  computed: {
    Panes: () => Panes,
    ...mapState({
      isDrawerActive: state => state.ui.isDrawerActive,
      publicAddress: state => state.wallet.address,
      dialogComponent: state => state.ui.dialog.component,
    }),
    RouteNames: () => RouteNames,
    visible() {
      return this.isDrawerActive && this.$route.name == RouteNames.NEW
    },
  },
  watch: {
    isDrawerActive: function() {
      this.activePane = Panes.CREATE
      this.pass = ''
      this.mnemonic = null
      this.error = ''
    },
  },
  async mounted() {
    this.$store.commit(MutationTypes.SHOW_DIALOG)
  },
  beforeDestroy() {
    if (this.dialogComponent === '') {
      this.$store.commit(MutationTypes.CLEAR_DIALOG)
    }
  },
  methods: {
    requestNewPassword: function() {
      this.activePane = Panes.SECURE
    },

    secureWallet: async function() {
      try {
        const mnemonic = await generateWallet()
        console.log('New Wallet Created', this.publicAddress)
        if (mnemonic) {
          this.mnemonic = mnemonic.split(' ')
        }
      } catch (err) {
        console.log('Failed to create new wallet', err)
      }

      this.$store.dispatch(
        MutationTypes.SET_SPINNER_STATE,
        SpinnerState.WALLET_ENCRYPT
      )
      try {
        await secureWalletFunc(this.pass)
        this.$store.dispatch(
          MutationTypes.SET_SPINNER_STATE,
          SpinnerState.SUCCESS
        )

        this.error = ''

        this.activePane = Panes.BACKUP
      } catch (err) {
        this.error = err
        console.error('Secure imported wallet failed with err: ', err)
      }
    },

    finish: function() {
      const self = this

      self.activePane = Panes.FINISH

      setTimeout(() => {
        self.$router.push({ name: RouteNames.HOME })

        const pendingTx = self.$store.state.tx.object
        if (
          loadedInIframe() &&
          (pendingTx.to || pendingTx.value || pendingTx.data)
        ) {
          if (isContractCall() && !isContractCallWhitelisted()) {
            showWhitelistNewDappView()
          } else {
            self.$store.dispatch(MutationTypes.SHOW_DIALOG, {
              component: DialogComponents.SEND_TX,
              title: 'Send Confirmation',
            })
          }
          return
        }
      }, 1200)
    },

    connectWithLedger: function() {
      this.$store.commit(MutationTypes.SHOW_DIALOG, {
        component: DialogComponents.LEDGER,
        title: 'Connect with Ledger',
      })
    },
  },
}
</script>

<style scoped lang="scss">
.onboarding_progress {
  position: relative;
  top: -13px;

  padding: 20px 12px 20px 12px;

  list-style: none;

  background: #fff;
  color: #969696;
  border-bottom: 1px solid #eaeaea;

  li {
    display: inline-block;
    position: relative;
    margin: 0px 9px;
    padding: 0px;

    text-align: center;
    font-size: 17px;
    font-weight: 300;

    &.active {
      color: #000000;
      font-weight: 400;
      visibility: visible;

      &:before {
        content: '';
        display: block;
        position: absolute;
        top: -26px;
        left: 50%;
        width: 12px;
        height: 12px;

        background: rgb(10, 17, 31);
        transform: rotate(45deg) translateX(-50%);
      }
    }
  }
}

.pane {
  position: relative;
  display: none;
  -webkit-overflow-scrolling: touch;

  &.display {
    display: block;
  }

  &.create h3 {
    padding-top: 50px;
    opacity: 0.7;
  }

  @media only screen and (max-width: 600px) {
    padding-bottom: 200px;
  }
}

.pane.create .wrapper {
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  justify-content: space-between;
  align-content: stretch;
  // align-items: center;

  height: calc(
    (var(--vh, 1vh) * 100) - (var(--status-bar-vh, 1vh) * 100) - 94px
  ); /* --vh is set at App.vue and --status-bar-vh at Status.vue */

  > div {
    flex: 0 1 auto;

    &:nth-child(2) {
      h3 {
        padding-top: 0;
      }
    }
  }
}

.finish {
  div.wrapper {
    opacity: 1;
  }

  .active div.wrapper {
    transition: opacity 0.5s ease-out;
    transition-delay: 2.5s;
    opacity: 0;
  }
}
</style>

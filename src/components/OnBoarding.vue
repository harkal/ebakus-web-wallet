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
          <h1>Hello!</h1>
          <h2>Let's start by securing your account</h2>
          <button class="full" @click="requestNewPassword">Next</button>

          <h3>
            Already have an account? <br />
            <router-link :to="{ name: RouteNames.IMPORT }">
              Click here to import it
            </router-link>
          </h3>
        </div>
      </div>
      <div class="pane secure" :class="{ display: activePane == Panes.SECURE }">
        <div class="wrapper">
          <h3>
            Your password will be used to encrypt your keys for this wallet. We
            only store your keys localy.
          </h3>
          <label for="password"> Password </label>
          <input
            ref="passField"
            v-model="pass"
            type="password"
            name="password"
            placeholder
            @keyup.enter="secureWallet"
          />
          <button class="full" @click="secureWallet">Next</button>
        </div>
      </div>
      <div
        v-if="mnemonic"
        class="pane backup"
        :class="{ display: activePane == Panes.BACKUP }"
      >
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
  loadConfirmTxMsg,
} from '@/actions/wallet'
import {
  isContractCall,
  isContractCallWhitelisted,
  showWhitelistNewDappView,
} from '@/actions/whitelist'

import { SpinnerState } from '@/constants'

import { loadedInIframe } from '@/parentFrameMessenger/parentFrameMessenger'

import MutationTypes from '@/store/mutation-types'

import { RouteNames } from '@/router'

import Backup from './Backup'

const Panes = {
  CREATE: 'CREATE',
  SECURE: 'SECURE',
  BACKUP: 'BACKUP',
  FINISH: 'FINISH',
}

export default {
  components: { Backup },
  data: function() {
    return {
      activePane: Panes.CREATE,
      pass: '',
      mnemonic: null,
    }
  },
  computed: {
    Panes: () => Panes,
    ...mapState({
      isDrawerActive: state => state.ui.isDrawerActive,
      isLocked: state => state.wallet.locked,
      publicAddress: state => state.wallet.address,
    }),
    RouteNames: () => RouteNames,
    visible() {
      return this.isDrawerActive && this.$route.name == RouteNames.NEW
    },
  },
  watch: {
    isDrawerActive: function() {
      this.activePane = Panes.CREATE
    },
  },
  mounted() {
    const self = this

    this.$store.commit(MutationTypes.SHOW_DIALOG)

    if (this.publicAddress === null && this.isLocked) {
      generateWallet()
        .then(mnemonic => {
          console.log('New Wallet Created', this.publicAddress)
          if (mnemonic) {
            self.mnemonic = mnemonic.split(' ')
          }
        })
        .catch(err => {
          console.log('Failed to create new wallet', err)
        })
    }
  },
  beforeDestroy() {
    this.$store.commit(MutationTypes.CLEAR_DIALOG)
  },
  methods: {
    requestNewPassword: function() {
      this.activePane = Panes.SECURE
    },

    secureWallet: async function() {
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
      } catch (err) {
        console.error('Secure imported wallet failed with err: ', err)
        // TODO: show error state to user

        this.$store.dispatch(MutationTypes.SET_SPINNER_STATE, SpinnerState.FAIL)
      }

      this.activePane = Panes.BACKUP
    },

    finish: function() {
      const self = this

      this.activePane = Panes.FINISH

      setTimeout(() => {
        const pendingTx = self.$store.state.tx.object
        if (
          loadedInIframe() &&
          (pendingTx.to || pendingTx.value || pendingTx.data)
        ) {
          if (isContractCall() && !isContractCallWhitelisted()) {
            showWhitelistNewDappView()
          } else {
            loadConfirmTxMsg(pendingTx)
          }
          return
        }

        self.$router.push({ name: RouteNames.HOME })
      }, 1200)
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

.scroll-wrapper {
  > div {
    padding-top: 20px;
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

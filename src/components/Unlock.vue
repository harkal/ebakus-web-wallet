<template>
  <div class="wrapper scroll-wrapper unlock">
    <div>
      <label for="password">Password</label>

      <Password
        ref="pass"
        :value="pass"
        @input="pass = $event"
        @onEnter="unlockWallet"
      />
      <span class="text-error">{{ error }}</span>
      <button class="full" @click="unlockWallet">Unlock</button>
    </div>
    <div>
      <h3>
        Additional options
      </h3>
      <button
        class="full outline in-button-icon ledger"
        @click="connectWithLedger"
      >
        Connect with Ledger
      </button>
      <button
        class="full outline in-button-icon trezor"
        @click="connectWithTrezor"
      >
        Connect with Trezor
      </button>
      <button class="full outline" @click="deleteWallet">
        Delete this wallet
      </button>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'

import Transaction from '@/actions/Transaction'
import { unlockWallet as unlockWalletFunc } from '@/actions/wallet'
import { performWhitelistedAction } from '@/actions/whitelist'

import { SpinnerState, DialogComponents } from '@/constants'

import { RouteNames } from '@/router'

import MutationTypes from '@/store/mutation-types'

import { loadedInIframe } from '@/parentFrameMessenger/parentFrameMessenger'

import Password from '@/components/elements/Password'

export default {
  components: { Password },
  data: function() {
    return {
      pass: '',
      error: '',
    }
  },
  computed: {
    ...mapState({
      isDrawerActive: state => state.ui.isDrawerActive,
      isDrawerActiveByUser: state => state.ui.isDrawerActiveByUser,
      dialogComponent: state => state.ui.dialog.component,
      txObject: state => {
        const tx = state.tx
        return tx instanceof Transaction ? state.tx.object : {}
      },
    }),
    visible() {
      return this.isDrawerActive
    },
  },
  watch: {
    visible: function(isVisible) {
      if (isVisible && this.$refs.pass) {
        this.$refs.pass.$refs.pass.focus()
      }
    },
  },
  mounted() {
    this.$store.commit(MutationTypes.SHOW_DIALOG)
  },
  beforeDestroy() {
    if (this.dialogComponent === '') {
      this.$store.commit(MutationTypes.CLEAR_DIALOG)
    }
  },
  methods: {
    unlockWallet: function() {
      const self = this
      const pass = this.pass

      this.$store.commit(
        MutationTypes.SET_SPINNER_STATE,
        SpinnerState.WALLET_UNLOCK
      )

      unlockWalletFunc(pass)
        .then(() => {
          // store.commit('setPass', pass)
          self.$store.dispatch(
            MutationTypes.SET_SPINNER_STATE,
            SpinnerState.SUCCESS
          )

          const redirectFrom = this.$route.query.redirectFrom || RouteNames.HOME
          this.$router.push({ name: redirectFrom }, () => {})

          if (loadedInIframe()) {
            const { to, value, data } = self.txObject
            if (to || value || data) {
              performWhitelistedAction()
            } else if (!self.isDrawerActiveByUser) {
              self.$store.dispatch(MutationTypes.DEACTIVATE_DRAWER)
            }
          }
        })
        .catch(function(err) {
          console.log('unlockWallet err: ', err)

          self.$store.dispatch(
            MutationTypes.SET_SPINNER_STATE,
            SpinnerState.FAIL
          )

          self.error = 'Wrong Password, please try again.'
          if (self.$refs.pass) {
            self.$refs.pass.$refs.pass.focus()
          }
        })
    },
    connectWithLedger: function() {
      this.$store.commit(MutationTypes.SHOW_DIALOG, {
        component: DialogComponents.LEDGER,
        title: 'Connect with Ledger',
      })
    },
    connectWithTrezor: function() {
      this.$store.commit(MutationTypes.SHOW_DIALOG, {
        component: DialogComponents.TREZOR,
        title: 'Connect with Trezor',
      })
    },
    deleteWallet: function() {
      this.$store.commit(MutationTypes.SHOW_DIALOG, {
        component: DialogComponents.DELETE_WALLET,
        title: 'Delete wallet',
      })
    },
  },
}
</script>

<style scoped lang="scss">
.unlock {
  display: flex;
  flex-direction: column;
  flex-wrap: nowrap;
  justify-content: space-between;
  align-content: stretch;
  // align-items: center;

  height: calc(
    (var(--vh, 1vh) * 100) - (var(--status-bar-vh, 1vh) * 100)
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
</style>

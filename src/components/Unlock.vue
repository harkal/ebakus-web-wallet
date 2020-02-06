<template>
  <div class="wrapper scroll-wrapper unlock">
    <div>
      <label for="password">Password</label>
      <div class="field-container">
        <input
          ref="passField"
          v-model="pass"
          :type="revealPass ? 'text' : 'password'"
          name="password"
          placeholder
          @keyup.enter="unlockWallet"
        />
        <img
          v-show="!revealPass"
          src="@/assets/img/ic_pass_reveal.svg"
          width="14"
          @click="togglePass"
        />
        <img
          v-show="revealPass"
          src="@/assets/img/ic_pass_hide.svg"
          width="14"
          @click="togglePass"
        />
      </div>
      <span class="text-error">{{ error }}</span>
      <button class="full" @click="unlockWallet">Unlock</button>
    </div>
    <div>
      <h3>
        Additional options
      </h3>
      <button class="full outline ledger" @click="connectWithLedger">
        Connect with Ledger
      </button>
      <button class="full outline" @click="deleteWallet">
        Delete this wallet
      </button>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'

import { unlockWallet as unlockWalletFunc } from '@/actions/wallet'
import { performWhitelistedAction } from '@/actions/whitelist'

import { SpinnerState, DialogComponents } from '@/constants'

import { RouteNames } from '@/router'

import MutationTypes from '@/store/mutation-types'

import { loadedInIframe } from '@/parentFrameMessenger/parentFrameMessenger'

export default {
  data: function() {
    return {
      pass: '',
      error: '',
      revealPass: false,
    }
  },
  computed: {
    ...mapState({
      isDrawerActive: state => state.ui.isDrawerActive,
      isDrawerActiveByUser: state => state.ui.isDrawerActiveByUser,
      dialogComponent: state => state.ui.dialog.component,
      tx: state => state.tx.object,
    }),
    visible() {
      return this.isDrawerActive
    },
  },
  watch: {
    visible: function(isVisible) {
      if (isVisible && this.$refs.passField) {
        this.$refs.passField.focus()
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
    togglePass: function() {
      this.revealPass = !this.revealPass
    },
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
            const { to, value, data } = self.tx
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
          if (self.$refs.passField) {
            self.$refs.passField.focus()
          }
        })
    },
    connectWithLedger: function() {
      this.$store.commit(MutationTypes.SHOW_DIALOG, {
        component: DialogComponents.LEDGER,
        title: 'Connect with Ledger',
      })
    },
    deleteWallet: function() {
      this.$store.commit(MutationTypes.SHOW_DIALOG, {
        component: DialogComponents.DELETE_WALLET,
        title: 'Delete wallet',
        data: {
          forgotPassword: true,
        },
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

.field-container {
  position: relative;

  img {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    z-index: 1;
    opacity: 0.65;
  }
}
</style>

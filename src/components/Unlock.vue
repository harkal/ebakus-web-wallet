<template>
  <div class="wrapper">
    <label for="password">Password</label>
    <input
      ref="passField"
      v-model="pass"
      type="password"
      name="password"
      placeholder
      @keyup.enter="unlockWallet"
    />
    <span class="text-error">{{ error }}</span>
    <button class="full" @click="unlockWallet">Unlock</button>
  </div>
</template>

<script>
import { mapState } from 'vuex'

import { unlockWallet as unlockWalletFunc } from '@/actions/wallet'
import { performWhitelistedAction } from '@/actions/whitelist'

import { SpinnerState } from '@/constants'

import { RouteNames } from '@/router'

import MutationTypes from '@/store/mutation-types'

import { loadedInIframe } from '@/parentFrameMessenger/parentFrameMessenger'

export default {
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
  },
}
</script>

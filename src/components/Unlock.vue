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
import { performWhitelistedAction } from '@/actions/whitelist'
import { SpinnerState } from '@/constants'
import MutationTypes from '@/store/mutation-types'
import store from '@/store'
import { unlockWallet as unlockWalletFunc, exitPopUP } from '@/actions/wallet'
import {
  loadedInIframe,
  shrinkFrameInParentWindow,
} from '@/parentFrameMessenger/parentFrameMessenger'

export default {
  data: function() {
    return {
      pass: '',
      error: '',
    }
  },
  computed: {
    visible() {
      return this.$store.state.isDrawerActive
    },
  },
  watch: {
    visible: function(isVisible) {
      if (isVisible && this.$refs.passField) {
        this.$refs.passField.focus()
      }
    },
  },
  methods: {
    unlockWallet: function() {
      const self = this
      const pass = this.pass

      store.commit(MutationTypes.SET_SPINNER_STATE, SpinnerState.WALLET_UNLOCK)

      unlockWalletFunc(pass)
        .then(() => {
          // store.commit('setPass', pass)
          store.dispatch(MutationTypes.SET_SPINNER_STATE, SpinnerState.SUCCESS)

          const pendingTx = self.$store.state.tx.object
          if (
            loadedInIframe() &&
            (pendingTx.to || pendingTx.value || pendingTx.data)
          ) {
            exitPopUP()
            performWhitelistedAction()
          } else {
            exitPopUP()

            if (loadedInIframe() && !store.getters.isDrawerActiveByUser) {
              store.dispatch(MutationTypes.DEACTIVATE_DRAWER)
              shrinkFrameInParentWindow()
            }
          }
        })
        .catch(function(err) {
          console.log('unlockWallet err: ', err)

          store.dispatch(MutationTypes.SET_SPINNER_STATE, SpinnerState.FAIL)

          self.error = 'Wrong Password, please try again.'
          if (self.$refs.passField) {
            self.$refs.passField.focus()
          }
        })
    },
  },
}
</script>

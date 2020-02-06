<template>
  <div class="delete-wallet scroll-wrapper">
    <div class="wrapper">
      <h2>You are about to delete your wallet</h2>
      <h3 class="warning">
        This action is irreversible. Please do not procceed without a backup.
      </h3>

      <h3 v-if="!forgotPassword">
        Please first enter your existing wallet password so as we verify it is
        yours.
      </h3>
      <input
        v-if="!forgotPassword"
        ref="pass"
        v-model="pass"
        type="password"
        name="password"
        placeholder="enter old wallet password"
        @keyup.enter="deleteWallet"
      />
      <span class="text-error">{{ error }}</span>

      <button class="full warning" @click="deleteWallet">Delete Wallet</button>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'

import {
  unlockWallet,
  deleteWallet as deleteWalletFunc,
} from '@/actions/wallet'

import MutationTypes from '@/store/mutation-types'

import { RouteNames } from '@/router'

export default {
  data() {
    return {
      pass: '',
      error: '',
    }
  },
  computed: {
    ...mapState({
      forgotPassword: state => {
        const { data } = state.ui.dialog
        const { forgotPassword = false } = data || {}
        return forgotPassword
      },
    }),
  },
  mounted: function() {
    this.$store.commit(MutationTypes.SET_OVERLAY_COLOR, 'red')
  },
  beforeDestroy: function() {
    this.$store.commit(MutationTypes.UNSET_OVERLAY_COLOR)
  },
  methods: {
    deleteWallet: async function() {
      if (!this.forgotPassword) {
        try {
          await unlockWallet(this.pass)
        } catch (err) {
          this.error = 'Wrong Password, please try again.'
          if (this.$refs.pass) {
            this.$refs.pass.focus()
          }
          return
        }
      }

      const keepWalletData = this.forgotPassword
      deleteWalletFunc(keepWalletData)

      this.$store.dispatch(MutationTypes.CLEAR_DIALOG)
      this.$router.push({ name: RouteNames.NEW }, () => {})
    },
  },
}
</script>

<style scoped>
.warning {
  color: #fd315f;
}

button.warning {
  background-color: #fd315f;
  color: #fff;
}
</style>

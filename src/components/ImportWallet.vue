<template>
  <div class="import-wallet">
    <div class="wrapper">
      <template v-if="componentState === ComponentStates.REQUEST_KEY">
        <h2>Use your seed phrase to import your wallet</h2>
        <h3>
          Beware by importing a wallet your current wallet will be replaced, do
          not proceed without backuping your previous wallet first.
        </h3>

        <span class="import-method">
          <input
            v-model="useMnemonics"
            name="import-method-input"
            class="import-method-input"
            type="checkbox"
            @change="handleMethodChange($event)"
          />
          <label for="import-method-input"></label>
        </span>

        <div v-if="!!useMnemonics">
          <input
            v-for="(word, index) in mnemonicPlaceholder"
            :key="index"
            ref="index"
            v-model.trim="seed[index]"
            class="col seed"
            type="text"
            name="index"
            :placeholder="word"
            @keydown.space="
              $event.target.nextElementSibling.focus()
              $event.preventDefault()
            "
            @keyup.enter="askUserToConfirm"
          />
        </div>
        <input
          v-else
          v-model.trim="sk"
          type="text"
          name="sk"
          placeholder="enter your private key"
          @keyup.enter="askUserToConfirm"
        />

        <button class="full" @click="askUserToConfirm">Next</button>
      </template>

      <template v-else-if="componentState === ComponentStates.CONFIRM">
        <h2>
          If you proceed with importing you will lose your previous wallet. Are
          you sure you want to proceed?
        </h2>
        <h3 v-if="hasWallet">
          Please first enter your existing wallet password so as we verify it is
          yours.
        </h3>
        <input
          v-if="hasWallet"
          ref="passField"
          v-model="pass"
          type="password"
          name="password"
          placeholder="enter old wallet password"
          @keyup.enter="confirmImport"
        />
        <span v-if="error" class="text-error">{{ error }}</span>

        <button class="secondary col" @click="cancelImport">
          Cancel
        </button>
        <button class="cta col" @click="confirmImport">Import</button>
      </template>

      <template v-else-if="componentState === ComponentStates.SECURE">
        <h3>
          Your password for the new imported wallet will be used to encrypt your
          keys for this wallet. We only store your keys localy.
        </h3>
        <input
          ref="passField"
          v-model="pass"
          type="password"
          name="password"
          placeholder="set wallet password"
          @keyup.enter="secureWallet"
        />
        <span v-if="error" class="text-error">{{ error }}</span>
        <button class="full" @click="secureWallet">Finish</button>
      </template>
    </div>
  </div>
</template>

<script>
import {
  hasWallet as hasWalletFunc,
  unlockWallet,
  importWallet,
  secureWallet as secureWalletFunc,
} from '@/actions/wallet'
import { SpinnerState } from '@/constants'
import MutationTypes from '@/store/mutation-types'

import { RouteNames } from '@/router'

const ComponentStates = {
  REQUEST_KEY: 'REQUEST_KEY',
  CONFIRM: 'CONFIRM',
  SECURE: 'SECURE',
}

export default {
  data() {
    return {
      componentState: ComponentStates.REQUEST_KEY,
      useMnemonics: true,
      seed: [],
      sk: '',
      pass: '',
      error: '',
    }
  },
  computed: {
    ComponentStates: () => ComponentStates,
    mnemonicPlaceholder: () =>
      [...Array(12)].map((val, idx) => `word ${idx + 1}`),
    hasWallet: () => hasWalletFunc(),
  },

  mounted() {
    this.$store.commit(MutationTypes.SHOW_DIALOG, {
      title: 'Import Wallet',
    })
    this.$store.commit(MutationTypes.SET_OVERLAY_COLOR, 'black')
  },
  beforeDestroy() {
    this.$store.commit(MutationTypes.CLEAR_DIALOG)
    this.$store.commit(MutationTypes.UNSET_OVERLAY_COLOR)
  },
  methods: {
    askUserToConfirm: function() {
      this.componentState = ComponentStates.CONFIRM
    },
    cancelImport: function() {
      this.componentState = ComponentStates.REQUEST_KEY
    },
    confirmImport: async function() {
      this.$store.dispatch(
        MutationTypes.SET_SPINNER_STATE,
        SpinnerState.WALLET_IMPORT
      )

      if (hasWalletFunc()) {
        const pass = this.pass

        try {
          await unlockWallet(pass)
        } catch (err) {
          console.error('Old account wrong pass', err)

          this.error = 'Wrong Password, please try again.'
          if (this.$refs.passField) {
            this.$refs.passField.focus()
          }

          this.$store.dispatch(
            MutationTypes.SET_SPINNER_STATE,
            SpinnerState.NONE
          )
          return
        }
      }

      try {
        const importedAccountAddress = await importWallet(this.seed)

        console.log('New Wallet imported', importedAccountAddress)

        this.$store.dispatch(
          MutationTypes.SET_SPINNER_STATE,
          SpinnerState.SUCCESS
        )

        this.$store.dispatch(MutationTypes.SHOW_DIALOG, {
          title: 'Set Password',
        })

        this.pass = ''
        this.error = ''
        this.componentState = ComponentStates.SECURE
      } catch (err) {
        console.error('New account import failed', err)

        this.$store.dispatch(MutationTypes.SET_SPINNER_STATE, SpinnerState.NONE)
      }
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

        this.$router.push({ name: RouteNames.HOME }, () => {})
      } catch (err) {
        console.error('Secure imported wallet failed with err: ', err)

        this.error = err
      }
    },
    handleMethodChange: function(e) {
      this.useMnemonics = e.target.checked
    },
  },
}
</script>

<style scoped lang="scss">
.col.seed {
  width: 47.5%;

  &:nth-child(odd) {
    margin-right: 5%;
  }
}

.import-method {
  position: relative;
  display: inline-flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  width: 242px;
  height: 50px;
  border-radius: 4px;

  label {
    z-index: 1;
    position: absolute;
    top: 10px;
    bottom: 10px;
    margin-top: 0;
    background: #1e1e1e;
    border-radius: 4px;
  }
}

.import-method-input {
  position: relative;
  width: 100%;
  height: 50px;
  border-radius: 4px;
  background-color: #eaeaea;
  outline: none;
  appearance: none;
  font-size: 13px;
  transition: 0.25s -0.1s;

  &:before,
  &:after {
    z-index: 2;
    position: absolute;
    top: 50%;
    transform: translateY(-50%);
    color: #666;
  }

  &:before {
    content: 'Mnemonics';
    left: 20px;
  }

  &:after {
    content: 'Private key';
    right: 20px;
  }

  &:checked {
    transition: color 0.5s;

    &:before {
      color: #fff;
      transition-delay: 0.2s;
    }

    + label {
      left: 8px;
      right: 140px;
      transition: left 0.5s, right 0.4s 0.2s;
    }
  }

  &:not(:checked) {
    &:after {
      color: #fff;
      transition-delay: 0.2s;
    }

    + label {
      left: 140px;
      right: 8px;
      transition: left 0.4s 0.2s, right 0.5s, background 0.35s -0.1s;
    }
  }
}
</style>

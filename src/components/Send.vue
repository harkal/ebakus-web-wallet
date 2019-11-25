<template>
  <div class="send scroll-wrapper">
    <div class="wrapper">
      <label for="amount"> Amount </label>
      <input
        v-model="inputs.amount"
        type="number"
        name="amount"
        step="any"
        placeholder="0.0"
        @keyup.enter="addPendingTx"
      />

      <div class="dropdown-wrapper">
        <select
          v-model="inputs.token"
          class="dropdown"
          @change="onTokenChange()"
        >
          <option value="EBK" :selected="inputs.amount == 'EBK'"
            >{{ network.isTestnet ? 'testnet - ' : '' }}ebakus ({{
              tokenSymbolPrefix
            }}EBK)</option
          >
          <option
            v-for="(tokenObj, index) in tokens"
            :key="index"
            :value="tokenObj.symbol"
          >
            {{ tokenObj.symbol }}
          </option>
        </select>
      </div>

      <div class="address-wrapper">
        <label for="address"> To (Address) </label>
        <input
          v-model="inputs.address"
          type="text"
          name="address"
          placeholder="i.e. 0xfbb1b73c4f0bda4f67dca266ce6ef42f520fbb98"
          @keyup.enter="addPendingTx"
        />

        <label class="qrcode-text-btn">
          <input
            type="file"
            accept="image/*"
            capture="environment"
            @change="scanQR"
          />
        </label>
      </div>

      <span class="text-error"> {{ error }} </span>

      <button class="full" @click="addPendingTx">Send</button>
    </div>
  </div>
</template>

<script>
import { mapGetters, mapState } from 'vuex'

import QR from '@/assets/vendor/qr_lib/qr_packed'

import { addPendingTx as addPendingTxToStore } from '@/actions/transactions'
import { getTokenInfoForSymbol, getTransferTxForToken } from '@/actions/tokens'
import { web3 } from '@/actions/web3ebakus'

import { DefaultToken, DialogComponents } from '@/constants'

import MutationTypes from '@/store/mutation-types'

import { RouteNames } from '@/router'

export default {
  data() {
    return {
      inputs: {
        amount: '',
        token: DefaultToken,
        address: '',
      },
      error: '',
      receiver: '',
    }
  },
  computed: {
    ...mapGetters(['network']),
    ...mapState({
      isDrawerActive: state => state.ui.isDrawerActive,
      tokens: state => state.tokens,
      tokenSymbol: state => state.wallet.tokenSymbol,
      tx: state => state.tx.object,
    }),
    tokenSymbolPrefix: function() {
      return this.network.isTestnet ? 't' : ''
    },
    visible: function() {
      return this.isDrawerActive && this.$route.name === RouteNames.SEND
    },
  },
  watch: {
    visible: function() {
      if (!this.visible) {
        this.revertToDefaultToken()
      }
    },
  },
  mounted() {
    const pendingTx = this.tx
    const data = {
      amount: '',
      token: DefaultToken,
      address: '',
      ...pendingTx,
    }

    if (data.amount) {
      data.amount = web3.utils.fromWei(String(data.amount))
    }

    this.$set(this, 'inputs', data)
  },
  destroyed() {
    this.revertToDefaultToken()
  },
  methods: {
    scanQR: function(node) {
      const self = this
      const reader = new FileReader()
      reader.onload = function() {
        node.value = ''
        QR.qrcode.callback = function(res) {
          if (res instanceof Error) {
            alert(
              "No QR code found. Please make sure the QR code is within the camera's frame and try again."
            )
          } else {
            self.$set(self.inputs, 'address', res)
          }
        }
        QR.qrcode.decode(reader.result)
      }
      reader.readAsDataURL(node.target.files[0])
    },
    validateSendForm: function() {
      const { address, amount } = this.inputs
      if (typeof address === 'undefined' || address == '') {
        this.error = 'Please enter a valid ebakus address.'
        return false
      }
      try {
        this.receiver = web3.utils.toChecksumAddress(address)
      } catch (err) {
        this.error = "Receiver's address is not a valid ebakus address."
        return false
      }

      if (amount == '') {
        this.$set(this.inputs, 'amount', 0)
      } else if (parseFloat(amount) < 0) {
        this.error = 'Amount of tokens to send cannot be negative'
        return false
      }
      return true
    },

    addPendingTx: async function() {
      if (this.validateSendForm()) {
        const { amount, token } = this.inputs
        const receiver = this.receiver

        let tx
        const tokenInfo = getTokenInfoForSymbol(token)
        if (tokenInfo) {
          tx = getTransferTxForToken(tokenInfo, receiver, amount)
        } else {
          const value = web3.utils.toWei(String(amount))
          tx = {
            to: receiver,
            value,
          }
        }

        await addPendingTxToStore(tx)

        this.$store.dispatch(MutationTypes.SHOW_DIALOG, {
          component: DialogComponents.SEND_TX,
          title: 'Send Confirmation',
        })
      }
    },
    onTokenChange() {
      const { token } = this.inputs
      this.$store.commit(MutationTypes.SET_WALLET_BALANCE, '0')
      this.$store.commit(MutationTypes.SET_ACTIVE_TOKEN, token)
    },
    revertToDefaultToken() {
      if (this.tokenSymbol !== DefaultToken) {
        this.$set(this.inputs, 'token', DefaultToken)
        this.$store.commit(MutationTypes.SET_WALLET_BALANCE, '0')
        this.$store.commit(MutationTypes.SET_ACTIVE_TOKEN, DefaultToken)
      }
    },
  },
}
</script>

<style scoped lang="scss">
.address-wrapper {
  position: relative;
}

.qrcode-text-btn {
  display: none;

  @media (pointer: none), (pointer: coarse) {
    display: block;
    height: 20px;
    width: 20px;
    background-color: #fff;
    background-image: url("data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' xmlns:xlink='http://www.w3.org/1999/xlink' fill='%23000000' version='1.1' x='0px' y='0px' viewBox='0 0 11 11' enable-background='new 0 0 11 11' xml:space='preserve'%3E%3Crect x='0' y='0' fill='%23000000' width='5' height='5'/%3E%3Crect x='6' y='0' fill='%23000000' width='5' height='5'/%3E%3Crect x='0' y='6' fill='%23000000' width='5' height='5'/%3E%3Crect x='1' y='1' fill='%23ffffff' width='3' height='3'/%3E%3Crect x='2' y='2' fill='%23000000' width='1' height='1'/%3E%3Crect x='7' y='1' fill='%23ffffff' width='3' height='3'/%3E%3Crect x='8' y='2' fill='%23000000' width='1' height='1'/%3E%3Crect x='1' y='7' fill='%23ffffff' width='3' height='3'/%3E%3Crect x='2' y='8' fill='%23000000' width='1' height='1'/%3E%3Crect x='6' y='6' fill='%23000000' width='1' height='1'/%3E%3Crect x='8' y='6' fill='%23000000' width='1' height='1'/%3E%3Crect x='10' y='6' fill='%23000000' width='1' height='1'/%3E%3Crect x='6' y='8' fill='%23000000' width='1' height='1'/%3E%3Crect x='8' y='8' fill='%23000000' width='1' height='1'/%3E%3Crect x='10' y='8' fill='%23000000' width='1' height='1'/%3E%3Crect x='6' y='10' fill='%23000000' width='1' height='1'/%3E%3Crect x='8' y='10' fill='%23000000' width='1' height='1'/%3E%3Crect x='10' y='10' fill='%23000000' width='1' height='1'/%3E%3Crect x='7' y='7' fill='%23000000' width='1' height='1'/%3E%3Crect x='9' y='7' fill='%23000000' width='1' height='1'/%3E%3Crect x='7' y='9' fill='%23000000' width='1' height='1'/%3E%3Crect x='9' y='9' fill='%23000000' width='1' height='1'/%3E%3C/svg%3E");
    background-size: 90%;
    background-repeat: no-repeat;
    cursor: pointer;
    position: absolute;

    right: 3px;
    top: 19px;
    border: 4px solid #fff;

    > input[type='file'] {
      position: absolute;
      overflow: hidden;
      width: 1px;
      height: 1px;
      opacity: 0;
    }
  }
}
</style>

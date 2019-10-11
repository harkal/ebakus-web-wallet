import { mapState } from 'vuex';
<template>
  <div id="backup">
    <h1>Account Backup</h1>
    <div v-if="type == 'mnemonic'">
      <h3>
        You can use this seed phrase to recover your account or import it to
        another device.
        <strong>Please write it down somewhere safe.</strong>
      </h3>
      <ol class="seed">
        <li v-for="(word, index) in mnemonic" :key="index">{{ word }}</li>
      </ol>
    </div>
    <div v-else>
      <h3>
        You can use this private key to recover your account or import it to
        another device.
        <strong>Please write it down somewhere safe.</strong>
      </h3>
      <h4 class="pk">{{ getPrivateKey }}</h4>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'

import { web3 } from '@/actions/web3ebakus'

export default {
  props: {
    type: {
      validator: function(value) {
        return ['mnemonic', 'privateKey'].indexOf(value) !== -1
      },
      default: 'privateKey',
    },
    mnemonic: {
      type: Array,
      default: () => [],
    },
  },
  computed: {
    ...mapState({
      publicAddress: state => state.wallet.address,
    }),
    getPrivateKey: function() {
      const wallet = web3.eth.accounts.wallet
      if (
        wallet &&
        this.publicAddress &&
        typeof wallet[this.publicAddress] !== 'undefined' &&
        typeof wallet[this.publicAddress].privateKey !== 'undefined'
      ) {
        return wallet[this.publicAddress].privateKey
      }
      return ''
    },
  },
}
</script>

<style scoped lang="scss">
.seed {
  width: 100%;
  margin: 20px 0px;
  padding-top: 25px;
  padding-bottom: 15px;
  padding-left: 20px;

  column-count: 2;
  column-gap: 10px;

  font-size: 14px;

  border: 1px solid #e9e9e9;
  border-radius: 10px;
  list-style: none;
  counter-reset: item;

  li {
    margin: 10px 0px;
    color: #fd315f;

    &:first-child {
      margin: 0px 0px;
    }

    &:before {
      content: counter(item) '. ';
      counter-increment: item;
      color: black;
    }
  }
}

.pk {
  padding: 16px;
  font-weight: 400;
  word-break: break-all;
  color: #aaa;
  background-color: #eee;
}
</style>

<template>
  <div class="send-tx dialog scroll-wrapper">
    <div class="wrapper">
      <h3>
        {{ preTitle }}
        <strong v-if="amountTitle != ''" class="caution">
          {{ amountTitle }}</strong
        >
        <strong v-if="emTitle != ''"> {{ emTitle }}</strong>
        <span v-if="postTitle != ''"> {{ postTitle }}</span>
      </h3>

      <dl v-if="data && typeof data === 'object'" class="input-data">
        <span v-for="(param, idx) in data" :key="idx" class="input-data">
          <dt>Name</dt>
          <dd>{{ param.name }}</dd>
          <dt>Type</dt>
          <dd>{{ param.type }}</dd>
          <dt>Value</dt>
          <dd>{{ param.value }}</dd>
          <hr v-if="data.length < idx + 1" />
        </span>
      </dl>

      <div v-else-if="data && typeof data === 'string'" class="input-data">
        <p>Input data:</p>
        <span class="input-data-raw">{{ data }}</span>
      </div>

      <input
        v-if="isWhitelistingAllowed"
        id="whitelist"
        v-model="whitelistSimilar"
        type="checkbox"
        class="checkbox"
      />
      <label v-if="isWhitelistingAllowed" for="whitelist"
        >Whitelist similar transactions</label
      >

      <WorkAdjustment is-single-tx />

      <button class="secondary col" @click="cancelPendingTx">Cancel</button>
      <button class="cta col" @click="confirmPendingTx">Send</button>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'

import {
  checkIfEnoughBalance,
  getTransactionMessage,
  calcWorkAndSendTx,
  cancelPendingTx as cancelPendingTxFunc,
} from '@/actions/transactions'
import { exitDialog } from '@/actions/wallet'
import {
  isContractCall,
  whitelistNewDapp as whitelistNewDappFunc,
} from '@/actions/whitelist'

import MutationTypes from '@/store/mutation-types'

import { RouteNames } from '@/router'

export default {
  data() {
    return {
      // content
      preTitle: '',
      amountTitle: '',
      emTitle: '',
      postTitle: '',
      to: '',
      data: {},

      whitelistSimilar: false,
    }
  },
  computed: {
    ...mapState({
      isDialog: state => state.ui.dialog.active,
      dialog: state => state.ui.dialog,
      tx: state => state.tx.object,
    }),
    isWhitelistingAllowed: function() {
      return isContractCall()
    },
  },
  mounted: async function() {
    if (!checkIfEnoughBalance()) {
      return
    }

    this.$store.commit(MutationTypes.SET_OVERLAY_COLOR, 'black')

    const {
      preTitle,
      amountTitle,
      emTitle,
      postTitle,
      to,
      data,
    } = await getTransactionMessage(this.tx)

    this.preTitle = preTitle
    this.amountTitle = amountTitle
    this.emTitle = emTitle
    this.postTitle = postTitle
    this.to = to
    this.data = data
  },
  methods: {
    confirmPendingTx: function() {
      if (this.whitelistSimilar) {
        whitelistNewDappFunc()
      }

      calcWorkAndSendTx(this.tx)

      console.log('Transaction Confirmed by user')

      exitDialog()
      this.$router.push({ name: RouteNames.HOME }, () => {})
    },
    cancelPendingTx: () => cancelPendingTxFunc(),
  },
}
</script>

<style scoped lang="scss">
.wrapper {
  word-break: break-word;
}

.input-data {
  font-size: 0.85em;
  font-weight: 300;

  dt {
    display: inline-block;
    width: 40px;
    margin-bottom: 10px;
    font-weight: 400;
    vertical-align: top;
  }
  dd {
    display: inline-block;
    width: 202px;
    margin-inline-start: 0;
    font-family: 'Courier New', Courier, monospace;
  }
  hr {
    opacity: 0.4;
  }
}

.input-data-raw {
  display: inline-block;
  max-height: 120px;
  overflow: auto;
  font-weight: 600;
  font-family: 'Courier New', Courier, monospace;
}
</style>

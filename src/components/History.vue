<template>
  <div class="history scroll-wrapper">
    <ul class="items">
      <li
        v-for="(transaction, index) in getSortedLogs"
        :key="index"
        :class="{
          local: transaction.local,
          failed: transaction.failed,
          pending: transaction.pending,
        }"
        class="bubble"
        @click="openInNewTab(transaction.txhash || transaction.address)"
      >
        <span class="title">{{ transaction.title }}</span>
        <span class="address">{{ transaction.address }}</span>
        <img
          v-if="transaction.failed"
          src="@/assets/img/ic_failed.svg"
          width="21"
          alt="Transaction failed"
        />
      </li>
    </ul>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex'

import { loadTxsInfoFromExplorer } from '@/actions/transactions'

import {
  loadedInIframe,
  openInNewTabInParentWindow,
} from '@/parentFrameMessenger/parentFrameMessenger'

export default {
  computed: {
    ...mapState({
      isDrawerActive: state => state.ui.isDrawerActive,
    }),
    ...mapGetters(['getSortedLogs', 'network']),
  },
  watch: {
    network(val, oldVal) {
      if (val.isTestnet !== oldVal.isTestnet) {
        loadTxsInfoFromExplorer()
      }
    },
  },
  mounted() {
    loadTxsInfoFromExplorer()
  },
  methods: {
    openInNewTab: function(address) {
      const isTestnet = this.network.isTestnet
      const explorerEndpoint = isTestnet
        ? process.env.TESTNET_EXPLORER_URL
        : process.env.MAINNET_EXPLORER_URL

      const href = explorerEndpoint + '/search/' + address

      if (loadedInIframe()) {
        openInNewTabInParentWindow(href)
      } else {
        Object.assign(document.createElement('a'), {
          target: '_blank',
          href,
        }).click()
      }
    },
  },
}
</script>

<style scoped lang="scss">
.history {
  padding: 15px 0;
}

.items {
  padding: 0;
  list-style: none;
}

.bubble {
  position: relative;
  background: #e6e6e6;
  color: #112f42;
  width: 82%;
  border-radius: 14px;
  padding: 10px 10px;
  margin: 15px 0px;
  margin-left: 18px;
  margin-right: auto;
  cursor: pointer;

  &:hover {
    background-color: darken(#e6e6e6, 10%);

    span.address {
      opacity: 0.9;
    }
  }

  img {
    position: absolute;
    right: -30px;
    top: 50%;
    transform: translateY(-50%);
  }

  &.local {
    background: #fd315f;
    color: #fff;
    text-align: right;
    margin-left: auto;
    margin-right: 18px;

    &:hover {
      background-color: darken(#fd315f, 5%);
    }

    img {
      left: -30px;
      right: auto;
    }
  }

  &.pending {
    opacity: 0.5;
  }

  &.failed {
    background-color: #525252;
    color: #fff;
  }

  span {
    display: block;
    font-family: sans-serif;
    line-height: 20px;

    &.title {
      font-size: 12px;
      font-weight: 600;
    }
    &.address {
      font-size: 10px;
      opacity: 0.7;
      font-weight: 600;
    }
  }
}
</style>

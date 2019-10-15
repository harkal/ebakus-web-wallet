<template>
  <div class="history scroll-wrapper">
    <div
      v-for="(transaction, index) in getSortedLogs"
      :key="index"
      :class="{ local: transaction.local }"
      class="bubble"
      @click="openInNewTab(transaction.txhash || transaction.address)"
    >
      <span>{{ transaction.title }}</span>
      <span> {{ transaction.address }} </span>
    </div>
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
    ...mapGetters(['getSortedLogs']),
  },
  // watch: { history() {} },
  mounted() {
    loadTxsInfoFromExplorer()
  },
  methods: {
    openInNewTab: function(address) {
      const href = process.env.EXPLORER_URL + '/search/' + address

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

.bubble {
  background: #e6e6e6;
  color: #112f42;
  width: 82%;
  border-radius: 14px;
  padding: 10px 10px;
  margin: 15px 0px;
  box-sizing: border-box;
  margin-left: 18px;
  margin-right: auto;
  cursor: pointer;

  &:hover {
    background-color: darken(#e6e6e6, 10%);

    span:last-child {
      opacity: 0.9;
    }
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
  }

  span {
    display: block;
    font-family: sans-serif;
    line-height: 20px;

    &:first-child {
      font-size: 12px;
      font-weight: 600;
    }
    &:last-child {
      font-size: 10px;
      opacity: 0.7;
      font-weight: 600;
    }
  }
}
</style>

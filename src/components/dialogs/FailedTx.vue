<template>
  <div class="failed-tx dialog scroll-wrapper">
    <div class="wrapper">
      <h2>
        Something went wrong!
      </h2>
      <h3>
        This transaction has failed.
      </h3>

      <a v-if="!showMoreInformation" src="" @click="toggleMoreInformation"
        >More information</a
      >
      <dl v-else-if="data && typeof data === 'object'" class="input-data">
        <span v-for="(param, idx) in data" :key="idx" class="input-data">
          <dt>{{ idx }}</dt>
          <dd>{{ param }}</dd>
          <hr />
        </span>
      </dl>

      <button class="full" @click="exit">OK</button>
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'

import { exitDialog } from '@/actions/wallet'

import { SpinnerState } from '@/constants'

import MutationTypes from '@/store/mutation-types'

export default {
  data() {
    return {
      showMoreInformation: false,
    }
  },
  computed: {
    ...mapState({
      tx: state => state.tx,
      data: state => state.ui.dialog.data,
    }),
  },
  mounted: async function() {
    this.$store.commit(MutationTypes.SET_OVERLAY_COLOR, 'red')
  },
  methods: {
    toggleMoreInformation: function() {
      this.showMoreInformation = !this.showMoreInformation
    },
    exit: function() {
      this.tx && this.tx.userCancelTx()

      this.$store.commit(MutationTypes.SET_SPINNER_STATE, SpinnerState.NONE)

      exitDialog()
    },
  },
}
</script>

<style scoped lang="scss">
@import '../../assets/css/_variables';

$dt-width: 70px;

.wrapper {
  word-break: break-word;
}

.input-data {
  font-size: 0.85em;
  font-weight: 300;

  dt {
    display: inline-block;
    width: $dt-width;
    margin-bottom: 10px;
    font-weight: 400;
    vertical-align: top;
  }
  dd {
    display: inline-block;
    width: calc(100% - #{$dt-width});
    margin-inline-start: 0;
    font-family: 'Courier New', Courier, monospace;
  }
  hr {
    opacity: 0.4;
  }
}
</style>

<template>
  <div class="work-adjustment">
    <input
      id="work-auto"
      v-model="workAuto"
      type="checkbox"
      @change="toggleAutomaticWork($event)"
    />
    <label for="work-auto">
      Automatically Adjust Work
    </label>

    <p class="info">
      Proposed value: {{ autoTargetDifficulty }} <br />
      Estimated work time: {{ autoEstimatedTimeInSeconds || '...' }} secs
    </p>

    <label v-if="!workAuto" for="work">Work Value</label>
    <input
      v-if="!workAuto"
      ref="work"
      v-model.number="work"
      type="number"
      @input="estimatePoW($event)"
    />
    <p v-if="!workAuto && estimatedTimeInSeconds" class="info">
      Estimated work time: {{ estimatedTimeInSeconds }} secs
    </p>
  </div>
</template>

<script>
import { mapState } from 'vuex'

import { web3 } from '@/actions/web3ebakus'
import MutationTypes from '@/store/mutation-types'

export default {
  props: {
    isSingleTx: {
      type: Boolean,
      default: false,
    },
  },
  data() {
    return {
      workAuto: this.$store.state.amountOfWork === true,
      work:
        typeof this.$store.state.amountOfWork === 'number'
          ? this.$store.state.amountOfWork
          : null,
      autoTargetDifficulty: null,
      autoEstimatedTimeInSeconds: null,
      estimatedTimeInSeconds: null,
    }
  },
  computed: {
    ...mapState({
      tx: state => state.tx.object,
    }),
  },
  mounted() {
    this.estimatePoW()

    if (this.work) {
      const event = document.createEvent('Event')
      event.initEvent('input', true, true)
      this.$refs.work.dispatchEvent(event)
    }
  },
  methods: {
    toggleAutomaticWork: function(event) {
      const { target: { checked } = {} } = event || {}
      if (checked) {
        this.$store.commit(
          this.isSingleTx
            ? MutationTypes.SET_SINGLE_TX_AMOUNT_OF_WORK
            : MutationTypes.SET_AMOUNT_OF_WORK,
          true
        )
        this.work = null
        this.estimatedTimeInSeconds = null
      }
    },
    estimatePoW: async function(event) {
      const { target: { valueAsNumber: workValue } = {} } = event || {}

      if (workValue) {
        this.$store.commit(
          this.isSingleTx
            ? MutationTypes.SET_SINGLE_TX_AMOUNT_OF_WORK
            : MutationTypes.SET_AMOUNT_OF_WORK,
          workValue
        )
      }

      if (!workValue) {
        this.autoTargetDifficulty = await web3.eth.suggestDifficulty(
          this.$store.state.wallet.address
        )
      }

      const estimatedTimeInSeconds = await web3.eth.estimatePoWTime(
        workValue || this.autoTargetDifficulty,
        this.tx.gas || 21000
      )

      if (!workValue) {
        this.autoEstimatedTimeInSeconds = estimatedTimeInSeconds
      } else {
        this.estimatedTimeInSeconds = estimatedTimeInSeconds
      }
    },
  },
}
</script>

<style scoped lang="scss">
.info {
  margin-top: 0;
  font-size: 0.7em;
  color: #565656;
}

[type='checkbox']:checked + label,
[type='checkbox']:not(:checked) + label {
  margin-bottom: 0;
}
</style>

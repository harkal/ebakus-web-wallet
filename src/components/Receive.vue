<template>
  <div class="receive scroll-wrapper">
    <div class="wrapper">
      <h5>{{ publicAddress }}</h5>
      <button class="full" :class="{ active: justCopied }" @click="doCopy">
        {{ btnLabel }}
      </button>
      <VueQRCodeComponent :text="publicAddress" class="qrcode" />
      <GetFaucet />
    </div>
  </div>
</template>

<script>
import { mapState } from 'vuex'
import VueQRCodeComponent from 'vue-qrcode-component'
import GetFaucet from './GetFaucet'

export default {
  components: {
    VueQRCodeComponent,
    GetFaucet,
  },
  data() {
    return {
      justCopied: false,
      btnLabel: 'Copy to clipboard',
    }
  },
  computed: {
    ...mapState({
      isDrawerActive: state => state.ui.isDrawerActive,
      publicAddress: state => state.wallet.address,
    }),
  },
  methods: {
    doCopy: async function() {
      const self = this

      try {
        await self.$copyText(self.publicAddress)
        self.justCopied = true
        self.btnLabel = 'Copied!'

        setTimeout(() => {
          self.justCopied = false
          self.btnLabel = 'Copy to clipboard'
        }, 1000)
      } catch (err) {
        console.log('Can not copy', err)
      }
    },
  },
}
</script>

<style scoped lang="scss">
.receive {
  button {
    transition: background-color 0.2s ease-out;

    &.active {
      background: #1fd0ab;
      font-weight: 600;
    }
  }

  .qrcode {
    overflow: hidden;
    max-width: 240px;

    ::v-deep img {
      max-width: 240px;
      width: 240px;
      padding: 10px 0px;
    }
  }
}
</style>

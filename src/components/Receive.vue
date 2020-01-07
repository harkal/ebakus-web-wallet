<template>
  <div class="receive scroll-wrapper">
    <div class="wrapper">
      <div v-if="network.isTestnet" class="testnet">
        <h2>
          Important!
        </h2>
        <h3>
          This wallet is connected at an ebakus test network,
          <strong>please don’t send ERC-20 EBK</strong> at this address or main
          network EBK <strong>as they may get lost forever</strong>.
        </h3>
      </div>

      <h5>{{ publicAddress }}</h5>
      <button class="full" :class="{ active: justCopied }" @click="doCopy">
        {{ btnLabel }}
      </button>
      <VueQRCodeComponent
        :text="publicAddress"
        class="qrcode"
        :size="Number(240)"
      />
      <GetFaucet v-if="network.isTestnet" />
    </div>
  </div>
</template>

<script>
import { mapState, mapGetters } from 'vuex'
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
    ...mapGetters(['network']),
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
}

.qrcode {
  overflow: hidden;
  max-width: 240px;
  padding: 10px 0px;
}

.testnet {
  margin: -20px -39px 0;
  padding: 20px 39px;
  background-color: #f3067c;

  h2,
  h3 {
    color: #ffffff;
    font-weight: 300;
  }

  h3 {
    font-weight: 400;
  }
}
</style>

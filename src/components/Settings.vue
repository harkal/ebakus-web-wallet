<template>
  <div class="settings">
    <div v-if="activePane == Panes.MAIN" key="main" class="wrapper">
      <!-- <h2>Slow network?</h2>
      <h3>
        To improve performance while using the ebakus network you can
        temporarily reserve some of your ebakus tokens. Adjust your balance
        utilization bellow.
      </h3>
      <input type="range" min="0" max="100" value="val" class="slider js" /> -->

      <h2>Network</h2>
      <div class="dropdown-wrapper">
        <select
          v-model="inputs.networkId"
          class="dropdown"
          @change="onNetworkChange()"
        >
          <option
            v-for="(network, key, index) in availableNetworks"
            :key="index"
            :value="key"
            >{{ network.name }}</option
          >
          <option value="-1">Use custom node</option>
        </select>
      </div>

      <span v-if="isNodeConnectionError" class="text-error"
        >Failed to connect to network. Switched to default network.</span
      >

      <div v-if="inputs.networkId == '-1'">
        <label for="network">Enter node address</label>
        <input v-model="inputs.nodeAddress" type="text" />

        <span v-if="customNodeError != ''" class="text-error">{{
          customNodeError
        }}</span>

        <button
          class="full"
          :class="{
            disabled: inputs.nodeAddress === '',
            loading: spinnerState == SpinnerState.NODE_CONNECT,
            success: spinnerState == SpinnerState.NODE_CONNECTED,
            error: spinnerState == SpinnerState.NODE_DISCONNECTED,
          }"
          :disabled="inputs.nodeAddress === ''"
          @click="connectToNode"
        >
          <span v-if="spinnerState === SpinnerState.NODE_CONNECT" key="connect">
            Connecting...
          </span>
          <span
            v-else-if="spinnerState === SpinnerState.NODE_CONNECTED"
            key="connected"
          >
            Connected successfully
          </span>
          <span
            v-else-if="spinnerState === SpinnerState.NODE_DISCONNECTED"
            key="disconnected"
          >
            Connection failed
          </span>
          <span v-else key="connect">Connect</span>
        </button>
        <hr />
      </div>

      <button class="full" @click="importKey">Import another Account</button>
      <button class="full" @click="deleteWallet">Delete your Account</button>
      <button class="full" @click="exportPrivateKey">Export Private Key</button>

      <div v-if="isDappWhitelisted || targetOrigin" class="whitelisted">
        <h2>Whitelist</h2>
        <h3>{{ targetOrigin }}</h3>
        <div v-if="isDappWhitelisted">
          <label for="whitelist">
            Transaction Confirmation Delay
            <strong :class="{ error: getWhitelistDelay == 0 }">
              ({{ getWhitelistDelay }} sec)
            </strong>
          </label>
          <input
            type="range"
            class="whitelist-slider"
            min="0"
            :max="maxWhitelistDelay"
            step="1"
            :value="getWhitelistDelay"
            @change="setWhitelistDelay($event)"
          />

          <span v-if="getWhitelistDelay == 0" class="text-error">
            By setting confirmation delay to 0 you will have no time to cancel a
            transaction you don’t approve.
          </span>

          <button class="full" @click="removeDappFromWhitelist">
            Remove from whitelist
          </button>
        </div>
        <div v-else>
          <button class="full" @click="whitelistThisDapp">
            Whitelist this dApp
          </button>
        </div>
      </div>
    </div>
    <div v-if="activePane == Panes.BACKUP" key="backup" class="wrapper">
      <Backup type="privateKey" />
    </div>
  </div>
</template>

<script>
import { mapGetters, mapState } from 'vuex'

import { DialogComponents, SpinnerState, Networks } from '@/constants'

import {
  isDappWhitelisted,
  showWhitelistNewDappView,
  getWhitelistDappTimer,
  setWhitelistDappTimer,
  removeDappFromWhitelist,
} from '@/actions/whitelist'
import { setProvider, getCurrentProviderEndpoint } from '@/actions/providers'
import {} from '@/actions/wallet'
import { web3 } from '@/actions/web3ebakus'

import {
  getTargetOrigin,
  loadedInIframe,
  frameEventCurrentProviderEndpointUpdated,
} from '@/parentFrameMessenger/parentFrameMessenger'

import MutationTypes from '@/store/mutation-types'

import { RouteNames } from '@/router'

import Backup from './Backup'

const MAX_WHITELIST_DELAY = 30

const Panes = {
  MAIN: 'MAIN',
  BACKUP: 'BACKUP',
}

export default {
  components: { Backup },
  data() {
    return {
      activePane: Panes.MAIN,
      availableNetworks: Networks,
      inputs: this.$store.getters.network,
      customNodeError: '',
    }
  },
  computed: {
    Panes: () => Panes,
    ...mapGetters(['network']),
    ...mapState({
      isSpinnerActive: state => state.ui.isSpinnerActive,
      spinnerState: state => state.ui.currentSpinnerState,
    }),

    maxWhitelistDelay: () => MAX_WHITELIST_DELAY,
    SpinnerState: () => SpinnerState,

    targetOrigin: () => getTargetOrigin(),
    isDappWhitelisted: () => isDappWhitelisted(),
    isNodeConnectionError: function() {
      return (
        this.inputs.networkId != '-1' && this.spinnerState === SpinnerState.FAIL
      )
    },
    getWhitelistDelay: () => {
      const timer = getWhitelistDappTimer()
      return timer / 1000
    },
  },
  watch: {
    network(newNetwork) {
      this.$set(this, 'inputs', newNetwork)
    },
  },
  mounted() {
    this.$store.commit(MutationTypes.SHOW_DIALOG, {
      title: 'Settings',
    })
    this.$store.commit(MutationTypes.SET_OVERLAY_COLOR, 'black')

    this.$store.commit(
      MutationTypes.SET_SPINNER_STATE,
      SpinnerState.NODE_SELECT
    )
  },
  beforeDestroy() {
    this.$store.commit(MutationTypes.CLEAR_DIALOG)
    this.$store.commit(MutationTypes.UNSET_OVERLAY_COLOR)
  },
  methods: {
    importKey: function() {
      this.$store.commit(MutationTypes.SHOW_DIALOG, { title: 'Import wallet' })
      this.$router.push({ name: RouteNames.IMPORT })
    },
    deleteWallet: function() {
      this.$store.commit(MutationTypes.SHOW_DIALOG, {
        component: DialogComponents.DELETE_WALLET,
        title: 'Delete wallet',
      })
    },
    exportPrivateKey: function() {
      this.activePane = Panes.BACKUP
    },
    setWhitelistDelay({ target: { valueAsNumber } }) {
      const delay = valueAsNumber * 1000 // in ms
      setWhitelistDappTimer(delay)
    },
    whitelistThisDapp: () => showWhitelistNewDappView(),
    removeDappFromWhitelist: () => removeDappFromWhitelist(),
    connectToNode: function() {
      const self = this

      const { networkId, nodeAddress } = this.inputs
      const network = {
        networkId,
        nodeAddress: networkId == '-1' ? nodeAddress : '',
      }

      this.$store.commit(
        MutationTypes.SET_SPINNER_STATE,
        SpinnerState.NODE_CONNECT
      )

      try {
        if (setProvider(network)) {
          this.$store.commit(MutationTypes.SET_NETWORK, network)

          // this timeout is here in order the code waits for provider to be set to web3 instance
          setTimeout(async () => {
            await web3.eth.net.getId()

            self.$store.dispatch(
              MutationTypes.SET_SPINNER_STATE,
              SpinnerState.NODE_CONNECTED
            )

            self.customNodeError = ''

            if (loadedInIframe()) {
              const providerEndpoint = getCurrentProviderEndpoint()
              frameEventCurrentProviderEndpointUpdated(providerEndpoint)
            }
          }, 100)
        }
      } catch (err) {
        this.$store.commit(
          MutationTypes.SET_SPINNER_STATE,
          SpinnerState.NODE_DISCONNECTED
        )

        setTimeout(async () => {
          this.$store.dispatch(
            MutationTypes.SET_SPINNER_STATE,
            SpinnerState.NODE_SELECT
          )
        }, 1000)

        this.customNodeError = "Can't connect to provider"
        console.error('Failed to set provider', err)
      }
    },
    onNetworkChange: function() {
      const { networkId, nodeAddress } = this.inputs

      this.$store.commit(
        MutationTypes.SET_SPINNER_STATE,
        SpinnerState.NODE_SELECT
      )
      if (networkId != '-1') {
        this.$set(this.inputs, 'nodeAddress', '')
      }

      if (networkId != '-1' || nodeAddress !== '') {
        this.connectToNode()
      }
    },
  },
}
</script>

<style scoped lang="scss">
h2 {
  font-size: 0.9em;
  margin-bottom: 5px;
  font-weight: 500;
}

h3 {
  margin-bottom: 15px;
}

.text-error {
  display: block;
}

hr {
  width: 110%;
  margin: 1em 0 1em -5%;
  border: 0;
  border-top: 1px solid #d8d8d8;
}

.whitelisted {
  margin-top: 30px;

  h3 {
    margin-top: 0;
    font-size: 0.9em;
    font-weight: 600;
    color: #354ea0;
  }
}

.whitelist-slider {
  position: relative;
  -webkit-appearance: none; /* Override default CSS styles */
  appearance: none;
  width: 100%; /* Full-width */
  height: 11px; /* Specified height */
  margin: 20px 0 40px;

  --range: calc(var(--max) - var(--min));
  --ratio: calc((var(--val) - var(--min)) / var(--range));
  --sx: calc(0.5 * 1.5em + var(--ratio) * (100% - 1.5em));

  background: rgb(212, 212, 212); /* Grey background */
  outline: none; /* Remove outline */
  opacity: 0.7; /* Set transparency (for mouse-over effects on hover) */
  transition: opacity 0.2s;
  border-radius: 20px;

  /* The slider handle (use -webkit- (Chrome, Opera, Safari, Edge) and -moz- (Firefox) to override default look) */
  &::-webkit-slider-thumb {
    appearance: none;
    width: 27px; /* Set a specific slider handle width */
    height: 27px; /* Slider handle height */
    cursor: pointer; /* Cursor on hover */
    background: #fcfcfc;
    box-shadow: 0 1px 8px 0 rgba(0, 0, 0, 0.28),
      inset 0 1px 3px 0 rgba(255, 255, 255, 0.5);
    border-radius: 100%;
    border: 1px solid transparent;
  }

  &::-moz-range-thumb {
    width: 27px; /* Set a specific slider handle width */
    height: 27px; /* Slider handle height */
    cursor: pointer; /* Cursor on hover */
    background: #fcfcfc;
    box-shadow: 0 1px 4px 0 rgba(0, 0, 0, 0.28),
      inset 0 1px 3px 0 rgba(255, 255, 255, 0.5);
    box-shadow: -100vw 0 0 100vw dodgerblue;
    border-radius: 100%;
    border: 1px solid transparent;
  }

  &::before,
  &::after {
    position: absolute;
    font-size: 10px;
    white-space: pre;
    top: 25px;
  }

  &::before {
    left: 0;
    content: '0';
  }

  &::after {
    right: 0;
    content: '30 sec';
  }
}
</style>
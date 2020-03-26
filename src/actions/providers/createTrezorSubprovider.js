import TrezorConnect from 'trezor-connect'

import {
  loadedInIframe,
  expandOverlayFrameInParentWindow,
} from '@/parentFrameMessenger/parentFrameMessenger'
import { activateDrawerIfClosed } from '@/parentFrameMessenger/handler'

import store from '@/store'
import MutationTypes from '@/store/mutation-types'

import { TrezorSubprovider } from '@0x/subproviders/lib/src/subproviders/trezor'
import { SpinnerState } from '@/constants'

const defaultOptions = {
  networkId: process.env.DEFAULT_NETWORK_ID, // mainnet
}

// https://github.com/trezor/connect/blob/fb5993729c3523fa8c829b5cc54875808cb701de/src/js/popup/PopupManager.js#L15
const POPUP_OPEN_TIMEOUT = 3000 + 200
let popupTimeout

export default function createTrezorSubprovider(options) {
  const { networkId } = {
    ...defaultOptions,
    ...options,
  }

  TrezorConnect.manifest({
    email: 'harry@ebakus.com',
    appUrl: process.env.WALLET_DEPLOYED_URL,
  })

  // handle blocked popup warning
  // https://github.com/trezor/connect/blob/fb5993729c3523fa8c829b5cc54875808cb701de/src/js/popup/PopupManager.js#L113
  store.subscribe(({ type, payload }) => {
    if (
      type === MutationTypes.SET_SPINNER_STATE &&
      [
        SpinnerState.TREZOR_FETCH_ACCOUNTS,
        SpinnerState.TREZOR_CONFIRM,
      ].includes(payload)
    ) {
      if (popupTimeout) {
        clearTimeout(popupTimeout)
      }

      popupTimeout = setTimeout(() => {
        if (
          loadedInIframe() &&
          document.getElementById('TrezorConnectInteractionLayer')
        ) {
          expandOverlayFrameInParentWindow()
          activateDrawerIfClosed()
        }
      }, POPUP_OPEN_TIMEOUT)
    } else {
      if (popupTimeout) {
        clearTimeout(popupTimeout)
      }
    }
  })

  return new TrezorSubprovider({
    trezorConnectClientApi: TrezorConnect,
    networkId,
  })
}

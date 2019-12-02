import {
  loadedInIframe,
  localStorageGetFromParent,
  localStorageSetToParent,
} from '@/parentFrameMessenger/parentFrameMessenger'

import store from '@/store'

import { isSafari } from '@/utils'

const localStorageGet = async key => {
  if (isSafari && store.state.isSafariAllowed && loadedInIframe()) {
    return await localStorageGetFromParent(key)
  }

  const localData = localStorage.getItem(key)
  if (localData) {
    return localData
  }

  return
}

const localStorageSet = (key, data) => {
  if (isSafari && store.state.isSafariAllowed && loadedInIframe()) {
    localStorageSetToParent(key, data)
    return
  }

  localStorage.setItem(key, data)
}

export { localStorageGet, localStorageSet }

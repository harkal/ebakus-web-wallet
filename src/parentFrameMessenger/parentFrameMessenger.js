import { SpinnerState } from '@/constants'

import store from '@/store'

import { nextAnimationFrame } from '@/utils'

import {
  externalFrameHandler,
  externalPassiveFrameHandler,
  requiresUserAction,
  activateDrawerIfClosed,
} from './handler'

let _target, _targetOrigin, jobQueue

/**
 * Manages the jobs arriving from the parent frame
 * that loads the wallet in an iFrame
 */
function Pool() {
  this.responseCallbacks = []
  this.activeJob
}

Pool.prototype.add = function(data, target, targetOrigin) {
  this.responseCallbacks.push({
    data,
    target,
    targetOrigin,
  })

  if (!this.activeJob) {
    this.next()
  }
}

Pool.prototype.next = function() {
  // pick next job from list
  this.activeJob = this.responseCallbacks.shift()

  // if a job found then call the handler
  if (typeof this.activeJob !== 'undefined' && this.activeJob.data) {
    externalFrameHandler(this.activeJob.data)
  }
}

Pool.prototype.current = function() {
  return this.activeJob
}

const loadedInIframe = () => {
  try {
    return window.self !== window.top
  } catch (e) {
    return true
  }
}

const receivedMessage = ev => {
  // skip messages from current page
  if (ev.origin == window.location.origin) {
    return
  }

  // iframe MUST enforce that the caller has the same origin as its parent frame
  // it MUST reject postMessage requests from any other source origin
  let origin_url = getOriginFromUrl(document.referrer)
  origin_url =
    origin_url.origin || origin_url.protocol + '//' + origin_url.hostname

  if (ev.origin !== origin_url) {
    console.warn(
      `Wallet Parent Frame (${origin_url}) and wallet loader message origin (${ev.origin}) have different origin.`
    )
    return
  }

  const data = JSON.parse(ev.data)
  console.groupCollapsed('Wallet receive message from parent -', data.cmd)
  console.warn('payload: ', data)
  console.groupEnd()

  // keep ref for postMessage use
  _target = ev.source
  _targetOrigin = ev.origin

  const { passive } = data
  if (passive) {
    externalPassiveFrameHandler(data)
    return
  }

  // when new job arrives and wallet is closed,
  // open it so as user handles any previous requests
  const currentJob = jobQueue.current()
  if (currentJob && requiresUserAction()) {
    activateDrawerIfClosed()
  }

  jobQueue.add(data, _target, _targetOrigin)
}

const postMessage = (
  payload,
  target = _target,
  targetOrigin = _targetOrigin
) => {
  if (!loadedInIframe()) {
    return
  }

  const currentJob = jobQueue.current()
  if (currentJob && currentJob.data.id === payload.id) {
    console.log('Parent job.id: ', payload.id)

    const {
      data,
      target: jobTarget,
      targetOrigin: jobTargetOrigin,
    } = currentJob

    target = jobTarget
    targetOrigin = jobTargetOrigin

    payload = { ...data, ...payload }

    jobQueue.next()
  }

  try {
    if (!target) {
      console.log('Please wait for parent frame messaging to init')
      return
    }

    console.log(
      'Wallet send message to parent -',
      payload.cmd,
      'payload: ',
      payload
    )

    target.postMessage(JSON.stringify(payload), targetOrigin)
  } catch (err) {
    console.error('Wallet send message to parent err: ', err)
  }
}

/* helper functions */
const getOriginFromUrl = path => {
  // If the path is empty
  if (!path) {
    return window.location

    // Chrome and FireFox support new URL() to extract URL objects
  } else if (window.URL && URL instanceof Function && URL.length !== 0) {
    return new URL(path, window.location)
  }

  // Ugly shim, it works!
  const tempLink = document.createElement('a')
  tempLink.href = path
  return tempLink
}

const getTargetOrigin = () => {
  return _targetOrigin
}

const replyToParentWindow = (res, err, job) => {
  if (!job || !job.id) {
    const { data: { id: currentJobId } = {} } = jobQueue.current() || {}
    if (currentJobId) {
      job = { id: currentJobId, ...job }
    }
  }

  const payload = { ...job }

  if (res) {
    payload.res = res
  }
  if (err) {
    payload.err = err
  }
  postMessage(payload)
}
const expandFrameInParentWindow = () => postMessage({ cmd: 'active' })
const shrinkFrameInParentWindow = () => {
  postMessage({ cmd: 'inactive' })

  // expand parent width for better animations
  if (
    [
      SpinnerState.CALC_POW,
      SpinnerState.TRANSACTION_SENDING,
      SpinnerState.NODE_CONNECT,
    ].includes(store.state.ui.currentSpinnerState)
  ) {
    resizeFrameWidthInParentWindow(400)
  }
}
const resizeFrameWidthInParentWindow = async (width, height = 60) => {
  postMessage({ cmd: 'resize', width, height })

  return new Promise(resolve => {
    const checkSize = function() {
      if (width > window.innerWidth || height > window.innerHeight) {
        nextAnimationFrame(checkSize)
      } else {
        resolve()
      }
    }
    checkSize()
  })
}
const expandOverlayFrameInParentWindow = () =>
  postMessage({ cmd: 'withOverlay' })
const shrinkOverlayFrameInParentWindow = () =>
  postMessage({ cmd: 'withoutOverlay' })
const openInNewTabInParentWindow = href =>
  postMessage({ cmd: 'openInNewTab', req: href })

const postEvent = (type, payload) =>
  postMessage({
    cmd: 'event',
    type: type,
    data: payload,
  })

const frameEventCurrentProviderEndpointUpdated = endpoint =>
  postEvent('ebakusCurrentProviderEndpoint', endpoint)

const frameEventBalanceUpdated = balance => postEvent('ebakusBalance', balance)

const frameEventConnectionStatusUpdated = status =>
  postEvent('ebakusConnectionStatus', status)

const init = () => {
  if (loadedInIframe()) {
    jobQueue = new Pool()

    // start  listening to messages from parent window
    window.addEventListener('message', receivedMessage, false)
  }
}

export default init
export {
  getTargetOrigin,
  loadedInIframe,
  replyToParentWindow,
  expandFrameInParentWindow,
  shrinkFrameInParentWindow,
  resizeFrameWidthInParentWindow,
  expandOverlayFrameInParentWindow,
  shrinkOverlayFrameInParentWindow,
  openInNewTabInParentWindow,
  frameEventCurrentProviderEndpointUpdated,
  frameEventBalanceUpdated,
  frameEventConnectionStatusUpdated,
}

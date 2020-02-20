const isSafari = /^((?!chrome|android).)*safari/i.test(
  navigator.userAgent || navigator.vendor || window.opera
)

const waitUntil = async function(
  checkSuccess = () => false,
  checkError = () => false,
  time = 500
) {
  return await new Promise((resolve, reject) => {
    const interval = setInterval(() => {
      if (checkSuccess()) {
        clearInterval(interval)
        resolve()
      } else if (checkError()) {
        clearInterval(interval)
        reject()
      }
    }, time)
  })
}

const nextAnimationFrame =
  window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  window.msRequestAnimationFrame ||
  window.oRequestAnimationFrame ||
  function(cb) {
    window.setTimeout(cb, 1000 / 60)
  }

const cancelAnimationFrame =
  window.cancelAnimationFrame ||
  window.webkitCancelRequestAnimationFrame ||
  window.webkitCancelAnimationFrame ||
  window.mozCancelRequestAnimationFrame ||
  window.mozCancelAnimationFrame ||
  window.oCancelRequestAnimationFrame ||
  window.oCancelAnimationFrame ||
  window.msCancelRequestAnimationFrame ||
  window.msCancelAnimationFrame ||
  function(requestID) {
    window.clearTimeout(requestID)
  }

let activeAnimationTimeout = null

/**
 * Manages the jobs arriving from the parent frame
 * that loads the wallet in an iFrame
 */
function AnimationQueue() {
  this.animations = []
  this.activeAnimation
}

AnimationQueue.prototype.add = function(animation) {
  this.animations.push(animation)

  if (!this.activeAnimation) {
    this.next()
  }
}

AnimationQueue.prototype.next = function() {
  if (activeAnimationTimeout) {
    clearTimeout(activeAnimationTimeout)
    activeAnimationTimeout = null
  }

  // pick next job from list
  this.activeAnimation = this.animations.shift()

  // if a job found then call the handler
  if (typeof this.activeAnimation === 'function') {
    this.activeAnimation()

    const self = this

    // don't block interaction for more than a second
    activeAnimationTimeout = setTimeout(() => {
      self.next()
    }, 1000)
  }
}

AnimationQueue.prototype.current = function() {
  return this.activeAnimation
}

AnimationQueue.prototype.isAnimating = function() {
  return typeof this.activeAnimation === 'function'
}

const animationQueue = new AnimationQueue()

export {
  isSafari,
  waitUntil,
  nextAnimationFrame,
  cancelAnimationFrame,
  animationQueue,
}

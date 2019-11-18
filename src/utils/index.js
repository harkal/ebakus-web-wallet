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
  // pick next job from list
  this.activeAnimation = this.animations.shift()

  // if a job found then call the handler
  if (typeof this.activeAnimation === 'function') {
    this.activeAnimation()
  }
}

AnimationQueue.prototype.current = function() {
  return this.activeAnimation
}

AnimationQueue.prototype.isAnimating = function() {
  return typeof this.activeAnimation === 'function'
}

const animationQueue = new AnimationQueue()

export { nextAnimationFrame, cancelAnimationFrame, animationQueue }

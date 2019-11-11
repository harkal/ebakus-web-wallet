const nextAnimationFrame =
  window.requestAnimationFrame ||
  window.webkitRequestAnimationFrame ||
  window.mozRequestAnimationFrame ||
  window.msRequestAnimationFrame ||
  window.oRequestAnimationFrame ||
  function(cb) {
    window.setTimeout(cb, 1000 / 60)
  }

export { nextAnimationFrame }

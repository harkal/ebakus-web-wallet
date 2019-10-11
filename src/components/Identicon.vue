<template>
  <div class="widget">
    <div
      id="identicon"
      ref="identicon"
      class="identicon"
      :class="{ placeholder: publicKey == '' }"
    />
  </div>
</template>

<script>
import jazzicon from 'jazzicon'

export default {
  props: {
    publicKey: {
      type: String,
      default: '',
    },
  },
  watch: {
    publicKey() {
      this.init()
    },
  },
  mounted() {
    this.init()
  },
  methods: {
    init() {
      const publicKey = this.publicKey
      if (publicKey && publicKey != '') {
        const identicon = jazzicon(
          50,
          parseInt(`0x${publicKey.substr(publicKey.length - 12)}`)
        )
        if (this.$refs.identicon.hasChildNodes()) {
          this.$refs.identicon.removeChild(this.$refs.identicon.childNodes[0])
        }
        this.$refs.identicon.appendChild(identicon)
      }
    },
  },
}
</script>

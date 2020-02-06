<template>
  <div class="field-container">
    <input
      ref="pass"
      v-model="pass"
      :type="revealPass ? 'text' : 'password'"
      name="password"
      :placeholder="placeholder"
      @keyup.enter="$emit('onEnter')"
      @keyup="updatePass"
    />
    <img
      v-show="!revealPass"
      src="@/assets/img/ic_pass_reveal.svg"
      width="14"
      @click="togglePass"
    />
    <img
      v-show="revealPass"
      src="@/assets/img/ic_pass_hide.svg"
      width="14"
      @click="togglePass"
    />
  </div>
</template>

<script>
export default {
  props: {
    value: {
      type: String,
      default: '',
    },
    placeholder: {
      type: String,
      default: '',
    },
  },
  data() {
    return {
      pass: this.value,
      revealPass: false,
    }
  },
  methods: {
    updatePass: function() {
      this.$emit('input', this.pass)
    },
    togglePass: function() {
      this.revealPass = !this.revealPass
    },
  },
}
</script>

<style scoped lang="scss">
.field-container {
  position: relative;

  img {
    position: absolute;
    right: 12px;
    top: 50%;
    transform: translateY(-50%);
    z-index: 1;
    opacity: 0.65;
  }
}
</style>

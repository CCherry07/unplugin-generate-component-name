<template>
  <div>
    {{ b }}
  </div>
</template>
<script lang="ts">
export default {
  inheritAttrs: false
}
</script>
<script setup lang="ts">
const b = ('component B')
</script>

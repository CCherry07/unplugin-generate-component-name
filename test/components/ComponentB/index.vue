<template>
  <div>
    {{ b }}
  </div>
</template>

<script setup lang="ts">
import { defineOptions } from "vue"
defineOptions({
  inheritAttrs: false
})
const b = ('component B')
</script>

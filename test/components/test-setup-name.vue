<template>
  <div>
    {{ foo }}
  </div>
</template>

<script setup lang="ts" name="NameForeSetup">
import { ref } from "vue"
const foo = ref('foo')
</script>

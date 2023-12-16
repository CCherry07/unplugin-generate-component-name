<template>
  <div>
    {{ a }}
    <ComponentB/>
  </div>
</template>
<script setup lang="ts">
import ComponentB from "../ComponentB/index.vue";
const a = ('component A')
</script>

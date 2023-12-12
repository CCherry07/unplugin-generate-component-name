# unplugin-generate-component-name

A plugin for auto generate vue component name.

###### Features

- 💚 Supports both Vue 2 and Vue 3 out-of-the-box.
- ⚡️ Supports Vite, Webpack, Rspack, Vue CLI, Rollup, esbuild and more, powered by <a href="https://github.com/unjs/unplugin">unplugin</a>.
- 🪐 Folder names and [Setup extend](https://cn.vuejs.org/api/sfc-script-setup.html#script-setup) two patterns.
- 🦾 Full TypeScript support.

## Install

```bash
# Yarn
$ yarn add unplugin-generate-component-name

# Pnpm
$ pnpm i unplugin-generate-component-name
```

<details>
<summary>Vite</summary><br>

```ts
// vite.config.ts
import GenerateComponentName from 'unplugin-generate-component-name/vite'

export default defineConfig({
  plugins: [
    GenerateComponentName({ /* options */ }),
  ],
})
```

<br></details>

<details>
<summary>Rollup</summary><br>

```ts
// rollup.config.js
import GenerateComponentName from 'unplugin-generate-component-name/rollup'

export default {
  plugins: [
    GenerateComponentName({ /* options */ }),
  ],
}
```

<br></details>

<details>
<summary>Webpack</summary><br>

```ts
// webpack.config.js
module.exports = {
  /* ... */
  plugins: [
    require('unplugin-generate-component-name/webpack').default({ /* options */ }),
  ],
}
```

<br></details>

## Usage

### Folder names

- You can use the name of the directory where the Index Component resides as the name of the component.

### Generating Vue Component Names

In Vue, we can use the `unplugin-generate-component-name` plugin to automatically generate component names based on directory names. This plugin makes it easier and more intuitive to find and manage components in a large codebase. For instance, let's say we have a Vue component named `Index.vue`, and this component is in the `Home` directory. With the `unplugin-generate-component-name` plugin, this component will automatically be named `Home`.

### Setup Extend

Continuing with the Setup Extend demo is writing the name="Home" on the script tag.

```html
<template>
  <!-- Your component marker -->
</template>

<script setup name="Home">
  // Your script logic
</script>

<style>
  <!-- Your component style -->
</style>
```

In the `<script setup>` tag, we set the name attribute to "Home". This explicitly names the component "Home", and the `unplugin-generate-component-name` plugin will use this name instead of "Index".

Please note that you should first install and correctly configure the plugin in your `vite.config.js` or `webpack.config.js` file.

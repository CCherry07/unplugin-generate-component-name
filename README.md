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

```text
src/home/
├── index.vue // component name is Home
├── about.vue
└── users/
    ├── index.vue // component name is Users
    └── info.vue
```

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

### Options

```ts
interface Options {
  include?: string | RegExp | (string | RegExp)[]
  exclude?: string | RegExp | (string | RegExp)[]
  geComponentName?: (filePath: string, dirnames: string[]) => string | undefined
}
```

#### include

The `include` option allows you to specify which files should be included for component name auto-generation. The value can be a string, regular expression, or an array of strings and regular expressions.

#### exclude

The `exclude` option is the opposite of `include` - it specifies which files should be excluded from auto-generation. The value can also be a string, regular expression, or an array of strings and regular expressions.

#### geComponentName

In your Vite or Webpack configuration file, you can configure the `unplugin-generate-component-name` plugin and define your `geComponentName` function (as shown in the Vite configuration example below).

```ts
// vite.config.ts
import GenerateComponentName from 'unplugin-generate-component-name/vite'

export default defineConfig({
  plugins: [
    GenerateComponentName({
      geComponentName: (_filename, paths) => {
        const basename = paths.at(-1)?.slice(0, -4)!
        if (basename.toLocaleLowerCase() !== 'index') {
          return `${paths.at(-2)}-${basename}` // dirname-basename home-[name]
        }
      }
    }),
  ],
});
```

In this example, the `geComponentName` function has been defined so as to return a component name in the form of `${dirname}-${basename}` when the component's file name is not 'index', otherwise, it doesn't return anything which means the default naming of `dirname or setup extend name` will be used.

# unplugin-generate-component-name

A plugin for auto generate vue component name.

###### Features

- 💚 Supports Vue 3 out-of-the-box.
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
type GenComponentName = (opt: {
    filePath: string;
    dirname: string;
    originalName: string;
    attrName: string | undefined;
}) => string;
interface PattenOptions {
    include?: string | RegExp | (string | RegExp)[];
    exclude?: string | RegExp | (string | RegExp)[];
    genComponentName: GenComponentName;
}
interface Options extends Omit<PattenOptions, 'genComponentName'> {
    enter?: PattenOptions[];
}
```

#### include

The `include` option is utilized to specifically state the files that should be processed for component name auto-generation. This safeguard can be specified using a string, a regular expression, or an array that can hold a collection of both.

#### exclude

On the flip side, the `exclude` option operates by dictating the files that should abstain from the auto-generation process. This restriction can also be imposed using a string, a regular expression, or a combination of both held in an array.

#### enter

In the `Options` interface, there's an `enter` option. `enter` is an array where each object acts as a specific set of rules for handling different file paths.

Each set of rules can include `include` and `exclude` options which specify which files need special handling. Their value can be a string, a RegExp, or an array consisting of strings and RegExps. You can also specify a `genComponentName` function for custom component name generation.

Here's an example:

```ts
// vite.config.ts
import GenerateComponentName from 'unplugin-generate-component-name/vite'

export default defineConfig({
  plugins: [
     GenerateComponentName({
      include: ['**/*.vue'],
      enter: [{
        include: ["**/*index.vue"],
        genComponentName: ({ attrName, dirname }) => attrName ?? dirname
      }, {
        exclude: ['**/*.index.vue'],
        include: ["src/components/**/*.vue"],
        genComponentName: ({ dirname, originalName }) => `${dirname}-${originalName}`
      }]
    }),
  ],
});
```

In this example, the `unplugin-generate-component-name` plugin is configured to process all .vue files. There are two objects within the `enter` option for different file paths:

- The first object covers all files that end with `"index.vue"`. The `genComponentName` function returns the component name. If a `name` is already specified in the `script setup tag`, it will be prioritized; otherwise, the directory name (`dirname`) will be used.

- The second object excludes all files ending with `"index.vue"` and only includes `.vue` files within the `"src/components/"` directory. A `genComponentName` function is used to generate the component name in the format of `${dirname}-${originalName}`.For instance, for a file named`MyButton.vue` in `src/components/Button`, it will be`Button-MyButton`.

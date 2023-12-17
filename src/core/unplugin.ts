import { resolve } from "node:path"
import { readFile } from "fs/promises"
import { createUnplugin } from "unplugin"
import { createFilter } from "@rollup/pluginutils"
import { minVersion } from "semver"
import type { GeComponentName, Options } from "../types"
import { parseVueRequest } from "./utils"
import { createTransform } from "./createTransform"

const defaultInclide = ["**/index.vue"]
const defaultExclide = [/[\\/]node_modules[\\/]/, /[\\/]\.git[\\/]/, /[\\/]\.nuxt[\\/]/]
const defaultGeComponentName: GeComponentName = ({ attrName, dirname }) => attrName ?? dirname

export default createUnplugin((options: Options = {}) => {
  const filter = createFilter(
    options.include || defaultInclide,
    options.exclude || defaultExclide,
  )

  const filters = options.enter?.map(({ include, exclude, geComponentName }) => ({ filter: createFilter(include, exclude), geComponentName })) ?? [{
    filter: createFilter(defaultInclide, defaultExclide),
    geComponentName: defaultGeComponentName
  }]

  let vueVersion: string | undefined

  return {
    name: "GeComponentName",
    enforce: 'pre',
    async buildStart() {
      const packageJsonPath = resolve(process.cwd(), 'package.json');
      await readFile(packageJsonPath).then(fileData => {
        const dependencies = JSON.parse(fileData.toString()).dependencies;
        vueVersion = minVersion(dependencies['vue'])?.version
      });
    },
    transformInclude(id) {
      const { filename, query } = parseVueRequest(id)
      if (query.raw || query.url) return
      if (!filter(filename) && !query.vue) return
      return true
    },
    transform(code, id) {
      return createTransform(vueVersion, filters)(code, id)
    },
  }
})

import { resolve } from "node:path"
import { readFile } from "fs/promises"
import { createUnplugin } from "unplugin"
import { createFilter } from "@rollup/pluginutils"
import { minVersion } from "semver"
import type { GenComponentName, Options } from "../types"
import { parseVueRequest } from "./utils"
import { createTransform } from "./createTransform"

const defaultInclide = ["**/index.vue"]
const defaultExclide = [/[\\/]node_modules[\\/]/, /[\\/]\.git[\\/]/, /[\\/]\.nuxt[\\/]/]
const defaultGenComponentName: GenComponentName = ({ attrName, dirname }) => attrName ?? dirname

export default createUnplugin((options: Options = {}) => {
  const filter = createFilter(
    options.include || defaultInclide,
    options.exclude || defaultExclide,
  )

  const filters = options.enter?.map(({ include, exclude, genComponentName }) => ({ filter: createFilter(include, exclude), genComponentName })) ?? [{
    filter: createFilter(defaultInclide, defaultExclide),
    genComponentName: defaultGenComponentName
  }]

  let vueVersion: string | undefined

  return {
    name: "GenComponentName",
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
      if (!query.vue && !filter(filename) || !filters.some(o => o.filter(filename))) return
      return true
    },
    transform(code, id) {
      return createTransform(vueVersion, filters)(code, id)
    },
  }
})

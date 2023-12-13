import { resolve } from "node:path"
import fs from "fs/promises"
import { parse as vueParse, compileScript } from '@vue/compiler-sfc'
import { createUnplugin } from "unplugin"
import MagicString from 'magic-string'
// @ts-ignore
import traverse from '@babel/traverse'

import { Options } from "../types"
import { EXPORT_HELPER_ID } from "./constant"
import { createFilter, getComponentName, parseVueRequest } from "./utils"

export default createUnplugin((options: Options = {}) => {
  const { include, exclude = [] } = options
  const filter = createFilter(include || '**/index.vue', exclude)
  let vueVersion = ""
  return {
    name: "GeComponentName",
    enforce: 'pre',
    async buildStart() {
      const packageJsonPath = resolve(process.cwd(), 'package.json');
      await fs.readFile(packageJsonPath).then(fileData => {
        const dependencies = JSON.parse(fileData.toString()).dependencies;
        vueVersion = dependencies['vue']
      });
    },
    resolveId(id) {
      if (id === EXPORT_HELPER_ID) {
        return id
      }
      if (parseVueRequest(id).query.vue) {
        return id
      }
    },
    async transform(code, id) {
      const { filename, query } = parseVueRequest(id)
      if (query.raw || query.url) {
        return
      }

      if (!filter(filename) && !query.vue) {
        return
      }
      const { descriptor } = vueParse(code, {
        filename: filename,
        ignoreEmpty: true
      })
      if (descriptor.script || descriptor.scriptSetup) {
        const { scriptAst, scriptSetupAst, loc, attrs } = compileScript(descriptor, {
          id,
          sourceMap: true
        });
        if (!scriptSetupAst && !scriptAst) return
        let hasNameProperty = false
        let isHandle = false
        const s = new MagicString(code);
        traverse({
          "type": "Program",
          "sourceType": "module",
          body: [...scriptAst ?? [], ...scriptSetupAst ?? []]
        }, {
          noScope: true,
          ExportDefaultDeclaration(path: { node: { declaration: { type: string; properties: any[] } } }) {
            if (hasNameProperty) { return }
            if (path.node.declaration.type === 'ObjectExpression') {
              hasNameProperty = path.node.declaration.properties.some(
                property => property.key.name === 'name'
              );
            }
          },
          CallExpression(path: { node: any }) {
            if (hasNameProperty) { return }
            const callExpr = path.node;
            if (callExpr.callee.type === "Identifier" && callExpr.callee.name === 'defineOptions') {
              const arg = callExpr.arguments[0];
              if (arg.type === 'ObjectExpression') {
                const baseOptions = {}
                for (const property of arg.properties) {
                  // @ts-ignore
                  baseOptions[property.key.name] = property.value.value
                  if (property.key.name === 'name' && property.value.type === 'StringLiteral') {
                    hasNameProperty = true
                  }
                }
                if (!hasNameProperty) {
                  const newCall = `defineOptions(${JSON.stringify({
                    name: getComponentName({
                      geComponentName: options.geComponentName,
                      filename,
                      attrs
                    }),
                    ...baseOptions
                  })});\n`;
                  s.overwrite(callExpr.start + loc.start.offset, callExpr.end + loc.start.offset, newCall)
                  code = s.toString()
                  isHandle = true
                }
              }
            }
          },
        })

        if (isHandle) {
          return {
            code,
            map: s.generateMap({
              hires: true
            })
          }
        }

        if (vueVersion && !hasNameProperty) {
          const componentName = getComponentName({ geComponentName: options.geComponentName, filename, attrs })
          const versionArr = vueVersion.match(/\d+/g)!
          const version = Number(versionArr[0] + versionArr[1] + versionArr[2])
          let lastImportEnd = 0;
          traverse({
            "type": "Program",
            "sourceType": "module",
            body: [...scriptAst ?? [], ...scriptSetupAst ?? []],
          }, {
            noScope: true,
            ImportDeclaration(path: any) {
              lastImportEnd = path.node.end
              const specifiers = path.node.specifiers;
              for (const specifier of specifiers) {
                if (specifier.local.name === "defineOptions") {
                  const newCall = `defineOptions({name: "${componentName}"});\n`;
                  s.appendLeft(loc.start.offset + lastImportEnd, newCall);
                  code = s.toString();
                  isHandle = true
                }
              }
            }
          })

          if (!isHandle) {
            if (version >= 320) {
              const newImport = `\nimport { defineOptions } from 'vue';\n`;
              const newCall = `defineOptions({name: "${componentName}"});\n`;
              s.appendLeft(loc.start.offset + lastImportEnd, newImport + newCall);
              code = s.toString();
            } else {
              const newExport = `
                <script>
                  export default {
                    name: "${componentName}",
                  };\n
                </script>`;
              s.appendLeft(loc.start.offset, newExport);
              code = s.toString();
            }
          }

          return {
            code,
            map: s.generateMap({
              hires: true
            })
          }
        }
      }
    },
  }
})

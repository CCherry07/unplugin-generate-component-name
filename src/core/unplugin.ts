import { basename, dirname, resolve, sep } from "node:path"
import fs from "fs/promises"
import { parse as vueParse, compileScript } from '@vue/compiler-sfc'
import { createUnplugin } from "unplugin"
import MagicString from 'magic-string'
// @ts-ignore
import traverse from '@babel/traverse'

import { Options } from "../types"
import { EXPORT_HELPER_ID } from "./constant"
import { createFilter, parseVueRequest } from "./utils"

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
        let defineOptionsExist = false;
        traverse({
          "type": "Program",
          "sourceType": "module",
          body: [...scriptAst ?? [], ...scriptSetupAst ?? []]
        }, {
          noScope: true,
          ExportDefaultDeclaration(path: { node: { declaration: { type: string; properties: any[] } } }) {
            if (path.node.declaration.type === 'ObjectExpression') {
              hasNameProperty = path.node.declaration.properties.some(
                property => property.key.name === 'name'
              );
            }
          },
          CallExpression(path: { node: any }) {
            const callExpr = path.node;
            if (callExpr.callee.name === 'defineOptions') {
              if (callExpr.arguments.length) {
                const arg = callExpr.arguments[0];
                if (arg.type === 'ObjectExpression') {
                  defineOptionsExist = true
                  for (const property of arg.properties) {
                    if (property.key.name === 'name' && property.value.type === 'StringLiteral') {
                      hasNameProperty = true
                    }
                  }
                }
              }
            }
          },
        })
        if (!hasNameProperty) {
          let componentName = options.geComponentName?.(filename, filename.slice(process.cwd().length + 1).split(sep))
          if (!componentName) {
            componentName = typeof attrs.name === 'string' ? attrs.name : basename(dirname(filename));
          }
          const optionsNodePosition = {
            start: 0,
            end: 0
          }
          if (vueVersion) {
            const versionArr = vueVersion.match(/\d+/g)!
            const version = Number(versionArr[0] + versionArr[1] + versionArr[2])
            let lastImportEnd = 0;
            traverse({
              "type": "Program",
              "sourceType": "module",
              body: [...scriptAst ?? [], ...scriptSetupAst ?? []],
            }, {
              noScope: true,
              enter(path: any) {
                if (path.isImportDeclaration()) {
                  lastImportEnd = path.node.end
                  const specifiers = path.node.specifiers;
                  for (const specifier of specifiers) {
                    if (specifier.local.name === "defineOptions") {
                      defineOptionsExist = true;
                    }
                  }
                }
                if (path.isCallExpression() && defineOptionsExist) {
                  const callee = path.node.callee;
                  if (callee.type === "Identifier" && callee.name === 'defineOptions') {
                    optionsNodePosition.start = loc.start.offset + path.node.start
                    optionsNodePosition.end = loc.start.offset + path.node.end
                  }
                }
              }
            })
            const s = new MagicString(code);
            if (version >= 320) {
              if (!defineOptionsExist && optionsNodePosition.start === 0) {
                const newImport = `\nimport { defineOptions } from 'vue';\n`;
                const newCall = `defineOptions({name: "${componentName}"});\n`;
                s.appendLeft(loc.start.offset + lastImportEnd, newImport + newCall);
                code = s.toString();
              } else if (defineOptionsExist) {
                if (optionsNodePosition.start === 0) {
                  const newCall = `\ndefineOptions({name: "${componentName}"});\n`;
                  s.appendLeft(loc.start.offset + lastImportEnd, newCall);
                  code = s.toString();
                } else {
                  traverse({
                    "type": "Program",
                    "sourceType": "module",
                    body: [...scriptAst ?? [], ...scriptSetupAst ?? []],
                  }, {
                    noScope: true,
                    enter(path: any) {
                      if (path.isCallExpression() && defineOptionsExist) {
                        const callee = path.node.callee;
                        if (callee.type === "Identifier" && callee.name === 'defineOptions') {
                          const args = path.node.arguments;
                          if (args.length > 1) return
                          if (args.length === 1 && args[0].type === "ObjectExpression") {
                            const properties = args[0].properties;
                            const baseOptions = {
                              name: componentName
                            }
                            // @ts-ignore
                            properties.forEach(prop => { baseOptions[prop.key.name] = prop.value.value })
                            const newCall = `defineOptions(${JSON.stringify(baseOptions)});\n`;
                            s.overwrite(optionsNodePosition.start, optionsNodePosition.end, newCall)
                            code = s.toString()
                          }
                        }
                      }
                    }
                  })
                }
              }
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
            return {
              code,
              map: s.generateMap({
                hires: true
              })
            }
          }
        }
      }
    },
  }
})

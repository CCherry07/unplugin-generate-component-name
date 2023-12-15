import { resolve } from "node:path"
import fs from "fs/promises"
import { parse as vueParse, compileScript } from '@vue/compiler-sfc'
import { createUnplugin } from "unplugin"
import MagicString from 'magic-string'
import { createFilter } from "@rollup/pluginutils"
// @ts-ignore
import traverse from '@babel/traverse'
import { gte, minVersion } from "semver"
import { Options } from "../types"
import { getComponentName, parseVueRequest } from "./utils"

export default createUnplugin((options: Options = {}) => {
  const filter = createFilter(
    options.include || ["**/index.vue"],
    options.exclude || [/[\\/]node_modules[\\/]/, /[\\/]\.git[\\/]/, /[\\/]\.nuxt[\\/]/],
  )
  let vueVersion: string | undefined
  return {
    name: "GeComponentName",
    enforce: 'pre',
    async buildStart() {
      const packageJsonPath = resolve(process.cwd(), 'package.json');
      await fs.readFile(packageJsonPath).then(fileData => {
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
    async transform(code, id) {
      const { filename } = parseVueRequest(id)
      const { descriptor } = vueParse(code, {
        filename: filename,
        ignoreEmpty: true
      })
      if (descriptor.script || descriptor.scriptSetup) {
        const { scriptAst, scriptSetupAst, loc, attrs } = compileScript(descriptor, { id });
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
          CallExpression(path: any) {
            if (hasNameProperty) { return }
            const callExpr = path.node;
            if (callExpr.callee.type === "Identifier" && callExpr.callee.name === "defineOptions") {
              const arg = callExpr.arguments?.[0];
              if (arg && arg.type === "ObjectExpression") {
                for (const property of arg.properties) {
                  if (property.key.name === "name" && property.value.type === "StringLiteral") {
                    hasNameProperty = true;
                  }
                }
                if (!hasNameProperty) {
                  const defineOptionsCode = s.slice(callExpr.start + loc.start.offset, callExpr.end + loc.start.offset)
                  const startPos = defineOptionsCode.indexOf('{') + 1;
                  s.appendLeft(callExpr.start + loc.start.offset + startPos, `name:'${getComponentName({
                    geComponentName: options.geComponentName,
                    filename,
                    attrs
                  })}',`);
                  code = s.toString();
                }
              } else {
                const newCall = `defineOptions({name: "${getComponentName({
                  geComponentName: options.geComponentName,
                  filename,
                  attrs
                })}"});\n`;
                s.overwrite(callExpr.start + loc.start.offset, callExpr.end + loc.start.offset, newCall);
                code = s.toString();
              }
              isHandle = true;
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
          let lastImportEnd = 0;
          let defineOptionsExist = false
          traverse({
            "type": "Program",
            "sourceType": "module",
            body: [...scriptSetupAst ?? []],
          }, {
            noScope: true,
            ImportDeclaration(path: any) {
              lastImportEnd = path.node.end
              const specifiers = path.node.specifiers;
              for (const specifier of specifiers) {
                if (specifier.local.name === "defineOptions") {
                  defineOptionsExist = true
                }
              }
            }
          })
          if (defineOptionsExist) {
            const newCall = `\ndefineOptions({ name: "${componentName}" }); \n`;
            s.appendLeft(loc.start.offset + lastImportEnd, newCall);
            code = s.toString();
          } else if (gte(vueVersion, '3.3.0')) {
            const newImport = `\nimport { defineOptions } from 'vue'; \n`;
            const newCall = `defineOptions({ name: "${componentName}" }); \n`;
            s.appendLeft(loc.start.offset + lastImportEnd, newImport + newCall);
            code = s.toString();
          } else if (scriptAst) {
            let ExportDefaultExist = false
            const regExp = /<\/script>/g;
            const matches = Array.from(code.matchAll(regExp));
            const [index] = matches.map(match => match.index).filter(idx => idx !== loc.end.offset);
            traverse({
              "type": "Program",
              "sourceType": "module",
              body: [...scriptAst ?? []],
            }, {
              noScope: true,
              ExportDefaultDeclaration(path: any) {
                ExportDefaultExist = true
                if (path.node.declaration.type === 'ObjectExpression') {
                  const ExportDefaultIndex = code.indexOf('export default')
                  s.appendLeft(code.slice(ExportDefaultIndex).indexOf('{') + ExportDefaultIndex + 1, `name:'${getComponentName({
                    geComponentName: options.geComponentName,
                    filename,
                    attrs
                  })}',`)
                  code = s.toString()
                }
              }
            })
            if (!ExportDefaultExist && index) {
              const newExport = ` export default {
                name: "${componentName}",
              }; \n`
              s.appendLeft(index, newExport)
              code = s.toString()
            }
          } else {
            const newExport = `
              <script lang='${attrs.lang}'>
                export default {
                  name: "${componentName}",
                }; \n
                </script> \n`;
            s.appendLeft(0, newExport);
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
    },
  }
})

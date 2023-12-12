import { basename, dirname, resolve } from "node:path"
import fs from "fs/promises"
import { parse as vueParse, compileScript } from '@vue/compiler-sfc'
import { createUnplugin } from "unplugin"
import MagicString from 'magic-string'
// @ts-ignore
import traverse from '@babel/traverse'

import { Options } from "../types"
import { EXPORT_HELPER_ID } from "./constant"
import { createFilter, parseVueRequest } from "./utils"

declare global {
  namespace NodeJS {
    interface Process {
      NODE_ENV: 'development' | string
    }
  }
}

export default createUnplugin((options: Options = {}) => {
  const { include, exclude = [] } = options
  const isDev = process.env.NODE_ENV === 'development'
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
      if (!isDev) return
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
          const parentFolderName = attrs.name ?? basename(dirname(filename));
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
                if (path.isImportDeclaration() && !defineOptionsExist) {
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
            if (!defineOptionsExist && optionsNodePosition.start === 0) {
              const s = new MagicString(code);
              traverse({
                "type": "Program",
                "sourceType": "module",
                body: scriptSetupAst
              }, {
                noScope: true,
                ImportDeclaration(path: { node: { end: number } }) {
                  lastImportEnd = path.node.end;
                }
              });
              if (version >= 320) {
                const newImport = `\nimport { defineOptions } from 'vue';\n`;
                const newCall = `defineOptions({name: "${parentFolderName}"});\n`;
                s.appendLeft(loc.start.offset + lastImportEnd, newImport + newCall);
                code = s.toString();
              } else {
                const newExport = `
                <script>
                  export default {
                    name: "${parentFolderName}",
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
      }
    },
  }
})

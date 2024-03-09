import { parse as vueParse, compileScript } from '@vue/compiler-sfc'
import MagicString from 'magic-string'
import type { FilteringRules } from '../types'
import _traverse from '@babel/traverse'
import { isCallExpression, isIdentifier, isObjectExpression, isObjectProperty } from "@babel/types";
import { gte } from "semver"
import { getComponentName, parseVueRequest } from "./utils"

// fix side-effect of how the CJS-ESM interop
const traverse = (typeof (_traverse as any)?.default === "function" ? (_traverse as any).default : _traverse) as typeof _traverse

export const createTransform = (vueVersion?: string, filters?: FilteringRules) => {
  return (code: string, id: string) => {
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
        directives: [],
        body: [...scriptAst ?? [], ...scriptSetupAst ?? []]
      }, {
        noScope: true,
        ExportDefaultDeclaration(path) {
          if (hasNameProperty) { return }
          if (isObjectExpression(path.node.declaration)) {
            hasNameProperty = (path.node).declaration.properties.some(
              property => isObjectProperty(property) &&
                isIdentifier(property.key) &&
                property.key.name === 'name'
            );
          }
          if (isCallExpression(path.node.declaration)) {
            const callExpr = path.node.declaration;
            if (isIdentifier(callExpr.callee) && callExpr.callee.name === "defineComponent") {
              const arg = callExpr.arguments?.[0];
              const componentName = getComponentName({ filters, filename, attrs })
              if (arg && isObjectExpression(arg)) {
                for (const property of arg.properties) {
                  if (isObjectProperty(property) && isIdentifier(property.key) && property.key.name === "name") {
                    hasNameProperty = true;
                  }
                }
              }
              if (!hasNameProperty) {
                const defineOptionsCode = s.slice(callExpr.start! + loc.start.offset, callExpr.end! + loc.start.offset)
                const startPos = defineOptionsCode.indexOf('{') + 1;
                s.appendLeft(callExpr.start! + loc.start.offset + startPos, `name:'${componentName}',`);
                code = s.toString();
                isHandle = true;
              }
            }
          }
        },
        CallExpression(path) {
          if (hasNameProperty) { return }
          const callExpr = path.node;
          if (isIdentifier(callExpr.callee) && callExpr.callee.name === "defineOptions") {
            const arg = callExpr.arguments?.[0];
            const componentName = getComponentName({ filters, filename, attrs })
            if (arg && arg.type === "ObjectExpression") {
              for (const property of arg.properties) {
                if (isObjectProperty(property) &&
                  isIdentifier(property.key) && property.key.name === "name") {
                  hasNameProperty = true;
                }
              }
              if (!hasNameProperty) {
                const defineOptionsCode = s.slice(callExpr.start! + loc.start.offset, callExpr.end! + loc.start.offset)
                const startPos = defineOptionsCode.indexOf('{') + 1;
                s.appendLeft(callExpr.start! + loc.start.offset + startPos, `name:'${componentName}',`);
                code = s.toString();
              }
            } else {
              const newCall = `defineOptions({name: "${componentName}"});\n`;
              s.overwrite(callExpr.start! + loc.start.offset, callExpr.end! + loc.start.offset, newCall);
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
        const componentName = getComponentName({ filters, filename, attrs })
        let lastImportEnd = 0;
        let defineOptionsExist = false
        traverse({
          "type": "Program",
          "sourceType": "module",
          directives: [],
          body: [...scriptSetupAst ?? []],
        }, {
          noScope: true,
          ImportDeclaration(path) {
            lastImportEnd = path.node.end ?? 0
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
            directives: [],
            body: [...scriptAst ?? []],
          }, {
            noScope: true,
            ExportDefaultDeclaration(path) {
              ExportDefaultExist = true
              if (isObjectExpression(path.node.declaration)) {
                const ExportDefaultIndex = code.indexOf('export default')
                s.appendLeft(code.slice(ExportDefaultIndex).indexOf('{') + ExportDefaultIndex + 1, `name:'${componentName}',`)
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
  }
}

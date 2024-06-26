import { describe, expect, it } from 'vitest'
import ComponentA from "./components/ComponentA/index.vue?raw"
import ComponentB from "./components/ComponentB/index.vue?raw"
import TestSetupName from "./components/index.vue?raw"
import ExportDefaultExists from "./components/ExportDefault/index.vue?raw"
import SetupFunction from "./components/SetupFunction/index.vue?raw"
import { createTransform } from "../src/core/createTransform"
import { GenComponentName } from '../src/types'

const defaultInclide = ["**/index.vue"]
const defaultExclide = [/[\\/]node_modules[\\/]/, /[\\/]\.git[\\/]/, /[\\/]\.nuxt[\\/]/]
const defaultGenComponentName: GenComponentName = ({ attrName, dirname }) => attrName ?? dirname
import { createFilter } from "@rollup/pluginutils"

describe('The behavior of transform in Vue 3.3.0 and above.', () => {
  const filter = createFilter(defaultInclide, defaultExclide)
  const transform = createTransform("3.3.0", [{
    filter: filter,
    genComponentName: defaultGenComponentName
  }])
  it('Component name is dirname', () => {
    const code = transform(ComponentA, 'components/ComponentA/index.vue')?.code
    expect(code).toContain('defineOptions({ name: "ComponentA" });')
    expect(code).toMatchSnapshot()
  })

  it('setup extend name', () => {
    const code = transform(TestSetupName, 'components/index.vue')?.code
    expect(filter('components/index.vue')).toMatchInlineSnapshot(`true`)
    expect(code).toContain('defineOptions({ name: "NameForeSetup" });')
  })

  it('when define options exists', () => {
    const code = transform(ComponentB, 'components/ComponentB/index.vue')?.code
    expect(code).toContain('inheritAttrs: false')
    expect(code).toContain("name:'ComponentB'")
    expect(code).toMatchInlineSnapshot(`
      "<template>
        <div>
          {{ b }}
        </div>
      </template>

      <script setup lang="ts">
      import { defineOptions } from "vue"
      defineOptions({name:'ComponentB',
        inheritAttrs: false
      })
      const b = ('component B')
      </script>
      "
    `)
  })
})

describe('The behavior of transform in Vue 3.3.0 and below.', () => {
  const transform = createTransform("3.2.47", [{
    filter: createFilter(defaultInclide, defaultExclide),
    genComponentName: defaultGenComponentName
  }])
  it('Component name is dirname', () => {
    const code = transform(ComponentA, 'components/ComponentA/index.vue')?.code
    expect(code).not.toContain('defineOptions({ name: "ComponentA" });')
    expect(code).toMatchInlineSnapshot(`
      "
                  <script lang='ts'>
                    export default {
                      name: "ComponentA",
                    }; 

                    </script> 
      <template>
        <div>
          {{ a }}
          <ComponentB/>
        </div>
      </template>
      <script setup lang="ts">
      import ComponentB from "../ComponentB/index.vue";
      const a = ('component A')
      </script>
      "
    `)
  })

  it('setup extend name', () => {
    const code = transform(TestSetupName, 'components/index.vue')?.code
    expect(code).toContain('name: "NameForeSetup"')
    expect(code).toMatchInlineSnapshot(`
      "
                  <script lang='ts'>
                    export default {
                      name: "NameForeSetup",
                    }; 

                    </script> 
      <template>
        <div>
          {{ foo }}
        </div>
      </template>

      <script setup lang="ts" name="NameForeSetup">
      import { ref } from "vue"
      const foo = ref('foo')
      </script>
      "
    `)
  })

  it('when export default exists', () => {
    const code = transform(ExportDefaultExists, 'components/ExportDefault/index.vue')?.code
    expect(code).toContain('inheritAttrs: false')
    expect(code).toContain("name:'ExportDefault'")
    expect(code).toMatchInlineSnapshot(`
      "<template>
        <div>
          {{ b }}
        </div>
      </template>
      <script lang="ts">
      export default {name:'ExportDefault',
        inheritAttrs: false
      }
      </script>
      <script setup lang="ts">
      const b = ('component B')
      </script>
      "
    `)
  })
  it('when only setup function', () => {
    const code = transform(SetupFunction, 'components/SetupFunction/index.vue')?.code
   console.log(code)
    expect(code).toContain(`name:'SetupFunction'`)
    expect(code).toContain(`setup:()=>{`)
    expect(code).toContain(`msg: 'Component SetupFunction'`)
    expect(code).toMatchInlineSnapshot(`
    "<template>
      <div>
        <h1>{{msg}}</h1>
      </div>
    </template>
    
    <script lang="ts">
    import {defineComponent} from "vue"
    export default defineComponent({name:'SetupFunction',setup:()=>{
          return {
            msg: 'Component SetupFunction'
          }
    }})
    </script>
    "
    `)
  })
})

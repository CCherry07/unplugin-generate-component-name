import { describe, expect, it } from 'vitest'
import ComponentA from "./components/ComponentA/index.vue?raw"
import ComponentB from "./components/ComponentB/index.vue?raw"
import TestSetupName from "./components/test-setup-name.vue?raw"
import { createTransform } from "../src/core/createTransform"

describe('The behavior of transform in Vue 3.3.0 and above.', () => {
  const transform = createTransform("3.3.0")
  it('Component name is dirname', () => {
    const code = transform(ComponentA, 'components/ComponentA/index.vue')?.code
    expect(code).toContain('defineOptions({ name: "ComponentA" });')
    expect(code).toMatchSnapshot()
  })

  it('setup extend name', () => {
    const code = transform(TestSetupName, 'components/test-setup-name.vue')?.code
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

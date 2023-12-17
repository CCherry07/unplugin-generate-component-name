import { basename, dirname, extname } from "path"
import type { VueQuery, FilteringRules } from "../types"

export function parseVueRequest(id: string): {
  filename: string
  query: VueQuery
} {
  const [filename, rawQuery] = id.split(`?`, 2)
  const query = Object.fromEntries(new URLSearchParams(rawQuery)) as VueQuery
  if (query.vue != null) {
    query.vue = true
  }
  if (query.index != null) {
    query.index = Number(query.index)
  }
  if (query.raw != null) {
    query.raw = true
  }
  if (query.url != null) {
    query.url = true
  }
  if (query.scoped != null) {
    query.scoped = true
  }
  return {
    filename,
    query,
  }
}

export const getComponentName = ({ filters, filename, attrs }: {
  filters?: FilteringRules
  filename: string
  attrs: Record<string, any>
}) => {
  const geComponentName = filters?.find(({ filter }) => filter(filename))?.geComponentName
  const originalName = basename(filename).replace(extname(filename), '')
  return geComponentName
    ? geComponentName({
      filePath: filename,
      originalName,
      attrName: attrs.name,
      dirname: basename(dirname(filename))
    })
    : attrs.name ?? originalName
}

import { basename, dirname, sep } from "path"
import type { VueQuery, Filters } from "../types"

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

export function isObject(obj: any): obj is Object {
  return Object.prototype.toString.call(obj) === "[object Object]";
}

export function isString(obj: any): obj is string {
  return Object.prototype.toString.call(obj) === "[object String]";
}

export const getComponentName = ({ filters, filename, attrs }: {
  filters?: Filters
  filename: string
  attrs: Record<string, any>
}) => {
  const geComponentName = filters?.find(({ filter }) => filter(filename))?.geComponentName
  return geComponentName
    ? geComponentName(filename, filename.slice(process.cwd().length + 1).split(sep))
    : attrs.name ?? basename(dirname(filename));
}

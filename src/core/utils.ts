import { VueQuery } from "../types"

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

type FilterPattern = string | RegExp | boolean | ((id: string) => boolean) | Array<FilterPattern>;

export function createFilter(include: FilterPattern, exclude: FilterPattern) {
  const getMatcher = (id: FilterPattern): ((id: string) => boolean) => {
    if (id instanceof RegExp) {
      return id.test.bind(id);
    }
    if (typeof id === 'boolean') {
      return id ? (() => true) : (() => false);
    }
    if (typeof id === 'string') {
      if (id.startsWith('/')) {
        return (file) => id === file;
      }
      const regex = makeRegex(id);
      return (file) => regex.test(file);
    }
    if (Array.isArray(id)) {
      const ids = id.map(getMatcher).filter(Boolean);
      return (file) => ids.some((id) => id(file));
    }
    if (typeof id === 'function') {
      return id;
    }
    throw new Error(`cannot convert ${typeof id} to a matcher: ${id}`);
  };

  const filt = (pattern: FilterPattern) => {
    const fn = getMatcher(pattern);
    return (id: string) => fn(id.replace(/\\/g, '/'));
  };

  const includeFn = include && filt(include);
  const excludeFn = exclude && filt(exclude);

  return function filter(id: string) {
    if (excludeFn && excludeFn(id)) {
      return false;
    }
    if (includeFn) {
      return includeFn(id);
    }
    return !!excludeFn;
  };
}

function makeRegex(str: string) {
  const regex = str.replace(/[-[\]{}()*+?.\\^$|]/g, '\\$&').replace(/\\\*/g, '.*');
  return new RegExp(`^${regex}`, 'i');
}

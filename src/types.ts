// used?: string[] const isUse = process.env.NODE_ENV ? Array.isArray(options.used) ? options.used?.includes(process.env.NODE_ENV) : true : false

export type GenComponentName = (opt: {
  filePath: string,
  dirname: string,
  originalName: string
  attrName: string | undefined
}) => string

export type FilteringRules = {
  filter: (id: unknown) => boolean;
  genComponentName: GenComponentName;
}[]
export interface PattenOptions {
  include?: string | RegExp | (string | RegExp)[]
  exclude?: string | RegExp | (string | RegExp)[]
  genComponentName: GenComponentName
}
export interface Options extends Omit<PattenOptions, 'genComponentName'> {
  enter?: PattenOptions[]
}

export interface VueQuery {
  vue?: boolean
  src?: string
  type?: 'script' | 'template' | 'style' | 'custom'
  index?: number
  lang?: string
  raw?: boolean
  url?: boolean
  scoped?: boolean
  id?: string
}

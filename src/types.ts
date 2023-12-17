// used?: string[] const isUse = process.env.NODE_ENV ? Array.isArray(options.used) ? options.used?.includes(process.env.NODE_ENV) : true : false
export type GeComponentName = (filePath: string, dirnames: string[]) => string
export type Filters = {
  filter: (id: unknown) => boolean;
  geComponentName: GeComponentName;
}[]
export interface PattenOptions {
  include?: string | RegExp | (string | RegExp)[]
  exclude?: string | RegExp | (string | RegExp)[]
  geComponentName: GeComponentName
}
export interface Options extends Omit<PattenOptions, 'geComponentName'> {
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

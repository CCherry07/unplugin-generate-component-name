// used?: string[] const isUse = process.env.NODE_ENV ? Array.isArray(options.used) ? options.used?.includes(process.env.NODE_ENV) : true : false
export interface Options {
  include?: string | RegExp | (string | RegExp)[]
  exclude?: string | RegExp | (string | RegExp)[]
  geComponentName?: (filePath: string, dirnames: string[]) => string | undefined
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

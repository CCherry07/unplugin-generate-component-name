import { WebpackPluginInstance } from 'unplugin'
import unplugin, { Options } from '.'

export default unplugin.webpack as (options?: Options) => WebpackPluginInstance

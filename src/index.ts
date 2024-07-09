import { Plugin } from 'prettier'
import { parsers } from 'prettier/plugins/yaml'
import type { Root } from 'yaml-unist-parser'
import { sort } from './sort'

const plugin: Plugin = {
    parsers: {
        yaml: {
            ...parsers.yaml,
            astFormat: 'yaml',
            parse: (code, options) => {
                const yaml: Root = parsers.yaml.parse(code, options)
                // @ts-ignore
                const mappings = yaml.children[0].children[1].children[0].children
                const result = sort(mappings)
                // @ts-ignore
                yaml.children[0].children[1].children[0].children = result
                return yaml
            }
        }
    }
}

export default plugin

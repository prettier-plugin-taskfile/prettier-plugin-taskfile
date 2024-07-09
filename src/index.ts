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
                const mapping = yaml.children[0].children[1].children[0]
                if (mapping?.type !== 'mapping') return yaml
                const mappingItems = mapping.children
                const result = sort(mappingItems)
                mapping.children = result
                return yaml
            }
        }
    }
}

export default plugin

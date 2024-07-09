import {Plugin } from 'prettier'
import { parsers } from 'prettier/plugins/yaml'
import type { Root } from 'yaml-unist-parser'

const plugin: Plugin = {
    parsers: {
        yaml: {
            ...parsers.yaml,
            astFormat: 'yaml',
            preprocess: (code, options) => {
                const yaml: Root = parsers.yaml.parse(code, options)
                console.log(JSON.stringify(yaml, null, 2))
                return code
            }
        }
    }
}

export default plugin

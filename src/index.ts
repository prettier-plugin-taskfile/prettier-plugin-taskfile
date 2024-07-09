import {Plugin } from 'prettier'
// @ts-ignore
import { parsers, printer } from 'prettier/plugins/yaml'
import type { MappingItem, Root } from 'yaml-unist-parser'

export const compareKeys = (a: MappingItem, b: MappingItem) => {
    const priorities = ["version","includes","vars","env","tasks"]
    // @ts-ignore
    return priorities.findIndex((e) => e === a.children[0].children[0].value) - priorities.findIndex((e) => e === b.children[0].children[0].value)
}
const plugin: Plugin = {
    parsers: {
        yaml: {
            ...parsers.yaml,
            astFormat: 'yaml',
            preprocess: (code, options) => {
                const yaml = parsers.yaml.parse(code, options)
                // @ts-ignore
                const mappings = yaml.children[0].children[1].children[0].children.sort()
                mappings.sort(compareKeys)
                console.log(JSON.stringify(mappings, null, 2))
                // console.log(JSON.stringify(yaml, null, 2))
                return code
            }
        }
    }
}

export default plugin

import {Printer} from 'prettier';
// @ts-ignore
import {printers} from 'prettier/plugins/yaml'
import type {Root} from 'yaml-unist-parser'
import {sort} from './sort';

export const printer: Printer = {
  ...printers.yaml,
  preprocess: (ast: Root, options) => {
    const mapping = ast.children[0].children[1].children[0]
    if (mapping?.type !== 'mapping') return printers.yaml.preprocess(ast, options)
    const mappingItems = mapping.children
    mapping.children = sort(mappingItems)
    return printers.yaml.preprocess(ast, options)
  },
  print: (ast, options, print) => {
    return printers.yaml.print(ast, {
      ...options,
      singleQuote: true,
    }, print)
  }
}

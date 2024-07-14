import {parsers} from 'prettier/plugins/yaml'
import {printer} from './printer';

module.exports = {
  languages: [{
    name: 'taskfile',
    parsers: ['taskfile'],
    filenames: ['Taskfile.yml', 'Taskfile.yaml'],
  }],
  printers: {
    taskfile: printer,
  },
  parsers: {
    taskfile: {...parsers.yaml, astFormat: 'taskfile'},
  }
}

import prettier from 'prettier'
import plugin, { compareKeys } from './index'
const code = `
includes:
version: '3'
env:
tasks:
vars:
`

/*
version:
includes:
# optional configurations (output, silent, method, run, etc.)
vars:
env: # followed or replaced by dotenv
tasks:
 */
prettier.format(code, {
    parser: 'yaml',
    plugins: [plugin]
}).then(formatted => console.log(formatted));


import prettier from 'prettier'
import plugin from './index'
const code = `
version: '3'
env:
includes:
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

import prettier from 'prettier'
import plugin from './index'
const code = `
test0: 'hello'
includes:
test1: 'hello'
version: '3'
test2: 'hello'
env:
test3: 'hello'
tasks:
test4: 'hello'
vars:
test5: 'hello'
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


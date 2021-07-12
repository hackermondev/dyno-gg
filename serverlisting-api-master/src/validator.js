let schemas = require('./schemas/index')
const Ajv = require('ajv')
let ajv = new Ajv({allErrors: true, removeAdditional: true})

function getValidator (schema) {
    return ajv.compile(schemas[schema])
}

module.exports = {getValidator}

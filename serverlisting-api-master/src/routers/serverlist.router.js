'use strict'
const BaseRouter = require('@weeb_services/wapi-core').BaseRouter
const ServerModel = require('../DB/server.mongo')
const HTTPCodes = require('@weeb_services/wapi-core').Constants.HTTPCodes
const shuffle = require('knuth-shuffle').knuthShuffle
const Validator = require('../validator')
const Ajv = require('ajv')
const ajv = new Ajv({allErrors: true})

class ServerlistRouter extends BaseRouter {
    constructor () {
        super()
        this.get('/', async () => {
            let casualServers = await ServerModel.find({premium: false, blacklisted: false}).lean().exec()
            let premiumServers = await ServerModel.find({premium: true, blacklisted: false}).lean().exec()
            casualServers = shuffle(casualServers)
            premiumServers = shuffle(premiumServers)
            casualServers = casualServers.map(cs => removeMongoData(cs))
            premiumServers = premiumServers.map(ps => removeMongoData(ps))
            return {
                status: HTTPCodes.OK,
                casualServers: shuffle(casualServers),
                premiumServers: shuffle(premiumServers)
            }
        })
        this.post('/', async (req) => {
            const serverValidator = Validator.getValidator('serverSchema')
            let bodyCheck = serverValidator({body: req.body})
            if (!bodyCheck) {
                return {
                    status: HTTPCodes.BAD_REQUEST,
                    errors: serverValidator.errors,
                    message: ajv.errorsText(serverValidator.errors),
                    in: 'body'
                }
            }
            let server = await ServerModel.findOne({id: req.body.id})
            if (server) {
                return {
                    status: HTTPCodes.BAD_REQUEST,
                    message: 'This server is already listed'
                }
            }
            server = new ServerModel(req.body)
            await server.save()
            let res = removeMongoData(server, true)
            return {status: HTTPCodes.OK, server: res}
        })
        this.get('/details/:id', async (req) => {
            let server = await ServerModel.findOne({id: req.params.id}).lean().exec()
            if (!server) {
                return {
                    status: HTTPCodes.NOT_FOUND,
                    message: 'This server does not exist'
                }
            }
            server = removeMongoData(server)
            return {status: HTTPCodes.OK, server}
        })
        this.post('/details/:id', async (req) => {
            const serverValidator = Validator.getValidator('serverSchema')
            let bodyCheck = serverValidator({body: req.body})
            if (!bodyCheck) {
                return {
                    status: HTTPCodes.BAD_REQUEST,
                    errors: serverValidator.errors,
                    message: ajv.errorsText(serverValidator.errors),
                    in: 'body'
                }
            }
            if (req.body.id !== req.params.id) {
                return {status: HTTPCodes.BAD_REQUEST, message: 'id of path and id of body do not match'}
            }
            let server = await ServerModel.findOne({id: req.body.id})
            if (!server) {
                return {
                    status: HTTPCodes.NOT_FOUND,
                    message: 'This server does not exist'
                }
            }
            server = Object.assign(server, req.body)
            await server.save()
            let res = removeMongoData(server, true)
            return {status: HTTPCodes.OK, server: res}
        })
        this.delete('/details/:id', async (req) => {
            let server = await ServerModel.findOne({id: req.params.id}).lean().exec()
            if (!server) {
                return {
                    status: HTTPCodes.NOT_FOUND,
                    message: 'This server does not exist'
                }
            }
            let res = removeMongoData(server, false)
            await ServerModel.remove({id: server.id})
            return {status: HTTPCodes.OK, server: res, message: 'deleted server'}
        })
    }
}

/**
 * Removes some of the data returned by mongo/mongoose since it's not needed
 * @param obj
 * @param copyRef
 * @return {{} & any}
 */
function removeMongoData (obj, copyRef = false) {
    let res = !copyRef ? obj : Object.assign({}, obj._doc)
    delete res.__v
    delete res._id
    return res
}

module.exports = ServerlistRouter

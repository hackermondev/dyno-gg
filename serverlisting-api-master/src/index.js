'use strict'

const express = require('express')
const bodyParser = require('body-parser')
const winston = require('winston')
const cors = require('cors')
const mongoose = require('mongoose')
mongoose.Promise = Promise
const ServerListingRouter = require('./routers/serverlist.router')
const WildcardRouter = require('@weeb_services/wapi-core').WildcardRouter
const SimpleAuthenticationMiddleware = require('./middleware/SimpleAuthenticationMiddleware')
winston.remove(winston.transports.Console)
winston.add(winston.transports.Console, {
    timestamp: true,
    colorize: true
})

let init = async () => {
    let config
    try {
        config = require('../config/main.json')
    } catch (e) {
        winston.error(e)
        winston.error('Failed to require config.')
        return process.exit(1)
    }
    winston.info('Config loaded.')

    try {
        await mongoose.connect(config.dburl, {useMongoClient: true})
    } catch (e) {
        winston.error('Unable to connect to Mongo Server.')
        return process.exit(1)
    }
    winston.info('MongoDB connected.')

    // Initialize express
    let app = express()

    // Middleware for config
    app.use((req, res, next) => {
        req.config = config
        next()
    })
    app.use(new SimpleAuthenticationMiddleware({token: config.token, whitelist: config.whitelist}).middleware())
    // Some other middleware
    app.use(bodyParser.json())
    app.use(bodyParser.urlencoded({extended: true}))
    app.use(cors())

    // add custom routers here:
    app.use(new ServerListingRouter().router())
    // Always use this last
    app.use(new WildcardRouter().router())

    app.listen(config.port, config.host)
    winston.info(`Server started on ${config.host}:${config.port}`)
}

init()
    .catch(e => {
        winston.error(e)
        winston.error('Failed to initialize.')
        process.exit(1)
    })

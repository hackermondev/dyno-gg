'use strict'

const BaseMiddleware = require('@weeb_services/wapi-core').BaseMiddleware
const HTTPCodes = require('@weeb_services/wapi-core').Constants.HTTPCodes

/**
 * Simple Authentication Middleware
 */
class SimpleAuthenticationMiddleware extends BaseMiddleware {
    /**
   *
   * @param {Object} options Options for the SimpleAuthProvider
   * @param {String} options.token Admintoken which allows access to every route
   * that is not whitelisted in the config
   * @param {Array} [options.whitelist] - a whitelist of routes that do not require auth
   */
    constructor (options) {
        super()
        options = this.checkOptions(options)
        this.options = options
    }

    /**
   * Function that checks if all needed option keys are set,
   * throws error otherwise
   * @param {Object} options
   * @param {String} options.token - the master auth token
   * @param {Array} [options.whitelist] - a whitelist of routes that do not require auth
   * @returns {Object} options - the original options
   */
    checkOptions (options) {
        if (!options.token) {
            throw new Error('No master authorization token provided!')
        }
        if (options.whitelist && options.whitelist.length > 0) {
            for (let i = 0; i < options.whitelist.length; i++) {
                this.whitelist(options.whitelist[i].path, options.whitelist[i].method)
            }
        }
        return options
    }

    async exec (req) {
        if (!req.headers || !req.headers.authorization) return HTTPCodes.UNAUTHORIZED
        let authHeader = req.headers.authorization
        if (authHeader !== this.options.token) {
            return HTTPCodes.UNAUTHORIZED
        }
        return HTTPCodes.OK
    }
}

module.exports = SimpleAuthenticationMiddleware

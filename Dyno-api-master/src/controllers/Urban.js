'use strict';

const Controller = require('../core/Controller');
const urbaner = require('../helpers/Urbaner.js');
const config = require('../core/config.js');

class Urban extends Controller {

	/**
	 * Constructor
	 * @returns {Object}
	 */
	constructor() {
		super();

		// define routes
		return {
			shorten: {
				method: 'get',
				uri: '/api/v1/urban/define',
				handler: this.define.bind(this),
			}
		};
	}

    async define(req, res) {
        let term = req.query.term;
        if(!term) {
            res.status(500).send("Please provide a valid term!");
        }

       let response = await urbaner.define(term);
       res.send(response);
    }
}

module.exports = Urban;

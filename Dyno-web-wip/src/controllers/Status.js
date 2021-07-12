'use strict';

const Controller = require('../core/Controller');
const config = require('../core/config');
const redis = require('../core/redis');
const superagent = require('superagent');

/**
 * Status controller
 * @class Status
 * @extends {Controller}
 */
class Status extends Controller {

	/**
	 * Constructor
	 * @returns {Object}
	 */
	constructor(bot) {
		super(bot);

		// define routes
		return {
			status: {
				method: 'get',
				uri: '/status',
				handler: this.index.bind(this),
			},
			api: {
				method: 'get',
				uri: '/api/status',
				handler: this.api.bind(this),
			},
		};
	}

  index(bot, req, res) {
    res.locals.scripts.push('/js/react/status.js');
    res.locals.stylesheets.push('status');
    return res.render('status');
  }

	async api(bot, req, res) {

		let statusesFromRedis = {};
		Object.keys(config.servers).forEach(server => {
      statusesFromRedis[server] = redis.get(`dyno:status:${server}`);
		});

		let statuses = await Promise.props(statusesFromRedis).catch(() => false);

		if (Object.values(statuses).includes(null)) {
      let requests = {};
      Object.keys(config.servers).forEach((server) => {
      	try {
          requests[server] = superagent.get(`http://${server}.dyno.lan:5000/shards`).timeout(10000);
        } catch (error) {
          requests[server] = false;
        }
      });

      let promiseWrap = {};

			Object.keys(requests).forEach(key => {
        promiseWrap[key] = new Promise(resolve => {
          let value;
          requests[key].then(res => {
            value = res;
          }).catch(res => {
            value = false;
          }).then(_ => {
            resolve(value);
          })
				})
			})

      const requestsFromServer = await Promise.props(promiseWrap).catch(_ => false);

      if (requestsFromServer === false) {
        Object.keys(config.servers).forEach(server => {
          let clusters = {};
          for (let i = 0; i < config.clustersPerServer; i++) {
            clusters[i] = {
              id: String(i),
              error: "Cluster offline."
            };
          }
          statuses[server] = JSON.stringify(Object.values(clusters));
				});
			} else {
        Object.keys(requestsFromServer).forEach(server => {
          let response = requestsFromServer[server];
          let clustersFromResponse = [];
          if (response && response.text) {
            clustersFromResponse = JSON.parse(response.text);
          }
          let clusters = {};
          for (let i = 0; i < config.clustersPerServer; i++) {
            clusters[i] = clustersFromResponse.find(cluster => i == cluster.id);
            if (clusters[i] === null || clusters[i] === undefined) {
              clusters[i] = {
                id: String(i),
                error: "Cluster offline."
              };
            }
          }
          Object.keys(clusters).forEach(cluster => {
            if (clusters[cluster].error !== undefined) {
              let extrapolationCluster = Object.values(clusters).find(search => search.error === undefined);
              if (extrapolationCluster !== undefined) {
                let multiplier = (cluster - (extrapolationCluster.id * 1)) * config.shardsPerCluster;
                let firstShardOfExtrapolate = extrapolationCluster.result.shards[0];
                let firstShard = firstShardOfExtrapolate + multiplier;
                clusters[cluster].guessedShards = [...new Array(config.shardsPerCluster).keys()].map(i => i + firstShard);
              }
            }
          })
          statuses[server] = JSON.stringify(Object.values(clusters));
        });
      }

      Object.keys(config.servers).map(server => redis.set(`dyno:status:${server}`, statuses[server], 'EX', 10));
		}

		let resp = {};
		Object.keys(statuses).forEach(server => {
			resp[config.servers[server]] = JSON.parse(statuses[server]);
		});

		return res.send(resp);
	}
}

module.exports = Status;

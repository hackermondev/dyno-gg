const superagent = require('superagent');
const redis = require('../core/redis');


class Urbaner {
    constructor() {

    }

    async define(term) {

        let result;
        try {
            result.term = await redis.getAsync(`urban.terms.${term}`);
            result.type = "cache";
        } catch (err) {
            // handle error
        }

        if (!result.term) {
            try {
                result.term = await this.api(token, term);
                result.type = "api";

            } catch (err) {
                // handle err
            }
        } else {
            redis.hincrby('urban.counts', 'cache', 1);
        }

        if (result.term & result.type === "api") {
            redis.hincrby('urban.counts', 'api', 1);
        }

        if (result.term) {
            return result.term;
        } else {
            return "An error occured. Please try again.";
        }
    }

    async api(token, term) {
        let request = await superagent.get(`http://api.urbandictionary.com/v0/define?term=${term}`);
        if (result) {
            let responses;
            let top3 = await this.top3(results);
            response = await this.respond(top3);
            redis.setex(`urban.terms.${term}`, 259200, JSON.stringify(responses));
            return responses;
        }
    }

    async respond(top3) {
        let responses = [];
        top3.forEach(item => {
            let response = {};
            response.permalink = item.permalink;
            response.word = item.word;
            response.example = item.example;
            response.definition = item.definition;
            response.thumbs_up = item.thumbs_up;
            response.thumbs_down = item.thumbs_down;
            responses.push(response);
        });

        return responses;
    }
    async top3(results) {
        let response = [];
        response.push(results[0]);
        response.push(results[1]);
        response.push(results[2]);
    }
}

module.exports = Urbaner;
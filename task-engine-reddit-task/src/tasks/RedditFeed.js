const config = require('../config');
const Task = require('../Task');
const logger = require('../logger')('Reminders', 'reminders');
const snoowrap = require('snoowrap');

class RedditFeed extends Task {
    constructor() {
        super();

        logger.info('Starting RedditFeed Task.');

        this.reddit = new snoowrap({ 
            clientId: 'AbSnJWHm4H0HaA',
            clientSecret: '1qyGVXB1Vso3CV2Vb9Enb9NPN6s',
            userAgent: 'discord:dynobot:v0.1.0 (by /u/germanoeich)',
            refreshToken: '242653594028-cESctbvro0G7PGvK2JwxGkSugVw',
        });

        this.interval = setInterval(() => {
            this.fetchPosts();
        }, 1000);
    }

    async fetchPosts() {
        const options = {
            limit: 100,
            after: this.lastFetchedId || undefined,
        }

        console.log(options.after);

        this.sub = this.sub || await this.reddit.getSubreddit('all');
        console.log('fetch start')
        const posts = await this.sub.getNew(options);
        console.log('fetch end')

        // posts.forEach((p) => console.log(p.name));

        if (posts && posts.length > 0 && posts[posts.length - 1].name) {
            this.lastFetchedId = posts[posts.length - 1].name;
        }
	}
}

const task = new RedditFeed();

const moment = require('moment');
const config = require('../config');
const Task = require('../Task');
const logger = require('../logger')('Automessage', 'automessage');

class Automessage extends Task  {
    constructor() {
        super();

        logger.info('Starting Automessage Task');

        // this.schedule('*/1 * * * *', this.post.bind(this));

        this.getUser().catch(err => {
            throw new Error(err);
        })
    }

    getUser() {
        return this.client.getSelf(config.userId).then(user => this.user = user);
    }

    async post() {
        let docs;
		try {
			docs = await this.models.Automessage.find({ disabled: { $ne: true }, nextPost: { $lte: Date.now() } }).lean().exec();
		} catch (err) {
			return logger.error(err);
		}

		if (!docs || !docs.length) {
			return;
		}

		this.asyncForEach(docs, async (doc) => {
			if (doc.disabled) {
				return;
            }

			const guildConfig = await this.models.Server.findOne({ _id: doc.guild }).lean().exec().catch(() => null);
            if (guildConfig.modules.hasOwnProperty('Automessage') && guildConfig.modules.Automessage === false) {
                return this.models.Automessage.remove({ _id: doc._id }).catch(() => null);
			}
			
			if ((config.isPremium && !guildConfig.isPremium) || (!config.isPremium && guildConfig.isPremium)) {
				return;
			}

			logger.debug(`Posting to ${doc.guild} ${doc.channel}`);

			const options = {};

			if (doc.content) {
				options.content = doc.content;
			}

			if (doc.embed) {
				options.embeds = [doc.embed];
			}

			this.postWebhook(doc.channel, doc.webhook, options)
				.then(() => {
					const second = moment().second();
					const nextPost = moment()
						.add(doc.interval, 'minutes')
						.subtract(second % 15, 'seconds')
                        .toDate();
                        
                    logger.debug(`Posted to ${doc.channel}`);

					return this.models.Automessage.update({ _id: doc._id }, { $set: { nextPost: nextPost } }).catch(() => null);
				})
				.catch((err) => {
					let update = { $inc: { errorCount: 1 } };
					if (doc.errorCount >= 5) {
						update = Object.assign(update, {
							$set: { disabled: true, disabledAt: moment().toDate() },
						});
					}
					return this.models.Automessage.update({ _id: doc._id }, update).catch(() => null);
				});
		});
    }

    postWebhook(channelId, webhook, options) {
		const avatarURL = `https://cdn.discordapp.com/avatars/${this.user.id}/${this.user.avatar}.jpg?r=${config.version}`;

		let payload = {
			username: 'Dyno',
			avatarURL: avatarURL,
			tts: false,
			wait: true,
		};

		payload = Object.assign(payload, options);

		return this.client.executeWebhook(webhook.id, webhook.token, payload);
	}
}

const task = new Automessage();

'use strict';

const braintree = require('braintree');
const axios = require('axios');
const config = require('../core/config');
const logger = require('../core/logger');
const Controller = require('../core/Controller');
const utils = require('../core/utils');
const db = require('../core/models');

const { models, mongoose } = db;

let data = config.braintree;
if (config.braintree.sandbox) {
	data.environment = braintree.Environment.Sandbox;
} else {
	data.environment = braintree.Environment.Production;
}
const gateway = braintree.connect(data);

/**
 * Account/Upgrade controller
 * @class Account
 * @extends {Controller}
 */
class Account extends Controller {

	/**
	 * Constructor
	 * @returns {Object}
	 */
	constructor(bot) {
		super(bot);

		this.getPlans().catch(err => {
			throw new Error(err);
		});

		// define routes
		return {
			account: {
				method: 'get',
				uri: [
					'/account',
					'/account/premium',
					'/account/listing',
					'/account/manage',
				],
				handler: this.account.bind(this),
			},
			data: {
				method: 'get',
				uri: '/account/data',
				handler: this.data.bind(this),
			},
			activate: {
				method: 'post',
				uri: '/account/activate',
				handler: this.activate.bind(this),
			},
			deactivate: {
				method: 'post',
				uri: '/account/deactivate',
				handler: this.deactivate.bind(this),
			},
			upgrade: {
				method: 'get',
				uri: '/upgrade',
				handler: this.upgrade.bind(this),
			},
			process: {
				method: 'post',
				uri: '/upgrade/process',
				handler: this.process.bind(this),
			},
			plans: {
				method: 'get',
				uri: '/upgrade/plans',
				handler: this.plans.bind(this),
			},
			token: {
				method: 'post',
				uri: '/upgrade/token',
				handler: this.getCustomerToken.bind(this),
			},
			cancel: {
				method: 'post',
				uri: '/account/subscriptions/:id/cancel',
				handler: this.cancelSubscription.bind(this),
			},
			ingest: {
				method: 'post',
				uri: '/braintree/ingest',
				handler: this.ingest.bind(this),
			},
		};
	}

	async checkServersWithinSubscription(userId) {
		let premiumUser = await this.getPremiumUser(null, null, userId);

		let dynoPremiumSubscriptions = premiumUser.subscriptions.filter(subscription => subscription.planId.startsWith('premium-'));
		let dynoPremiumServers = 0;
		if (dynoPremiumSubscriptions.length) {
			dynoPremiumServers = dynoPremiumSubscriptions.map(i => i.qty).reduce((a, c) => a + c);
		}

		let activatedGuilds = await models.Server
			.find({ premiumUserId: userId })
			.sort({ memberCount: 1 })
			.lean()
			.exec();

		if (activatedGuilds.length > dynoPremiumServers) {
			let removal = activatedGuilds.length - dynoPremiumServers;
			let guildsToBeDeactivated = activatedGuilds.slice(0, removal + 1);
			await models.Server.update({
				_id: { $in: guildsToBeDeactivated.map(g => g._id) }
			}, { $unset: { isPremium: '', premiumUserId: '', premiumSince: '' } })

			guildsToBeDeactivated.forEach(async (guild) => {
				const logDoc = {
					serverID: guild._id,
					serverName: guild.name,
					ownerID: guild.ownerID,
					userID: userId || 'Unknown',
					timestamp: new Date().getTime(),
					type: 'disable',
					reason: 'expire',
				};
				await db.collection('premiumactivationlogs').insert(logDoc);
			});
		}
	}

	async ingest(bot, req, res) {
		try {
			let notification = await gateway.webhookNotification.parse(
				req.body.bt_signature,
				req.body.bt_payload);
			console.log("[Webhook Received " + notification.timestamp + "] | Kind: " + notification.kind);

			switch (notification.kind) {
				case braintree.WebhookNotification.Kind.SubscriptionCanceled:
				case braintree.WebhookNotification.Kind.SubscriptionExpired:
					let subscription = await models.BraintreeSubscription.findOne({ _id: notification.subscription.id }).lean().exec();
					await models.BraintreeSubscription.updateOne({ _id: notification.subscription.id }, {
						$set: {
							firstBillingDate: notification.subscription.firstBillingDate,
							nextBillingDate: notification.subscription.nextBillingDate,
							status: notification.subscription.status,
							paidThroughDate: notification.subscription.paidThroughDate,
							failureCount: notification.subscription.failureCount,
							paymentMethodToken: notification.subscription.paymentMethodToken,
							currentBillingCycle: notification.subscription.currentBillingCycle,
							numberOfBillingCycles: notification.subscription.currentBillingCycle,
							cancelled: true
						}
					});
					await this.checkServersWithinSubscription(subscription.premiumUserId);
					break;
				case braintree.WebhookNotification.Kind.SubscriptionChargedSuccessfully:
					await models.BraintreeSubscription.updateOne({ _id: notification.subscription.id }, {
						$set: {
							firstBillingDate: notification.subscription.firstBillingDate,
							nextBillingDate: notification.subscription.nextBillingDate,
							status: notification.subscription.status,
							paidThroughDate: notification.subscription.paidThroughDate,
							failureCount: notification.subscription.failureCount,
							paymentMethodToken: notification.subscription.paymentMethodToken,
							currentBillingCycle: notification.subscription.currentBillingCycle,
							numberOfBillingCycles: notification.subscription.numberOfBillingCycles,
						}
					});
					break;
			}


		} catch (err) {
			console.error(err);
		}
		return res.status(200).send('OK');
	}

	async cancelSubscription(bot, req, res) {
		if (!req.session || !req.session.auth) return res.redirect('/');
		let premiumUser = await models.PremiumUser.findOne({ _id: req.session.user.id });
		if (premiumUser) {
			if (premiumUser.subscriptions.findIndex(i => i == req.params.id) >= 0) {
				let subscription = await models.BraintreeSubscription.findOne({ _id: req.params.id }).lean().exec();
				if (subscription.cancelled) {
					return res.status(403).send('Forbidden.');
				} else {
					let cancelResponse = await gateway.subscription.update(subscription._id, {
						numberOfBillingCycles: subscription.currentBillingCycle,
					});
					if (!cancelResponse.success) {
						return res.status(500).send('Error');
					} else {
						await models.BraintreeSubscription.updateOne({ _id: req.params.id }, { $set: { numberOfBillingCycles: subscription.currentBillingCycle, cancelled: true } });
						return res.status(200).send('OK');
					}
				}
			} else {
				return res.status(403).send('Forbidden.');
			}
		} else {
			return res.redirect('/account');
		}
	}

	async getPlans() {
		const result = await gateway.plan.all();
		this.plans = result.plans;
	}

	async getCustomerToken(bot, req, res) {
		let options = {};
		if (!(!req.session || !req.session.auth)) {
			let premiumUser = await models.PremiumUser.findAndPopulate(req.session.user.id);
			if (premiumUser) {
				options = {
					customerId: premiumUser.customerId
				}
			}
		}

		const tokenResponse = await gateway.clientToken.generate(options);
		let token = null;
		if (tokenResponse.success) {
			token = tokenResponse.clientToken;

		} else {
			//
		}

		return res.send({ token });
	}

	async getPremiumUser(bot, req, res) {
		let id = (bot === null && req === null) ? res : req.session.user.id;
		let premiumUser = await models.PremiumUser.findAndPopulate(id);

		if (!premiumUser) {
			premiumUser = new models.PremiumUser({
				_id: req.session.user.id,
			}, false);
			await premiumUser.save();
		}

		premiumUser.subscriptions = premiumUser.subscriptions.map(subscription => {
			subscription = subscription.toObject();
			let planObject = this.plans.find(p => p.id === subscription.planId);
			if (planObject !== undefined) {
				subscription.planObject = planObject;
			}
			return subscription;
		}).filter(subscription => subscription.status !== 'Canceled');

		return premiumUser;
	}

	async data(bot, req, res) {
		if (!req.session || !req.session.auth) return res.status(400).send('Login required.');

		let guilds = req.session.guilds.concat(req.session.allGuilds.filter(guild => {
			return req.session.guilds.findIndex(g => g.id === guild.id) < 0;
		}));

		let manageableGuildsIds = req.session.guilds.map((g) => g.id);

		let premiumUser = await this.getPremiumUser(bot, req, res);

		let activatedGuilds = await models.Server
			.find({ premiumUserId: req.session.user.id })
			.sort({ memberCount: -1 })
			.lean()
			.exec();

		return res.send({
			premiumUser,
			guilds,
			activatedGuilds,
			manageableGuildsIds,
		});
	}

	async plans(bot, req, res) {
		try {
			const plans = this.plans;

			const premiumPlans = [
				{
					...plans.find(p => p.id === 'premium-1x'),
					qty: 1,
				},
				{
					...plans.find(p => p.id === 'premium-3x'),
					qty: 3,
				},
				{
					...plans.find(p => p.id === 'premium-5x'),
					qty: 5,
				},
			];

			// const premiumPlans = plans.filter(p => p.id.startsWith('premium-')).sort((a, b) => a.price - b.price);
			const listingPlans = plans.filter(p => p.id.startsWith('listing-')).sort((a, b) => a.price - b.price);

			return res.send({
				plans: { premiumPlans, listingPlans },
			});
		} catch (err) {
			return res.status(500).send(err);
		}
	}

	async upgrade(bot, req, res) {
		res.locals.user = req.session.user;

		if (req.query.selected_guild) {
			res.locals.selected_guild = req.query.selected_guild;
		}

		// if (req.query.prod) {
		// 	res.locals.prod = req.query.prod;
		// }

		res.locals.stylesheets.push('pages/upgrade');
		res.locals.scripts.push('/js/react/account.js');

		return res.render('upgrade');
	}

	async account(bot, req, res) {
		if (!req.session || !req.session.user) {
			return res.redirect('/auth');
		}
		
		res.locals.user = req.session.user;

		let guildsQuery = await models.Server
			.aggregate([{ $match: { premiumUserId: req.session.user.id } }, { $count: "activated_servers" }]);

		res.locals.premiumServers = guildsQuery.length ? guildsQuery[0].activated_servers : 0;

		res.locals.stylesheets.push('pages/account');
		res.locals.scripts.push('/js/react/account.js');

		return res.render('account');
	}

	async activate(bot, req, res) {

		let premiumUser = await this.getPremiumUser(bot, req, res);

		let dynoPremiumSubscriptions = premiumUser.subscriptions.filter(subscription => subscription.planId.startsWith('premium-'));
		let dynoPremiumServers = 0;
		if (dynoPremiumSubscriptions.length) {
			dynoPremiumServers = dynoPremiumSubscriptions.map(i => i.qty).reduce((a, c) => a + c);
		}

		let guildsQuery = await models.Server
			.aggregate([{ $match: { premiumUserId: req.session.user.id } }, { $count: "activated_servers" }]);

		let guildsCount = guildsQuery.length ? guildsQuery[0].activated_servers : 0;

		if (guildsCount >= dynoPremiumServers) {
			return res.status(402).send('You have reached your maximum number of servers. Please deactivate other servers or consider purchasing an additional plan.');
		}

		const { serverId } = req.body;

		try {
			let serverModel = await models.Server.findOne({ _id: serverId }).lean().exec();
			if (serverModel.isPremium === true) {
				return res.status(400).send('This server has premium already.');
			}

			await models.Server.updateOne({ _id: serverId }, { $set: { isPremium: true, premiumUserId: req.session.user.id, premiumSince: new Date().getTime() } });

			const logDoc = {
				serverID: serverModel._id,
				serverName: serverModel.name,
				ownerID: serverModel.ownerID,
				userID: req.session.user.id,
				username: utils.fullName(req.session.user),
				memberCount: serverModel.memberCount || 0,
				region: serverModel.region || 'Unknown',
				timestamp: new Date().getTime(),
				type: 'enable',
			};

			await db.collection('premiumactivationlogs').insert(logDoc);

			return res.status(200).send('OK');

		} catch (err) {
			console.error(err);
			logger.error(err);
			return res.status(400).send('Unable to process this activation.');
		}
	}

	async deactivate(bot, req, res) {
		const { serverId } = req.body;

		try {
			let serverModel = await models.Server.findOne({ _id: serverId }).lean().exec();
			if (!serverModel.isPremium) {
				return res.status(400).send('This server does not have Dyno Premium.');
			}

			if (serverModel.premiumUserId !== req.session.user.id) {
				return res.status(401).send('Unauthorized.');
			}

			await models.Server.updateOne({ _id: serverId }, { $unset: { isPremium: '', premiumUserId: '', premiumSince: '' } });

			const logDoc = {
				serverID: serverModel._id,
				serverName: serverModel.name,
				ownerID: serverModel.ownerID,
				userID: req.session.user.id || 'Unknown',
				timestamp: new Date().getTime(),
				type: 'disable',
			};

			await db.collection('premiumactivationlogs').insert(logDoc);

			return res.status(200).send('OK');

		} catch (err) {
			console.error(err);
			logger.error(err);
			return res.status(400).send('Unable to process this deactivation.');
		}
	}

	async process(bot, req, res) {

		const nonce = req.body.paymentMethodNonce;
		const planId = req.body.planId;

		if (!nonce || !planId) {
			return res.status(400).send('Missing required parameters.');
		}

		if (!req.session || !req.session.auth) return res.redirect('/');

		try {
			let customerResponse;
			let existingCustomer = await models.PremiumUser.findOne({ _id: req.session.user.id });
			if (existingCustomer) {
				customerResponse = await gateway.customer.update(existingCustomer.customerId, {
					firstName: req.session.user.username,
					lastName: '#' + req.session.user.discriminator,
					email: req.session.user.email,
					paymentMethodNonce: nonce,
				});
			} else {
				customerResponse = await gateway.customer.create({
					firstName: req.session.user.username,
					lastName: '#' + req.session.user.discriminator,
					email: req.session.user.email,
					paymentMethodNonce: nonce,
					customFields: { discord_user_id: req.session.user.id }
				});
			}

			if (!customerResponse.success) {
				console.error(customerResponse);
				return res.status(500).send({ error: customerResponse.message });
			}

			const token = customerResponse.customer.paymentMethods[customerResponse.customer.paymentMethods.length - 1].token;

			const subResponse = await gateway.subscription.create({
				paymentMethodToken: token,
				planId: planId,
			});

			console.log(subResponse);

			if (!subResponse.success) {
				throw subResponse;
				return;
			}

			const plan = this.plans.find(p => p.id === planId);

			const planToServerMap = {
				'premium-1x': 1,
				'premium-3x': 3,
				'premium-5x': 5,
			};

			const subscription = new models.BraintreeSubscription({
				_id: subResponse.subscription.id,
				premiumUserId: req.session.user.id,
				firstBillingDate: subResponse.subscription.firstBillingDate,
				nextBillingDate: subResponse.subscription.nextBillingDate,
				planId: subResponse.subscription.planId,
				status: subResponse.subscription.status,
				paidThroughDate: subResponse.subscription.paidThroughDate,
				failureCount: subResponse.subscription.failureCount,
				paymentMethodToken: subResponse.subscription.paymentMethodToken,
				currentBillingCycle: subResponse.subscription.currentBillingCycle,
				numberOfBillingCycles: subResponse.subscription.numberOfBillingCycles,
				premiumSubscription: true,
				qty: planToServerMap[plan.id],
			}, false);
			await subscription.save();

			const premiumUser = existingCustomer ? existingCustomer : new models.PremiumUser({
				_id: req.session.user.id,
				customerId: customerResponse.customer.id,
				paymentMethods: customerResponse.customer.paymentMethods,
			}, false);
			premiumUser.paymentMethods = customerResponse.customer.paymentMethods;
			premiumUser.subscriptions.push(subscription);
			await premiumUser.save();

			return res.send(subResponse);
		} catch (err) {
			console.error(err);
			logger.error(err);
			return res.status(422).send({
				error: err.message,
				transaction: err.transaction.id,
				processorResponse: {
					code: err.transaction.processorResponseCode,
					text: err.transaction.processorResponseText,
					additional: err.transaction.additionalProcessorResponse,
				},
			});
		}
	}

	subBronze(bot, req, res) {
		// handle bronze
	}

	subSilver(bot, req, res) {
		// handle silver
	}

	subGold(bot, req, res) {
		// handle gold
	}
}

module.exports = Account;

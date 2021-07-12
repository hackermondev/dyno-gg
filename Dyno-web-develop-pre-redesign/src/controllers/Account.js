'use strict';

const braintree = require('braintree');
const axios = require('axios');
const patreon = require('patreon');
const config = require('../core/config');
const logger = require('../core/logger').get('Account');
const Controller = require('../core/Controller');
const utils = require('../core/utils');
const db = require('../core/models');
const crypto = require('crypto');

const { models, mongoose } = db;

let data = config.braintree;
if (config.braintree.sandbox) {
	data.environment = braintree.Environment.Sandbox;
} else {
	data.environment = braintree.Environment.Production;
}
const gateway = braintree.connect(data);

const patreonAPI = patreon.patreon;
const patreonOAuth = patreon.oauth;

const CLIENT_ID = config.patreonClientId;
const CLIENT_SECRET = config.patreonClientSecret;

if (CLIENT_ID && CLIENT_SECRET) {
	const patreonOAuthClient = patreonOAuth(CLIENT_ID, CLIENT_SECRET);
}

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
			// beforeAccount: {
			// 	method: 'use',
			// 	uri: [
			// 		'/account/*',
			// 	],
			// 	handler: this.beforeAccount.bind(this),
			// },
			account: {
				method: 'get',
				uri: [
					'/account',
					'/account/premium',
					'/account/premium/:id',
					'/account/listing',
					'/account/manage',
					'/account/patreon',
				],
				handler: this.account.bind(this),
			},
			data: {
				method: 'get',
				uri: '/account/data/:userId?',
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
			processPatreon: {
				method: 'post',
				uri: '/patreon/process',
				handler: this.processPatreon.bind(this),
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

	beforeAccount(bot, req, res, next) {
		return next();
	}

	async checkServersWithinSubscription(userId, premiumUser) {
		premiumUser = premiumUser || await this.getPremiumUser(null, null, userId);

		let dynoPremiumSubscriptions = premiumUser.subscriptions.filter(subscription => subscription.planId.startsWith('premium-'));
		let dynoPremiumServers = 0;
		if (dynoPremiumSubscriptions.length) {
			dynoPremiumServers = dynoPremiumSubscriptions.map(i => i.qty).reduce((a, c) => a + c);
		}

		let activatedGuilds = await models.Server
			.find({ premiumUserId: userId, subscriptionType: 'braintree' })
			.sort({ memberCount: 1 })
			.lean()
			.exec();

		if (activatedGuilds.length > dynoPremiumServers) {
			let removal = activatedGuilds.length - dynoPremiumServers;
			let guildsToBeDeactivated = activatedGuilds.slice(0, removal + 1);
			await models.Server.update({
				_id: { $in: guildsToBeDeactivated.map(g => g._id) },
			}, { $unset: { isPremium: '', premiumUserId: '', premiumSince: '' } });

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
			logger.info("[Webhook Received " + notification.timestamp + "] | Kind: " + notification.kind, 'braintree', notification);

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
							cancelled: true,
						},
					});
					const premiumUser = await this.getPremiumUser(null, null, subscription.premiumUserId);
					await this.checkServersWithinSubscription(subscription.premiumUserId, premiumUser);

					const dynoPremiumSubscriptions = premiumUser.subscriptions.filter(subscription => subscription.planId.startsWith('premium-'));
					if (subscription.premiumUserId && !dynoPremiumSubscriptions.length) {
						try {
							this.client.removeGuildMemberRole('203039963636301824', subscription.premiumUserId, '265342465483997184', 'Braintree subscription').catch(() => { });
							await models.Moderation.deleteMany({ userid: subscription.premiumUserId, server: '203039963636301824', type: 'role', role: '265342465483997184' });
						} catch (err) {
							logger.error(err);
						}
					}

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
						},
					});
					break;
			}
		} catch (err) {
			res.status(500).send('An error occured when processing the payment: ', err.message);
		}
		return res.status(200).send('OK');
	}

	async cancelSubscription(bot, req, res) {
		if (!req.session || !req.session.auth) return res.redirect('/');

		if (req.body.premiumUser && !req.session.isAdmin) {
			return res.status(403).send('Forbidden.');
		}

		let premiumUser = (req.body && req.body.premiumUser) || await models.PremiumUser.findOne({ _id: req.session.user.id });
		if (premiumUser) {
			if (premiumUser.subscriptions.findIndex(i => i == req.params.id) >= 0) {
				let subscription = await models.BraintreeSubscription.findOne({ _id: req.params.id }).lean().exec();
				if (subscription.cancelled) {
					return res.status(403).send('Forbidden.');
				} else {
					let subscriptionFromBraintree = await gateway.subscription.find(subscription._id);

					let cancelResponse = await gateway.subscription.update(subscription._id, {
						numberOfBillingCycles: subscriptionFromBraintree.currentBillingCycle,
					});
					if (!cancelResponse.success) {
						return res.status(500).send('Error');
					} else {
						await models.BraintreeSubscription.updateOne({ _id: req.params.id }, { $set: { numberOfBillingCycles: subscription.currentBillingCycle, cancelled: true } });

						await this.postWebhook(config.subscriptionWebhook, {
							embeds: [
								{
									title: 'Subscription Cancelled',
									color: '16729871',
									fields: [
										{ name: 'ID', value: subscription._id, inline: true },
										{ name: 'User ID', value: subscription.premiumUserId, inline: true },
										{ name: 'Plan ID', value: subscription.planId, inline: true },
										{ name: 'Initiated By', value: req.session.user.id, inline: true },
										{ name: 'Quantity', value: subscription.qty.toString(), inline: true },
									],
								},
							],
            				tts: false,
						});

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
			token = (await gateway.clientToken.generate()).clientToken;
		}

		return res.send({ token });
	}

	async getPremiumUser(bot, req, res, isImpersonation = false) {
		let id = (bot === null && req === null) ? res : req.session.user.id;
		let premiumUser = await models.PremiumUser.findAndPopulate(id);

		if (!premiumUser) {
			// premiumUser = new models.PremiumUser({
			// 	_id: req.session.user.id,
			// }, false);
			// await premiumUser.save();

			premiumUser = {
				_id: id,
				subscriptions: [],
			};
		} else {
			premiumUser = premiumUser.toObject();
		}

		premiumUser.subscriptions = premiumUser.subscriptions.map(subscription => {
			let planObject = this.plans.find(p => p.id === subscription.planId);
			if (planObject !== undefined) {
				subscription.planObject = planObject;
			}
			return subscription;
		});

		if (!isImpersonation) {
			premiumUser.subscriptions = premiumUser.subscriptions.filter(subscription => subscription.status === 'Active');
		}

		return premiumUser;
	}

	async data(bot, req, res) {
		if (!req.session || !req.session.auth) return res.status(400).send('Login required.');

		if (req.params.userId && !req.session.isAdmin) return res.status(403).send();

		const userId = req.params.userId || req.session.user.id;
		const isImpersonation = !!req.params.userId;

		let guilds = req.session.guilds.concat(req.session.allGuilds.filter(guild => {
			return req.session.guilds.findIndex(g => g.id === guild.id) < 0;
		}));

		let manageableGuildsIds = req.session.guilds.map((g) => g.id);

		let premiumUser;
		if (isImpersonation) {
			premiumUser = await this.getPremiumUser(null, null, userId, true);
		} else {
			premiumUser = await this.getPremiumUser(bot, req, res);
		}

		let activatedGuilds = await models.Server
			.find({ premiumUserId: userId })
			.sort({ memberCount: -1 })
			.lean()
			.exec();

		let subscriptionGuilds = activatedGuilds.filter((g) => ['braintree', 'staff', 'admin'].includes(g.subscriptionType));
		let patreonGuilds = activatedGuilds.filter(g => g.subscriptionType === 'patreon');

		return res.send({
			premiumUser,
			guilds,
			subscriptionGuilds,
			patreonGuilds,
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

		res.locals.stylesheets.push('/css/pages/upgrade.css');
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

		res.locals.stylesheets.push('/css/pages/account.css');
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

		if (premiumUser && premiumUser.otherSubscriptions) {
			let otherSubscriptions = premiumUser.otherSubscriptions.reduce((a, b) => a += b.qty, 0);
			dynoPremiumServers += otherSubscriptions || 0;
		}

		if (premiumUser && premiumUser.patreonSubscriptions) {
			let patreonSubscriptions = premiumUser.patreonSubscriptions.reduce((a, b) => a += b.qty, 0);
			dynoPremiumServers += patreonSubscriptions || 0;
		}

		let guildsQuery = await models.Server
			.aggregate([{ $match: { premiumUserId: req.session.user.id, subscriptionType: { $in: ['braintree', 'staff', 'admin'] } } }, { $count: 'activated_servers' }]);

		let guildsCount = guildsQuery.length ? guildsQuery[0].activated_servers : 0;

		if (guildsCount >= dynoPremiumServers) {
			return res.status(402).send('You have reached your maximum number of servers. Please deactivate other servers or consider purchasing an additional plan.');
		}

		const { serverId, subscriptionType } = req.body;

		try {
			let serverModel = await models.Server.findOne({ _id: serverId }).lean().exec();
			if (serverModel.isPremium === true && serverModel.subscriptionType !== 'patreon') {
				return res.status(400).send('This server has premium already.');
			}

			await models.Server.updateOne({ _id: serverId }, {
				$set: {
					isPremium: true,
					premiumUserId: req.session.user.id,
					premiumSince: new Date().getTime(),
					subscriptionType: subscriptionType || 'braintree'
				}
			});

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

			await this.postWebhook(config.activationWebhook, {
				embeds: [
					{
						title: 'Guild Activated',
						color: '2347360',
						fields: [
							{ name: 'Guild ID', value: logDoc.serverID, inline: true },
							{ name: 'Guild Name', value: logDoc.serverName, inline: true },
							{ name: 'Member Count', value: logDoc.memberCount.toString(), inline: true },
							{ name: 'User ID', value: logDoc.userID, inline: true },
							{ name: 'User Name', value: logDoc.username, inline: true },
							{ name: 'Owner ID', value: logDoc.ownerID, inline: true },
							{ name: 'Time', value: (new Date()).toISOString(), inline: true },
						],
					},
				],
				tts: false,
			});

			return res.status(200).send('OK');
		} catch (err) {
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

			if (serverModel.premiumUserId !== req.session.user.id && !req.session.isAdmin) {
				return res.status(401).send('Unauthorized.');
			}

			await models.Server.updateOne({ _id: serverId }, { $unset: { isPremium: '', premiumUserId: '', premiumSince: '', subscriptionType: '' } });

			const logDoc = {
				serverID: serverModel._id,
				serverName: serverModel.name,
				ownerID: serverModel.ownerID,
				userID: req.session.user.id || 'Unknown',
				username: utils.fullName(req.session.user),
				timestamp: new Date().getTime(),
				type: 'disable',
			};

			await db.collection('premiumactivationlogs').insert(logDoc);

			await this.postWebhook(config.activationWebhook, {
				embeds: [
					{
						title: 'Guild Deactivated',
						color: '16729871',
						fields: [
							{ name: 'Guild ID', value: logDoc.serverID, inline: true },
							{ name: 'Guild Name', value: logDoc.serverName, inline: true },
							{ name: 'User ID', value: logDoc.userID, inline: true },
							{ name: 'User Name', value: logDoc.username, inline: true },
							{ name: 'Owner ID', value: logDoc.ownerID, inline: true },
							{ name: 'Time', value: (new Date()).toISOString(), inline: true },
						],
					},
				],
				tts: false,
			});

			return res.status(200).send('OK');

		} catch (err) {
			logger.error(err);
			return res.status(400).send('Unable to process this deactivation.');
		}
	}

	async process(bot, req, res) {
		const nonce = req.body.paymentMethodNonce;
		const planId = req.body.planId;

		if (!nonce || !planId) {
			return res.status(400).send({ error: 'Missing required parameters.' });
		}

		if (!req.session || !req.session.auth) return res.redirect('/');

		if (!req.session.user || !req.session.user.email) {
			return res.status(400).send({ error: 'Bad session. Please try logging in again.' });
		}

		try {
			let customerResponse;
			let existingPremiumUserModel = await models.PremiumUser.findOne({ _id: req.session.user.id });
			let existingCustomer = false;

			if (existingPremiumUserModel !== null && existingPremiumUserModel.customerId !== undefined) {
				existingCustomer = existingPremiumUserModel;

				let customerFindResponse;
				try {
					customerFindResponse = await gateway.customer.find(existingPremiumUserModel.customerId);
				} catch (err) {
					if (err.type === 'notFoundError') {
						existingCustomer = false;
					} else {
						logger.error(err, 'braintree', { userId: req.session.user.id, customerFindResponse });
						return res.status(500).send({ error: 'Customer Creation Error' });
					}
				}
			}
			if (existingCustomer) {
				customerResponse = await gateway.customer.update(existingCustomer.customerId, {
					firstName: req.session.user.username,
					lastName: '#' + req.session.user.discriminator,
					email: req.session.user.email,
				});
			} else {
				customerResponse = await gateway.customer.create({
					firstName: req.session.user.username,
					lastName: '#' + req.session.user.discriminator,
					email: req.session.user.email,
					customFields: { discord_user_id: req.session.user.id },
				});
			}

			const paymentMethodResponse = await gateway.paymentMethod.create({
				customerId: customerResponse.customer.id,
				paymentMethodNonce: nonce,
				options: {
					makeDefault: true,
				},
			});

			if (!customerResponse.success || !paymentMethodResponse.success) {
				logger.error('Error while creating customerResponse or paymentMethodResponse', 'braintree', {
					customerResponse,
					paymentMethodResponse,
					userId: req.session.user.id,
				});
				return res.status(500).send({ error: !customerResponse.success ? customerResponse.message : paymentMethodResponse.message });
			}

			customerResponse.customer = await gateway.customer.find(customerResponse.customer.id);

			if (!customerResponse.customer) {
				logger.error('Failed to refetch customer.', 'braintree', {
					customerResponse,
					paymentMethodResponse,
					userId: req.session.user.id,
				});
				return res.status(500).send({ error: 'Failed to re-fetch customer' });
			}

			let premiumUser;
			if (existingPremiumUserModel !== null && existingCustomer === false) {
				premiumUser = existingPremiumUserModel;
				premiumUser.customerId = customerResponse.customer.id;
			} else {
				premiumUser = existingCustomer ? existingCustomer : new models.PremiumUser({
					_id: req.session.user.id,
					customerId: customerResponse.customer.id,
				}, false);
			}

			premiumUser.user = req.session.user;
			premiumUser.set('email', this.encrypt(req.session.user.email));
			premiumUser.set('paymentMethods', customerResponse.customer.paymentMethods);
			await premiumUser.save();

			const token = paymentMethodResponse.paymentMethod.token;

			const subResponse = await gateway.subscription.create({
				paymentMethodToken: token,
				planId: planId,
			});

			if (!subResponse.success) {
				throw subResponse;
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

			premiumUser.subscriptions.push(subscription);
			await premiumUser.save();

			await this.postWebhook(config.subscriptionWebhook, {
				embeds: [
					{
						title: 'Subscription Created',
						color: '2347360',
						fields: [
							{ name: 'ID', value: subscription._id, inline: true },
							{ name: 'User ID', value: subscription.premiumUserId, inline: true },
							{ name: 'Plan ID', value: subscription.planId, inline: true },
							{ name: 'Quantity', value: subscription.qty.toString(), inline: true },
						],
					},
				],
				tts: false,
			});

			// Try to add role, disregard errors because member might not be on server
			this.client.addGuildMemberRole('203039963636301824', req.session.user.id, '265342465483997184', 'Braintree subscription').catch(() => { });

			const doc = {
				server: '203039963636301824',
				channel: '231089658971291648',
				userid: req.session.user.id,
				user: { id: req.session.user.id, name: req.session.user.username, discrim: req.session.user.discriminator },
				mod: '155149108183695360',
				type: 'role',
				role: '265342465483997184',
			};
			const moderation = new models.Moderation(doc);
			moderation.save();

			return res.send(subResponse);
		} catch (err) {
			logger.error(err);

			if (err.transaction) {
				return res.status(422).send({
					error: err.message,
					transaction: err.transaction.id,
					processorResponse: {
						code: err.transaction.processorResponseCode,
						text: err.transaction.processorResponseText,
						additional: err.transaction.additionalProcessorResponse,
					},
				});
			} else {
				return res.status(422).send({
					error: err.message,
					transaction: 'Unknown',
					processorResponse: {
						code: 'Generic',
						text: 'An error occured. You may have been charged, please contact payments@dyno.gg',
						additional: '',
					},
				});
			}
		}
	}

	processPatreon(bot, req, res) {
        if (!req.body || !req.body.code) {
            return res.status(400).send(`Invalid request.`);
        }

        patreonOAuthClient
            .getTokens(req.body.code, `http://localhost:8000/patreon`)
            .then(tokensResponse => {
                var patreonAPIClient = patreonAPI(tokensResponse.access_token);
                return patreonAPIClient('/current_user');
            })
            .then(result => {
                const store = result.store;
                // store is a [JsonApiDataStore](https://github.com/beauby/jsonapi-datastore)
                // You can also ask for result.rawJson if you'd like to work with unparsed data
				const data = store.findAll('user');
				let user;
				let premiumUser;

				if (data && data.length) {
					// console.log(require('util').inspect(data, { depth: 4 }));
					user = data.filter(u => u.id !== '4136671').shift();
					console.log(require('util').inspect(user, { depth: 4 }));

					premiumUser = this.createPremiumPatreonUser(user, req.session.user);
				}

				console.log(premiumUser);

				res.send(premiumUser);
            })
            .catch(err => {
                console.error('error!', err);
                res.status(500).send(err);
            });
	}

	async createPremiumPatreonUser(user, sessionUser) {
		const existingUserModel = await models.PremiumUser.findOne({ _id: sessionUser.id }).lean();

		const premiumUser = existingUserModel || new models.PremiumUser({
			_id: sessionUser.id,
		}, false);

		if (!existingUserModel) {
			premiumUser.user = sessionUser;
			premiumUser.set('email', this.encrypt(sessionUser.email));

			premiumUser.save();
		}
	}

	encrypt(text) {
		let iv = crypto.randomBytes(16);
		let cipher = crypto.createCipheriv('aes-256-cbc', new Buffer(config.braintree.encryption_key), iv);
		let encrypted = cipher.update(text);

		encrypted = Buffer.concat([encrypted, cipher.final()]);

		return iv.toString('hex') + ':' + encrypted.toString('hex');
	}

	decrypt(text) {
		let textParts = text.split(':');
		let iv = new Buffer(textParts.shift(), 'hex');
		let encryptedText = new Buffer(textParts.join(':'), 'hex');
		let decipher = crypto.createDecipheriv('aes-256-cbc', new Buffer(config.braintree.encryption_key), iv);
		let decrypted = decipher.update(encryptedText);

		decrypted = Buffer.concat([decrypted, decipher.final()]);

		return decrypted.toString();
	}
}

module.exports = Account;

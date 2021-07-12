import * as superagent from 'superagent';
import {config} from './config';
import * as models from './models';

/**
 * Patreon api wrapper
 */
export class Patreon {
	public auth: PatreonAuth;
	public refreshToken: string;
	public clientId: string;
	public clientSecret: string;
	public campaignId: string = '543081';
	private baseUrl: string = 'https://www.patreon.com/api/oauth2';
	private pledgeUrl: string = `/api/campaigns/${this.campaignId}/pledges?page%5Bcount%5D=100&sort=created`;

	constructor() {
		this.clientId = config.patreon.clientId;
		this.clientSecret = config.patreon.clientSecret;
	}

	public async getPledges(url: string = this.pledgeUrl, pledges: PatronPledge[] = []): Promise<PatronPledge[]> {
		if (this.auth == undefined) {
			throw new Error('Not authenticated yet.');
		}

		try {
			const result = await this.apiRequest(url);
			const parsedResult = this.parsePledges(result);
			pledges = pledges.concat(parsedResult);

			if (result.links != undefined && result.links.next != undefined) {
				return this.getPledges(result.links.next, pledges);
			}

			return pledges;
		} catch (err) {
			throw err;
		}
	}

	public async authenticate(): Promise<void> {
		let result: models.PatreonDocument | PatreonAuth;

		try {
			result = await models.patreon.findOne();
		} catch (err) {
			throw new Error(err);
		}

		if (result == undefined || result.refreshToken == undefined) {
			throw new Error('No auth data found. Please provide a refresh token to authenticate.');
		}

		if (result.accessToken != undefined && result.expires >= new Date()) {
			this.auth = result.toObject();
			return;
		} else {
			try {
				const res = await superagent.post(`${this.baseUrl}/token`)
					.set('Content-Type', 'application/json')
					.query({
						grant_type: 'refresh_token',
						refresh_token: result.refreshToken,
						client_id: this.clientId,
						client_secret: this.clientSecret,
					})
					.send();
				result = res.body;
			} catch (err) {
				throw new Error(err);
			}

			if (result != undefined && result.access_token != undefined) {
				try {
					const res = await models.patreon.findOneAndUpdate({}, result, { upsert: true });
					result = res.get().toObject();

					this.auth = <PatreonAuth>result;
					return;
				} catch (err) {
					throw new Error(err);
				}
			}
		}
	}

	private async apiRequest(url: string): Promise<PledgesResponse> {
		try {
			const result = await superagent.get(url)
				.set('Authorization', `Bearer ${this.auth.accessToken}`)
				.set('Accept', 'application/json');

				return result.body;
		} catch (err) {
			throw err;
		}
	}

	private parsePledges(result: PledgesResponse): PatronPledge[] {
		const pledges = [];

		for (const pledge of result.data) {
			const id: string = pledge.relationships.patron.data.id;
			const patron: PledgeUser = result.included.find((d: PledgeUser) => d.id === id);
			const attributes: PledgeUserAttributes = patron.attributes;
			const pledgeAttributes: PledgeAttributes = pledge.attributes;

			const patronPledge: PatronPledge = {
				id: id,
				discord_id: null,
				email: attributes.email,
				first_name: attributes.first_name,
				last_name: attributes.last_name,
				full_name: attributes.full_name,
				is_email_verified: attributes.is_email_verified,
				image_url: attributes.image_url,
				thumb_url: attributes.thumb_url,
				url: attributes.url,
				pledge: {
					id: pledge.id,
					amount_cents: pledgeAttributes.amount_cents,
					created_at: pledgeAttributes.created_at,
					declined_since: pledgeAttributes.declined_since,
					patron_pays_fees: pledgeAttributes.patron_pays_fees,
					pledge_cap_cents: pledgeAttributes.pledge_cap_cents,
				},
			};

			if (attributes.social_connections != undefined && attributes.social_connections.discord != null) {
				patronPledge.discord_id = patron.attributes.social_connections.discord;
			}

			pledges.push(patronPledge);
		}

		return pledges;
	}
}

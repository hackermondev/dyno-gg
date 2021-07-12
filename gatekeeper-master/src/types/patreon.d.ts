interface PledgesResponse {
	data: Pledge[];
	included: PledgeUser[];
	links: {
		first: string;
		next: string;
	};
	meta: {count: string};
}

interface Pledge {
	id: string;
	type: string;
	attributes: PledgeAttributes;
	relationships: {[key: string]: any};
}

interface PledgeAttributes {
	amount_cents: number;
	created_at: string;
	declined_since: string;
	patron_pays_fees: string;
	pledge_cap_cents: string;
}

interface PledgeUser {
	id: string;
	type: string;
	attributes: PledgeUserAttributes;
	relationships?: {[key: string]: any};
}

interface PledgeUserAttributes {
	email: string;
	first_name: string;
	last_name: string;
	full_name: string;
	created?: string;
	is_email_verified: boolean;
	image_url: string;
	thumb_url: string;
	url: string;
	social_connections?: {
		discord: string;
		[key: string]: any;
	}
	[key: string]: any;
}

interface PledgeDoc extends PledgeAttributes {
	id: string;
}

interface PatronPledge extends PledgeUserAttributes {
	id: string;
	discord_id: string;
	pledge: PledgeDoc;
}

interface PatreonAuth {
	accessToken: string;
}

interface PremiumUser {
	_id: string;
	customerId?: string;
	subscriptions?: string[];
	patreonLinked?: boolean;
	patreonUserId?: string;
}
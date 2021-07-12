if (process.env.PATREON_CLIENT_ID == undefined) {
	throw new Error('PATREON_CLIENT_ID is not defined.');
}

if (process.env.PATREON_CLIENT_SECRET == undefined) {
	throw new Error('PATREON_CLIENT_SECRET is not defined.');
}

if (process.env.SENTRY_DSN == undefined) {
	throw new Error('SENTRY_DSN is not defined.');
}

export const config = {
	patreon: {
		clientId: process.env.PATREON_CLIENT_ID,
		clientSecret: process.env.PATREON_CLIENT_SECRET,
	},
	sentry: {
		dsn: process.env.SENTRY_DSN,
		logLevel: process.env.SENTRY_LEVEL != undefined ? process.env.SENTRY_LEVEL : 'error',
	},
};

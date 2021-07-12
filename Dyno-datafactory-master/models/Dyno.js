'use strict';

const mongoose = require('mongoose');
const Schema = mongoose.Schema;

const dynoSchema = new Schema({
	prefix:     { type: String, default: '?' },
	modules:    { type: Object, default: {}  },
	commands:   { type: Object, default: {}  },
	webhooks:   { type: Array,  default: []  },
	testGuilds: { type: Array,  default: []  },
	betaGuilds: { type: Array,  default: []  },
	dashAccess: { type: Array,  default: []  },
	raidAccounts: { type: Array, default: [] },
	globalBans: { type: Array, default: [] },
	ignoredUsers: { type: Array, default: [] },
}, { strict: false });

module.exports = { name: 'Dyno', schema: dynoSchema }

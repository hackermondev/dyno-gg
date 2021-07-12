const schema = {
	guild:  { type: String, required: true, index: true },
	channel: { type: String, required: true },
	interval: { type: Number },
	nextPurge: { type: Date, default: Date.now, index: true },
};

export default {
	name: 'Autopurge',
	schema: schema,
	options: { strict: false },
};

const schema = {
	guild:     { type: String, index: true },
	user:      { type: Object, required: true },
	type:      { type: String, index: true },
	reason:    { type: String },
	message:   { type: Object },
	createdAt: { type: Date, default: Date.now(), index: true },
};

export default { name: 'AutomodLog', schema: schema };

const schema = {
	guild:    { type: String, index: true },
	name:     { type: String },
	queue:    { type: Array, required: true },
	creator: { type: Object },
	createdAt: { type: Date, default: Date.now() },
};

export default { name: 'SavedQueue', schema: schema };

const schema = {
	guild:     { type: String, index: true },
	user:      { type: Object, required: true },
	case:      { type: Number, required: true },
	createdAt: { type: Date, default: Date.now(), index: true },
};

export default { name: 'Appeal', schema: schema };

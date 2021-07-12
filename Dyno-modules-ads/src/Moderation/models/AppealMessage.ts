const schema = {
	guild:     { type: String, index: true },
	case:      { type: Number, required: true },
	user:      { type: Object, required: true },
	isMod:     { type: Boolean, default: false },
	message:   { type: String },
	createdAt: { type: Date, default: Date.now(), index: true },
};

export default { name: 'AppealMessage', schema: schema };

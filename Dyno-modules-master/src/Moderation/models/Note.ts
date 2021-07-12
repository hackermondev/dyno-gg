const schema = {
	id:		   { type: Number, index: true },
	guild:     { type: String, index: true },
	userid:	   { type: String },
	user:      { type: Object, required: true },
	notes:     { type: Array, required: true, default: [] },
	createdAt: { type: Date, default: Date.now(), index: true },
};

export default { name: 'Note', schema: schema, options: { strict: false } };

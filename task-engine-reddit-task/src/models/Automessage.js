const schema = {
	guild     : { type: String, index   : true },
	channel   : { type: String, required: true },
	interval  : { type: Number, required: true },
	content   : { type: String },
	embed     : { type: Object },
	nextPost  : { type: Date },
	webhook   : { type: Object },
	errorCount: { type: Number },
	createdAt : { type: Date, default   : Date.now() },
};

module.exports = {
	name: 'Automessage',
	schema: schema,
	options: { strict: false },
};

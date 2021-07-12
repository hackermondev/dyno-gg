const queueItem = {
	track: { type: String },
	identifier:    { type: String },
	title:         { type: String },
	description:   { type: String },
	thumbnail_url: { type: String },
	uri:           { type: String },
	length:        { type: Number },
	user:          { type: Object },
	v: { type: Number },
};

const schema = {
	guild:    { type: String, index: true },
	name:     { type: String },
	queue:    [queueItem],
};

export default {
	name: 'Queue',
	schema: schema,
	options: { strict: false }
};

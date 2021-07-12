const keystone = require('keystone');
const Types = keystone.Field.Types;

/**
 * Sidebar Model
 * ==========
 */

const Sidebar = new keystone.List('Sidebar', {
	map: { name: 'name' },
	autokey: { path: 'slug', from: 'name', unique: true },
	track: true,
});

Sidebar.add({
	name: { type: String, required: true },
	widgets: { type: Types.Relationship, ref: 'Widget', many: true },
});

Sidebar.register();

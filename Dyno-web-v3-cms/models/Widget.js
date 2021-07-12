const keystone = require('keystone');
const Types = keystone.Field.Types;

/**
 * Widget Model
 * ==================
 */

const Widget = new keystone.List('Widget', {
	label: 'Widgets',
	map: { name: 'name' },
	autokey: { from: 'name', path: 'key', unique: true },
	track: true,
});

Widget.add({
	name: { type: String, required: true },
	content: { type: Types.Code, language: 'html', height: 400 },
	weight: { type: Types.Number, default: 0 },
});

Widget.relationship({ ref: 'Sidebar', path: 'sidebars', refPath: 'widgets' });

Widget.register();

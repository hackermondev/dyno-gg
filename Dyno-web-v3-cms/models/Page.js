const keystone = require('keystone');
const deepPopulate = require('mongoose-deep-populate')(keystone.get('mongoose'));
const Types = keystone.Field.Types;

/**
 * Page Model
 * ==========
 */

const Page = new keystone.List('Page', {
	map: { name: 'name' },
	autokey: { path: 'slug', from: 'name', unique: true },
	track: true,
});

Page.add({
	name: { type: String, required: true },
	title: { type: String },
	seoTitle: { type: String },
	description: { type: String },
	keywords: { type: String },
	state: { type: Types.Select, options: 'draft, published, archived', default: 'draft', index: true },
	// author: { type: Types.Relationship, ref: 'User', index: true },
	// publishedDate: { type: Types.Date, index: true, dependsOn: { state: 'published' } },
	hero: { type: Types.Boolean },
	heroType: { type: Types.Select, dependsOn: { hero: true }, options: 'small, small-left, expanded', default: 'small' },
	heroTitle: { type: String, dependsOn: { hero: true } },
	heroContent: { type: Types.Html, dependsOn: { hero: true, heroType: 'expanded' }, wysiwyg: true, height: 300 },
	heroCarbon: { type: Boolean, label: 'Show Carbon in hero', dependsOn: { hero: true, heroType: 'expanded' } },
	sidebar: { type: Types.Relationship, ref: 'Sidebar' },
	content: { type: Types.Html, wysiwyg: true, height: 400 },
});

Page.schema.plugin(deepPopulate);

Page.schema.virtual('content.full').get(function () {
	return this.content.extended || this.content.brief;
});

Page.defaultColumns = 'name, state|20%';
Page.register();

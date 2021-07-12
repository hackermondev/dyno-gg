const keystone = require('keystone');
const Types = keystone.Field.Types;

/**
 * Question Model
 * ==========
 */

const Question = new keystone.List('Question', {
	label: 'FAQ',
	map: { name: 'question' },
	autokey: { path: 'slug', from: 'question', unique: true },
	sortable: true,
	track: true,
});

Question.add({
	state: { type: Types.Select, options: 'draft, published, archived', default: 'draft', index: true },
	author: { type: Types.Relationship, ref: 'User', index: true },
	question: { type: String, height: 150 },
	answer: { type: Types.Html, wysiwyg: true, height: 400 },
	category: { type: Types.Relationship, ref: 'QuestionCategory' },
});

Question.defaultColumns = 'question, category|20%, state|20%, author|20%';
Question.register();

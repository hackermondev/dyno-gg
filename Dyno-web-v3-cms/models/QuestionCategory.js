const keystone = require('keystone');

/**
 * QuestionCategory Model
 * ==================
 */

const QuestionCategory = new keystone.List('QuestionCategory', {
	label: 'FAQ Categories',
	autokey: { from: 'name', path: 'key', unique: true },
});

QuestionCategory.add({
	name: { type: String, required: true },
});

QuestionCategory.relationship({ ref: 'Question', path: 'questions', refPath: 'category' });

QuestionCategory.register();

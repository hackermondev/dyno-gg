'use strict';

import * as each from 'async-each';
import * as glob from 'glob-promise';
import * as path from 'path';
import Collection from './utils/Collection';
import I18n from './utils/I18n';

export default class LangManager extends Collection {
	public localePath: string;

	constructor(localePath: string) {
		super();
		this.localePath = localePath;
		this.t = this.t.bind(this);
	}

	public async loadLocales() {
		try {
			const files = await glob('**/*.json', {
				cwd: path.resolve(this.localePath),
				root: path.resolve(this.localePath),
				absolute: true,
			});
			each(files, (file: string) => {
				const locale = path.dirname(file).split(path.sep).pop();
				this.set(locale, new I18n(locale, file));
			});
		} catch (err) {
			console.error(err);
			return Promise.reject(err);
		}
	}

	public t(locale: string, string: string, values: any) {
		locale = locale || 'en';
		const fallbackLang = this.get('en');
		if (!this.has(locale)) {
			locale = 'en';
		}
		return (<I18n>this.get(locale)).__(fallbackLang, string, values);
	}
}

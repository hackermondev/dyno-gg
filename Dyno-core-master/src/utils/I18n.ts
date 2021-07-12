import * as dot from 'dot-prop';

/**
 * I18n translator
 * @class I18n
 */
export default class I18n {
	private lang: string;
	private filePath: string;
	private locale: object;

	constructor(lang: string, filePath: string) {
		this.lang = lang;
		this.filePath = filePath;
		this.locale = require(filePath);
	}

	public reload() {
		delete require.cache[this.filePath];
		this.locale = require(this.filePath);
	}

	// Get the rule for pluralization
	// http://localization-guide.readthedocs.org/en/latest/l10n/pluralforms.html
	// tslint:disable-next-line:cyclomatic-complexity
	public get_rule(count: number, language: string) {
		switch (language) {
			// nplurals=2; plural=(n > 1);
			case 'ach':
			case 'ak':
			case 'am':
			case 'arn':
			case 'br':
			case 'fil':
			case 'fr':
			case 'gun':
			case 'ln':
			case 'mfe':
			case 'mg':
			case 'mi':
			case 'oc':
			case 'pt_BR':
			case 'tg':
			case 'ti':
			case 'tr':
			case 'uz':
			case 'wa':
				return (count > 1) ? 1 : 0;

			// nplurals=2; plural=(n != 1);
			case 'af':
			case 'an':
			case 'anp':
			case 'as':
			case 'ast':
			case 'az':
			case 'bg':
			case 'bn':
			case 'brx':
			case 'ca':
			case 'da':
			case 'doi':
			case 'de':
			case 'el':
			case 'en':
			case 'eo':
			case 'es':
			case 'es_AR':
			case 'et':
			case 'eu':
			case 'ff':
			case 'fi':
			case 'fo':
			case 'fur':
			case 'fy':
			case 'gl':
			case 'gu':
			case 'ha':
			case 'he':
			case 'hi':
			case 'hne':
			case 'hu':
			case 'hy':
			case 'ia':
			case 'it':
			case 'kl':
			case 'kn':
			case 'ku':
			case 'lb':
			case 'mai':
			case 'ml':
			case 'mn':
			case 'mni':
			case 'mr':
			case 'nah':
			case 'nap':
			case 'nb':
			case 'ne':
			case 'nl':
			case 'nn':
			case 'no':
			case 'nso':
			case 'or':
			case 'pa':
			case 'pap':
			case 'pms':
			case 'ps':
			case 'pt':
			case 'rm':
			case 'rw':
			case 'sat':
			case 'sco':
			case 'sd':
			case 'se':
			case 'si':
			case 'so':
			case 'son':
			case 'sq':
			case 'sv':
			case 'sw':
			case 'ta':
			case 'te':
			case 'tk':
			case 'ur':
			case 'yo':
				return (count != 1) ? 1 : 0;

			// nplurals=1; plural=0;
			case 'ay':
			case 'bo':
			case 'cgg':
			case 'dz':
			case 'fa':
			case 'id':
			case 'ja':
			case 'jbo':
			case 'ka':
			case 'kk':
			case 'km':
			case 'ko':
			case 'ky':
			case 'lo':
			case 'ms':
			case 'my':
			case 'sah':
			case 'su':
			case 'th':
			case 'tt':
			case 'ug':
			case 'vi':
			case 'wo':
			case 'zh':
			case 'jv':
				return 0;

			// nplurals=2; plural=(n%10!=1 || n%100==11);
			case 'is':
				return (count % 10 != 1 || count % 100 == 11) ? 1 : 0;

			// nplurals=4; plural=(n==1) ? 0 : (n==2) ? 1 : (n == 3) ? 2 : 3;
			case 'kw':
				return (count == 1) ? 0 : (count == 2) ? 1 : (count == 3) ? 2 : 3;

			// nplurals=3; plural=(n % 10==1 && n % 100!=11 ? 0 : n % 10>=2 && n % 10 <= 4 && (n % 100 < 10 || n % 100>=20) ? 1 : 2);
			case 'uk':
			case 'sr':
			case 'ru':
			case 'hr':
			case 'bs':
			case 'be':
				return count % 10 === 1 && count % 100 !== 11 ? 0 :
					count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20) ? 1 : 2;

			// nplurals=3; plural=(n === 0 ? 0 : n === 1 ? 1 : 2);
			case 'mnk':
				return count === 0 ? 0 : count === 1 ? 1 : 2;

			// nplurals=3; plural=(n === 1) ? 0 : (n >= 2 && n <= 4) ? 1 : 2;
			case 'sk':
				return (count === 1) ? 0 : (count >= 2 && count <= 4) ? 1 : 2;

			// nplurals=3; plural=(n === 1 ? 0 : (n === 0 || (n % 100 > 0 && n % 100 < 20)) ? 1 : 2);
			case 'ro':
				return count === 1 ? 0 : (count === 0 || (count % 100 > 0 && count % 100 < 20)) ? 1 : 2;

			// nplurals=6; plural=(n === 0 ? 0 : n === 1 ? 1 : n === 2 ? 2 : n % 100 >= 3 && n % 100 <= 10 ? 3 : n % 100 >= 11 ? 4 : 5);
			case 'ar':
				return count === 0 ? 0 : count === 1 ? 1 : count === 2 ? 2 : count % 100 >= 3 && count % 100 <= 10 ? 3 : count % 100 >= 11 ? 4 : 5;

			// nplurals=3; plural=(n === 1) ? 0 : (n >= 2 && n <= 4) ? 1 : 2;
			case 'cs':
				return count === 1 ? 0 : (count >= 2 && count <= 4) ? 1 : 2;

			// countplurals=3; plural=(n === 1) ? 0 : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2;
			case 'csb':
				return (count === 1) ? 0 : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20) ? 1 : 2;

			// nplurals=4; plural=(n === 1) ? 0 : (n === 2) ? 1 : (n  !==  8 && n  !==  11) ? 2 : 3;
			case 'cy':
				return (count === 1) ? 0 : (count === 2) ? 1 : (count !== 8 && count !== 11) ? 2 : 3;

			// nplurals=5; plural=n === 1 ? 0 : n === 2 ? 1 : (n>2 && n<7) ? 2 :(n>6 && n<11) ? 3 : 4;
			case 'ga':
				return count === 1 ? 0 : count === 2 ? 1 : (count > 2 && count < 7) ? 2 : (count > 6 && count < 11) ? 3 : 4;

			// nplurals=4; plural=(n === 1 || n === 11) ? 0 : (n === 2 || n === 12) ? 1 : (n > 2 && n < 20) ? 2 : 3;
			case 'gd':
				return (count === 1 || count === 11) ? 0 : (count === 2 || count === 12) ? 1 : (count > 2 && count < 20) ? 2 : 3;

			// nplurals=3; plural=(n % 10 === 1 && n % 100 !== 11 ? 0 : n % 10 >= 2 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2);
			// determine why this is duplicate
			// case 'it':
			// 	return count % 10 === 1 && count % 100 !== 11 ? 0 : count % 10 >= 2 && (count % 100 < 10 || count % 100 >= 20) ? 1 : 2;

			// nplurals=3; plural=(n % 10 === 1 && n % 100 !== 11 ? 0 : n  !==  0 ? 1 : 2);
			case 'lv':
				return count % 10 === 1 && count % 100 !== 11 ? 0 : count !==  0 ? 1 : 2;

			// nplurals=2; plural= n === 1 || n % 10 === 1 ? 0 : 1;
			case 'mk': {
				return count === 1 || count % 10 === 1 ? 0 : 1;
			}

			// nplurals=4; plural=(n === 1 ? 0 : n === 0 || ( n % 100 > 1 && n % 100 < 11) ? 1 : (n % 100 > 10 && n % 100 < 20 ) ? 2 : 3);
			case 'mt':
				return count === 1 ? 0 : count === 0 || (count % 100 > 1 && count % 100 < 11) ? 1 : (count % 100 > 10 && count % 100 < 20 ) ? 2 : 3;

			// nplurals=3; plural=(n === 1 ? 0 : n % 10 >= 2 && n % 10 <= 4 && (n % 100 < 10 || n % 100 >= 20) ? 1 : 2);
			case 'pl':
				return count === 1 ? 0 : count % 10 >= 2 && count % 10 <= 4 && (count % 100 < 10 || count % 100 >= 20) ? 1 : 2;

			// nplurals=4; plural=(n % 100 === 1 ? 1 : n % 100 === 2 ? 2 : n % 100 === 3 || n % 100 === 4 ? 3 : 0);
			case 'sl':
				return count % 100 === 1 ? 1 : count % 100 === 2 ? 2 : count % 100 === 3 || count % 100 === 4 ? 3 : 0;

			default:
				return 0;
		}
	}

	public __(fallbackLang: I18n, string: string, values: any) {
		//return translation of the original sting if did not find the translation
		// let translation = string;
		let translation = dot.get(this.locale, string, null);

		if (fallbackLang && !translation) {
			translation = fallbackLang.__(null, string, values);
		}

		if (!translation) {
			return string;
		}

		// get the corresponding translation from the file
		// if (typeof this.locale[string] != 'undefined' && typeof this.locale[string][this.lang] != 'undefined') {
		// 	translation = this.locale[string][this.lang];
		// } else if (fallbackLang) {
		// 	translation = fallbackLang.__(null, string, values);
		// }

		// If the string have place to render values withen
		if ((/{{.+?}}/g).test(translation)) {
			// get all the parts needed to be replaced
			const matches = translation.match(/{{.+?}}/g);
			// loop on each match
			for (const index in matches) {
				// get the match {{example}}
				const match = matches[index];
				// get the word in the match example
				let match_word = (match.replace('}}', '')).replace('{{', '');

				// translate the word if was passed in the values var
				if (values && values[match_word] != undefined) {
					translation = translation.replace(match, values[match_word]);
					continue; // move to the next word in the loop
				} else {
					// match_search = dot.get(this.locale, match_word);
					// if (match_search != undefined) {
					if (this.locale[match_word] != undefined) {
						// If the translation is there in the file then translate it directly
						translation = translation.replace(match, this.locale[match_word]);
						continue; // move to the next word in the loop
					}
				}

				// if the matched word have a count
				if ((/\|\|.+/g).test(match_word)) {
					const temp_array = match_word.split('||');
					// update the matched word
					match_word = temp_array[0];
					// get the variable of the count for the word
					const item_count_variable = temp_array[1];

					// get the value form values passed to this function
					// TODO through error if not found in values
					const item_count = values[item_count_variable];

					// will get the rule or for pluralization based on the lang
					const rule = this.get_rule(item_count, this.lang);
					// match_search = dot.get(this.locale, match_word);

					if (typeof this.locale[match_word] == 'object') {
					// if (typeof match_search == 'object') {
						translation = translation.replace(match, this.locale[match_word][rule]);
					} else {
						translation = translation.replace(match, this.locale[match_word]);
					}
				} else {
					if (typeof values == 'object') {
						translation = translation.replace(match, values[match_word]);
					} else {
						translation = translation.replace(match, this.locale[match_word]);
					}
				}
			}
		}

		return translation;
	}
}

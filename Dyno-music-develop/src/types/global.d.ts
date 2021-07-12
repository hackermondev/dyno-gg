import {Base} from '../Base';

declare class DynoModule extends Base {
	constructor(dyno: any);
}

interface EmbedField {
	name: string;
	value: string;
	inline?: boolean;
}
import * as moment from 'moment';
import 'moment-duration-format';

interface DurationSettings {
	forceLength: boolean;
	precision: number;
	template: string;
	trim: boolean | 'left' | 'right';
}

export default interface Duration extends moment.Duration {
	format: (template?: string, precision?: number, settings?: DurationSettings) => string;
}

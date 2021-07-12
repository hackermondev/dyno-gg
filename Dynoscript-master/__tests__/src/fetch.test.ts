import * as Dynoscript from '../../src';

describe('fetch url', () => {
	test('command should execute', () => {
		const command = `{fetch 'https://www.dynobot.net/'}`;

		return Dynoscript.execute(command, {env: {channel: '297513296288940042'}});
	});
});

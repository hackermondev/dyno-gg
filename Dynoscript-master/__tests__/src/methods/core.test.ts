import * as Eris from 'eris';
import {Environment} from '../../../src/Environment';
import Core = require('../../../src/methods/Core');

describe('core methods', () => {
	const client: any = new Eris.Client(`Bot ${process.env.DYNO_TOKEN}`, { restMode: true });
	const core = new Core(client);
	const message = new Eris.Message({
		id: '361943638239870915',
		channel: { id: '361943638239870976' },
		content: 'should send a message to discord',
	}, client);

	let env = new Environment();

	beforeAll(() => {
		client.createMessage = jest.fn(() => Promise.resolve(message));
		client.editMessage = jest.fn(() => Promise.resolve(message));
		client.deleteMessage = jest.fn(() => Promise.resolve());
	});

	afterAll(() => {
		jest.clearAllMocks();
	});

	beforeEach(() => {
		env = new Environment();
		client.createMessage.mockClear();
		client.editMessage.mockClear();
		client.deleteMessage.mockClear();
	});

	test('it should convert a number to string', () => {
		const string = core.toString(null, 123);
		expect(typeof string).toBe('string');
		expect(string).toBe('123');
	});

	test('it should return a date', () => {
		const date = core.now;
		expect(date instanceof Date).toBe(true);
	});

	test('it should reject with no args', async () => {
		let err;

		try {
			await core.send(env);
		} catch (e) {
			err = e;
		}
		expect(err.message).toMatch(/Invalid arguments/);

		try {
			await core.edit(env);
		} catch (e) {
			err = e;
		}
		expect(err.message).toMatch(/Invalid arguments/);

		try {
			await core.embed(env);
		} catch (e) {
			err = e;
		}
		expect(err.message).toMatch(/Invalid arguments/);
	});

	test('it should reject with expected channel', async () => {
		const args = [{ key: 'content', value: 'test' }];
		let err;

		try {
			await core.send(env, ...args);
		} catch (e) {
			err = e;
		}
		expect(err.message).toMatch(/Expected a channel/);

		try {
			await core.embed(env, ...args);
		} catch (e) {
			err = e;
		}
		expect(err.message).toMatch(/Expected a channel/);

		try {
			await core.edit(env, ...args, { key: 'message', value: '12345' });
		} catch (e) {
			err = e;
		}
		expect(err.message).toMatch(/Expected a channel/);
	});

	test('it should reject with invalid message type', async () => {
		let err;

		try {
			await core.edit(env, { key: 'channel', value: '12345' });
		} catch (e) {
			err = e;
		}
		expect(err.message).toMatch(/Expected a message/);

		try {
			await core.edit(env, { key: 'channel', value: '12345' }, { key: 'message', value: [] });
		} catch (e) {
			err = e;
		}
		expect(err.message).toMatch(/object or string/);
	});

	test('it should return false when client rejects', async () => {
		client.createMessage = jest.fn(() => Promise.reject('error'));
		client.editMessage = jest.fn(() => Promise.reject('error'));
		client.deleteMessage = jest.fn(() => Promise.reject('error'));

		const args = [
			{ key: 'channel', value: '12345' },
			{ key: 'content', value: 'test' },
		];

		await expect(core.send(env, ...args)).resolves.toBe(false);
		await expect(core.embed(env, ...args)).resolves.toBe(false);
		await expect(core.edit(env, ...args, { key: 'message', value: '12345' })).resolves.toBe(false);
	});
});

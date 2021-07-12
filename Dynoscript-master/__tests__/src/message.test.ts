import * as Eris from 'eris';
import * as Dynoscript from '../../src';

describe('message tests', () => {
	const client: any = new Eris.Client(`Bot ${process.env.DYNO_TOKEN}`, { restMode: true });
	const env = { channel: '361943638239870976' };
	const message = new Eris.Message({
		id: '361943638239870915',
		channel: { id: '361943638239870976' },
		content: 'should send a message to discord',
	}, client);

	beforeAll(() => {
		client.createMessage = jest.fn(() => Promise.resolve(message));
		client.editMessage = jest.fn(() => Promise.resolve(message));
		client.deleteMessage = jest.fn(() => Promise.resolve());
	});

	afterAll(() => {
		jest.clearAllMocks();
	});

	beforeEach(() => {
		client.createMessage.mockClear();
		client.editMessage.mockClear();
		client.deleteMessage.mockClear();
	});

	test('should send a message to discord', async () => {
		const command = `
			{send $channel content:'test'}
		`;

		await Dynoscript.execute(command, {client, env});
		expect(client.createMessage).toHaveBeenCalled();
	}, 5000);

	test('should edit a message', async () => {
		const command = `
			$message = {send content:'testing...'}
			{edit message:$message content:'should edit a message'}
		`;

		await Dynoscript.execute(command, {client, env});
		expect(client.createMessage).toHaveBeenCalled();
		expect(client.editMessage).toHaveBeenCalled();
	}, 5000);

	test('should send a message and delete after 2s', async () => {
		const command = `
			{send $channel content:'test' deleteAfter:2000}
		`;

		await Dynoscript.execute(command, {client, env});
		expect(client.createMessage).toHaveBeenCalled();
		expect(client.deleteMessage).toHaveBeenCalled();
	}, 10000);

	test('should send a message and not delete with invalid interval', async () => {
		const command = `
			{send $channel content:'test' deleteAfter:900}
			{send $channel content:'test' deleteAfter:12000}
		`;

		await Dynoscript.execute(command, {client, env});
		expect(client.createMessage).toHaveBeenCalled();
		expect(client.deleteMessage).not.toHaveBeenCalled();
	}, 10000);

	test('should send an embed to discord', async () => {
		const command = `
			{embed channel:$channel description: 'should send an embed to discord'}
		`;

		await Dynoscript.execute(command, {client, env});
		expect(client.createMessage).toHaveBeenCalled();
	}, 5000);

	test('it should send an embed with string footer and image', async () => {
		const command = `{embed channel:$channel color:'random' image:'test' footer:'test'}`;
		await Dynoscript.execute(command, {client, env});
		expect(client.createMessage).toHaveBeenCalled();
	});

	test('it should send an embed to channel in env', async () => {
		const command = `{embed color:'random' image:'test' footer:'test'}`;
		await Dynoscript.execute(command, {client, env});
		expect(client.createMessage).toHaveBeenCalled();
	});

	test('should send an embed with all possible values', async () => {
		const command = `
			{embed
				channel: $channel
				author: {
					name: 'Author',
					icon_url: 'https://www.dynobot.net/images/dyno-v2-300.jpg'
				}
				color: '#ffffff'
				title: 'Title'
				url: 'https://www.dynobot.net/'
				description: 'should send an embed with all possible values'
				fields: [
					{ name: 'Field', value: 'Value' }
				]
				thumbnail: 'https://www.dynobot.net/images/dyno-v2-300.jpg'
				image: 'https://www.dynobot.net/images/dyno-v2-300.jpg'
				footer: {
					text: 'Footer',
					icon_url: 'https://www.dynobot.net/images/dyno-v2-300.jpg'
				}
				timestamp: $now}
		`;

		await Dynoscript.execute(command, {client, env});
		expect(client.createMessage).toHaveBeenCalled();
	}, 5000);

	test('should send an embed with mixed field types', async () => {
		const command = `
			{embed
				channel: $channel
				description: 'should send an embed with mixed field names and values'
				fields: [
					{ name: '1', value: 'String value' },
					{ name: 2, value: 456, inline: false },
					{ name: '3', value: 123, inline: true },
					{ name: '4', value: true, inline: 'true' }
				]}
		`;

		await Dynoscript.execute(command, {client, env});
		expect(client.createMessage).toHaveBeenCalled();
	}, 5000);

	test('should send an embed with shorthand fields', async () => {
		const command = `
			{embed
				channel: $channel
				description: 'should send an embed with shorthand fields'
				fields: [
					('1', 'String'),
					(2, 456, false),
					(false, true, true),
					('4', 'String', 'true')
				]}
		`;

		await Dynoscript.execute(command, {client, env});
		expect(client.createMessage).toHaveBeenCalled();
	}, 5000);
});

import {Utils} from '../../src/Utils';

describe('utils tests', () => {
	test('it should generate the right sha256 hash', () => {
		const str = 'test123';
		const hash = 'ecd71870d1963316a97e3ac3408c9835ad8cf0f3c1bc703527c30265534f75ae';

		expect(Utils.sha256(str)).toBe(hash);
	});

	test('it should encrypt a string', () => {
		const input = 'test456';
		const key = '18bce19ce6438f3e70da4d96b705802b';
		const result = 'd3803e13925b28706e28f2af5610753e:6f6951e135d4efe77e9f8daa3fc85b2b';
		const iv = new Buffer('d3803e13925b28706e28f2af5610753e', 'hex');

		expect(Utils.encrypt(key, input, iv)).toBe(result);
	});

	test('it should create an iv if none is provided', () => {
		const input = 'test456';
		const key = '18bce19ce6438f3e70da4d96b705802b';

		const encrypted = Utils.encrypt(key, input);
		expect(encrypted.split(':')).toHaveProperty('length', 2);
	});

	test('it should decrypt a string', () => {
		const input = 'd3803e13925b28706e28f2af5610753e:6f6951e135d4efe77e9f8daa3fc85b2b';
		const result = 'test456';
		const key = '18bce19ce6438f3e70da4d96b705802b';

		expect(Utils.decrypt(key, input)).toBe(result);
	});
});

import {Environment} from '../../src/Environment';

describe('environment tests', () => {
	const env = new Environment();
	let childEnv;

	test('it should define a variable, test, 123', () => {
		env.defVar('test', 123);
	});

	test('it should set the variable, test, 456', () => {
		env.setVar('test', 456);
	});

	test('it should have the test variable', () => {
		const test = env.hasVar('test');
		expect(test).toBe(true);
	});

	test('it should not have the invalid variable', () => {
		const test = env.hasVar('invalid');
		expect(test).toBe(false);
	});

	test('it should get the test variable', () => {
		const variable = env.getVar('test');
		expect(variable).toBe(456);
	});

	test('it should return the scope the test variable is in', () => {
		const scope = env.lookup('test');
		expect(scope).not.toBeFalsy();
	});

	test('it should set a method, test()', () => {
		env.defMethod('test', () => { return 'test'; });
	});

	test('it should have the test method', () => {
		const test = env.hasMethod('test');
		expect(test).toBe(true);
	});

	test('it should not have the invalid method', () => {
		const test = env.hasMethod('invalid');
		expect(test).toBe(false);
	});

	test('it should get the test method and call it', () => {
		const method = env.getMethod('test');
		expect(typeof method).toBe('function');
		expect(method()).toBe('test');
	});

	test('it should extend env and have a parent', () => {
		childEnv = env.extend();
		expect(childEnv.parent).not.toBeFalsy();
	});

	test('it should get the parent variable, test', () => {
		const test = childEnv.getVar('test');
		expect(test).toBe(456);
	});

	test('it should have access to the parent variable, test', () => {
		const test = childEnv.hasVar('test');
		expect(test).toBe(true);
	});

	test('it should have access to the parent method, test()', () => {
		const test = childEnv.hasMethod('test');
		expect(test).toBe(true);
	});

	test('it should get the parent test method and call it', () => {
		const method = childEnv.getMethod('test');
		expect(typeof method).toBe('function');
		expect(method()).toBe('test');
	});

	test('it should set the parent variable, test, 789', () => {
		childEnv.setVar('test', 789);
		const test = env.getVar('test');
		const childTest = env.getVar('test');
		expect(test).toBe(789);
		expect(childTest).toBe(789);
	});

	test('it should throw when getting an undefined variable', () => {
		function test() {
			env.getVar('invalid');
		}
		expect(test).toThrowError(/Undefined variable/);
	});

	test('it should throw when getting an undefined method', () => {
		function test() {
			env.getMethod('invalid');
		}
		expect(test).toThrowError(/Undefined method/);
	});

	test('it should throw when getting an undefined parent variable', () => {
		function test() {
			childEnv.getVar('invalid');
		}
		expect(test).toThrowError(/Undefined variable/);
	});

	test('it should throw when getting an undefined parent method', () => {
		function test() {
			childEnv.getMethod('invalid');
		}
		expect(test).toThrowError(/Undefined method/);
	});
});

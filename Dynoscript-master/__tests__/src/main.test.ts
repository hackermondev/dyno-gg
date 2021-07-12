import * as Dynoscript from '../../src';

describe('main functions', () => {
	test('variable assignment should work', () => {
		const command = `
			$a = 1
			$b = 'string'
			$c = $a
			$d = true
			$e = 1 + 2
			$d = $a + $e
			$f = $math.PI
			$e = {math.round 2.123}
			$g = 1.23
		`;

		return Dynoscript.execute(command);
	});

	test('comparison operators should evaluate', () => {
		const command = `
			if {2 == 2}
			endif
			if {2 != 1}
			endif
			if {2 > 1}
			endif
			if {1 < 2}
			endif
			if {1 <= 2}
			endif
			if {2 >= 1}
			endif
			if {3 >= 3}
			endif
		`;

		return Dynoscript.execute(command);
	});

	test('if statement should handle multiple conditions', () => {
		const command = `
			if {1 == 1 && 2 == 2}
			endif
			if {1 == 1 && 1 == 2}
			else
			endif
			if {1 == 1 && 2 == 2 && 3 == 3 && 4 == 4}
			else
			endif
			if {1 == 2 || 2 == 2}
			else
			endif
			if {1 == 2 || 2 == 3}
			else
			endif
			if {1 == 2 || 3 == 3 && 4 == 4}
			else
			endif
			if {1 == 2 || 3 == 3 && 4 == 5} // this will be invalid
			else
			endif
		`;

		return Dynoscript.execute(command);
	});

	test('math expressions should evaluate', () => {
		const command = `
			$a = ((1 + 3) * 100) / 2
			$b = ($a * 200) + 15
		`;

		return Dynoscript.execute(command);
	});

	test('if statement command should execute', () => {
		const command = `
			if {1}
			endif
			if {!1}
			endif
			if {!0}endif
			if{2}
			endif
			if{1}endif
			if{0}elseendif
			if {2 == 2}
				if {(4) == 4}
					break
				endif
			endif
			if {2 == 2}
				if {4 == 4}
					break
				else
					break
				endif
			endif
			if {(2) == 2}
				if {4 == 3} break else break endif
			endif`;

		return Dynoscript.execute(command);
	});

	test('if statement should work with variables', () => {
		const command = `
			$a = 1
			$b = 2
			if {$a == $b}
				break
			endif
		`;

		return Dynoscript.execute(command);
	});

	test('math and math lib should evaluate', () => {
		const command = `
			$lat1 = 51.295978
			$lon1 = -1.104938
			$lat2 = 45.407692
			$lon2 = 2.4415

			$moda = 10 % 2
			$modb = 9 % 2

			$R = 6371
			$r2d = $math.PI / 180
			$dLat = ($lat2 - $lat1) * ($r2d)
			$dLon = ($lon2 - $lon1) * ($r2d)
			$a = {math.sin $dLat / 2} * {math.sin $dLat / 2} + {math.cos $lat1 * ($r2d)} *
				{math.cos $lat2 * ($r2d)} * {math.sin $dLon / 2} * {math.sin $dLon / 2}
			$c = 2 * {math.atan2 {math.sqrt $a} {math.sqrt 1} - $a}
			$distance = $R * $c
		`;

		return Dynoscript.execute(command);
	});

	test('break should evaluate', () => {
		const command = `
			if {2 == 2}
				break
				$a = 1
			endif
			$b = 2
		`;

		return Dynoscript.execute(command);
	});

	test('return should evaluate', () => {
		const command = `
			if {2 == 2}
				return
			endif
			$a = 1
		`;

		return Dynoscript.execute(command);
	});

	test('it should evaluate dot notation on non-existent data', () => {
		const command = `
			$b = $math.PI
		`;

		return Dynoscript.execute(command);
	});

	test('it should evaluate dot notation with array on non-existent data', () => {
		const command = `
			$c = $variable.with.array.0
		`;

		return Dynoscript.execute(command);
	});

	test('it should evaluate dot notation with variable on non-existent data', () => {
		const command = `
			$a = 'test'
			$d = $variable.with.$a
		`;

		return Dynoscript.execute(command);
	});

	test('it should evaluate dot notation with existing data', () => {
		const command = `
			$a = { b: ['test'] }
			$b = { c: { test: 1 } }
			$c = { test: [{ test: 2 }]}
			$d = $a.b
			$e = $a.b.0
			$f = $b.c.$e
			$g = $c.$e.0.$e
		`;

		return Dynoscript.execute(command);
	});

	test('it should throw a parse error', async () => {
		const command = `$a == 1`;
		let err;

		try {
			await Dynoscript.execute(command);
		} catch (e) {
			err = e;
		}
		expect(err.message).toMatch(/Expected .* found./);
	});

	test('it should throw division by zero', async () => {
		const command = `$a = 1 / 0`;
		let err;

		try {
			await Dynoscript.execute(command);
		} catch (e) {
			err = e;
		}
		expect(err.message).toMatch(/Divide by zero/);
	});

	test('it should throw expected number', async () => {
		const command = `$modc = '1' % '2' $modd = 'a' % 2`;
		let err;

		try {
			await Dynoscript.execute(command);
		} catch (e) {
			err = e;
		}
		expect(err.message).toMatch(/Expected number/);
	});

	test('it should throw method does not exist', async () => {
		let command = `{invalid test:'test'}`;
		let err;

		try {
			await Dynoscript.execute(command);
		} catch (e) {
			err = e;
		}
		expect(err.message).toMatch(/does not exist/);

		command = `{invalid.test test:'test'}`;
		try {
			await Dynoscript.execute(command);
		} catch (e) {
			err = e;
		}
		expect(err.message).toMatch(/does not exist/);
	});

	test('it should throw invalid property of class', async () => {
		const command = `{math.invalid test:'test'}`;
		let err;

		try {
			await Dynoscript.execute(command);
		} catch (e) {
			err = e;
		}
		expect(err.message).toMatch(/has no property/);
	});
});

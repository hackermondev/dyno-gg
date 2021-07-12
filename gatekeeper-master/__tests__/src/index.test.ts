jest.mock('../../src/Service');
import { Service } from '../../src/Service';

describe('index tests', () => {
	test('Should start the service', () => {
		const startMock = jest.fn();
		Service.mockImplementation(() => {
			return {
				start: startMock,
			};
		});

		require('../../src/index');

		expect(startMock).toHaveBeenCalledTimes(1);
	});
});

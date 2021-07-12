jest.mock('../../../src/mongo');
import moment = require('moment');
import { patreonDeleteQueue, premiumUsers, servers } from '../../../src/mongo';
import { checkPatrons } from '../../../src/operations/checkPatrons';

describe('checkPatrons tests', () => {
	const premiumUsersFind = jest.fn();
	const serversFind = jest.fn();
	const deletionInsert = jest.fn();
	const deletionFind = jest.fn();
	let pledgeMock : any[] = [];

	beforeAll(() => {
		premiumUsersFind.mockReturnValue(
			{
				toArray: () => {
					return [
						{
							_id: '1',
							patreonLinked: true,
							patreonUserId: '10',
						},
						{
							_id: '2',
							patreonLinked: true,
							patreonUserId: '20',
						},
						{
							_id: '3',
							patreonLinked: true,
							patreonUserId: '30',
						},
						{
							_id: '4',
							patreonLinked: true,
							patreonUserId: '40',
						},
						{
							_id: '5',
							patreonLinked: true,
							patreonUserId: '50',
						},
						{
							_id: '6',
							patreonLinked: true,
							patreonUserId: '60',
						},
					];
				},
			},
		);

		premiumUsers.mockImplementation(() => {
			return {
				find: premiumUsersFind,
			};
		});

		serversFind.mockReturnValue(
			{
				toArray: () => {
					return [
						{
							_id: '100',
							premiumUserId: '1',
						},
						{
							_id: '200',
							premiumUserId: '1',
						},
						{
							_id: '300',
							premiumUserId: '2',
						},
						{
							_id: '400',
							premiumUserId: '3',
						},
						{
							_id: '500',
							premiumUserId: '5',
						},
						{
							_id: '600',
							premiumUserId: '5',
						},
						{
							_id: '700',
							premiumUserId: '5',
						},
						{
							_id: '800',
							premiumUserId: '6',
						},
					];
				},
			},
		);

		deletionFind.mockReturnValue(
			{
				toArray: () => {
					return [
						{ _id: '800' },
					];
				},
			},
		);

		servers.mockImplementation(() => {
			return {
				find: serversFind,
			};
		});

		patreonDeleteQueue.mockImplementation(() => {
			return {
				insert: deletionInsert,
				find: deletionFind,
			};
		});
	});

	beforeEach(() => {
		premiumUsersFind.mockClear();
		serversFind.mockClear();
		deletionInsert.mockClear();
		deletionFind.mockClear();
		pledgeMock = [
			{
				id: '10',
				pledge: {
					declined_since: null,
				},
			},
			{
				id: '20',
				pledge: {
					declined_since: null,
				},
			},
			{
				id: '30',
				pledge: {
					declined_since: null,
				},
			},
			{
				id: '40',
				pledge: {
					declined_since: null,
				},
			},
			{
				id: '50',
				pledge: {
					declined_since: null,
				},
			},
		];
	});

	describe('Valid patrons', () => {
		test('Should not disable valid patrons (only valid)', async () => {
			await checkPatrons(pledgeMock);

			expect(deletionInsert).toHaveBeenCalledTimes(0);
		});

		test('Should not disable valid patrons (with declined)', async () => {
			const pledgeMockCopy = pledgeMock.slice(0);

			pledgeMockCopy[0].pledge.declined_since = new Date();
			pledgeMockCopy[1].pledge.declined_since = new Date();

			await checkPatrons(pledgeMockCopy);

			expect(deletionInsert).toHaveBeenCalledTimes(3);
			expect(deletionInsert).not.toHaveBeenCalledWith(
				expect.objectContaining({ _id: expect.stringMatching('400') }),
			);
			expect(deletionInsert).not.toHaveBeenCalledWith(
				expect.objectContaining({ _id: expect.stringMatching('500') }),
			);
			expect(deletionInsert).not.toHaveBeenCalledWith(
				expect.objectContaining({ _id: expect.stringMatching('600') }),
			);
			expect(deletionInsert).not.toHaveBeenCalledWith(
				expect.objectContaining({ _id: expect.stringMatching('700') }),
			);
		});

		test('Should not disable valid patrons (with deleted)', async () => {
			const pledgeMockCopy = pledgeMock.slice(2);

			await checkPatrons(pledgeMockCopy);

			expect(deletionInsert).toHaveBeenCalledTimes(3);
			expect(deletionInsert).not.toHaveBeenCalledWith(
				expect.objectContaining({ _id: expect.stringMatching('400') }),
			);
			expect(deletionInsert).not.toHaveBeenCalledWith(
				expect.objectContaining({ _id: expect.stringMatching('500') }),
			);
			expect(deletionInsert).not.toHaveBeenCalledWith(
				expect.objectContaining({ _id: expect.stringMatching('600') }),
			);
			expect(deletionInsert).not.toHaveBeenCalledWith(
				expect.objectContaining({ _id: expect.stringMatching('700') }),
			);
		});

		test('Should not disable valid patrons (with deleted & declined)', async () => {
			const pledgeMockCopy = pledgeMock.slice(1);
			pledgeMockCopy[0].pledge.declined_since = new Date();

			await checkPatrons(pledgeMockCopy);

			expect(deletionInsert).toHaveBeenCalledTimes(3);
			expect(deletionInsert).not.toHaveBeenCalledWith(
				expect.objectContaining({ _id: expect.stringMatching('400') }),
			);
			expect(deletionInsert).not.toHaveBeenCalledWith(
				expect.objectContaining({ _id: expect.stringMatching('500') }),
			);
			expect(deletionInsert).not.toHaveBeenCalledWith(
				expect.objectContaining({ _id: expect.stringMatching('600') }),
			);
			expect(deletionInsert).not.toHaveBeenCalledWith(
				expect.objectContaining({ _id: expect.stringMatching('700') }),
			);
		});
	});

	describe('Declined patrons', () => {
		test('Should disable declined patrons (single)', async () => {
			const pledgeMockCopy = pledgeMock.slice(0);
			pledgeMockCopy[0].pledge.declined_since = new Date();

			await checkPatrons(pledgeMockCopy);
			expect(deletionInsert).toHaveBeenCalledTimes(2);
			expect(deletionInsert).toHaveBeenCalledWith(
				expect.objectContaining({ _id: expect.stringMatching('100') }),
			);
			expect(deletionInsert).toHaveBeenCalledWith(
				expect.objectContaining({ _id: expect.stringMatching('200') }),
			);
		});

		test('Should disable declined patrons (multiple)', async () => {
			const pledgeMockCopy = pledgeMock.slice(0);
			pledgeMockCopy[0].pledge.declined_since = new Date();
			pledgeMockCopy[1].pledge.declined_since = new Date();
			pledgeMockCopy[4].pledge.declined_since = new Date();

			await checkPatrons(pledgeMockCopy);

			expect(deletionInsert).toHaveBeenCalledTimes(6);
			expect(deletionInsert).toHaveBeenCalledWith(
				expect.objectContaining({ _id: expect.stringMatching('100') }),
			);
			expect(deletionInsert).toHaveBeenCalledWith(
				expect.objectContaining({ _id: expect.stringMatching('200') }),
			);
			expect(deletionInsert).toHaveBeenCalledWith(
				expect.objectContaining({ _id: expect.stringMatching('300') }),
			);
			expect(deletionInsert).toHaveBeenCalledWith(
				expect.objectContaining({ _id: expect.stringMatching('500') }),
			);
			expect(deletionInsert).toHaveBeenCalledWith(
				expect.objectContaining({ _id: expect.stringMatching('600') }),
			);
			expect(deletionInsert).toHaveBeenCalledWith(
				expect.objectContaining({ _id: expect.stringMatching('700') }),
			);
		});
	});

	describe('Deleted patrons', () => {
		test('Should disable deleted patrons (single)', async () => {
			const pledgeMockCopy = pledgeMock.slice(1);

			await checkPatrons(pledgeMockCopy);
			expect(deletionInsert).toHaveBeenCalledTimes(2);
			expect(deletionInsert).toHaveBeenCalledWith(
				expect.objectContaining({ _id: expect.stringMatching('100') }),
			);
			expect(deletionInsert).toHaveBeenCalledWith(
				expect.objectContaining({ _id: expect.stringMatching('200') }),
			);
		});

		test('Should disable deleted patrons (multiple)', async () => {
			const pledgeMockCopy = pledgeMock.slice(1, 3);

			await checkPatrons(pledgeMockCopy);

			expect(deletionInsert).toHaveBeenCalledTimes(5);
			expect(deletionInsert).toHaveBeenCalledWith(
				expect.objectContaining({ _id: expect.stringMatching('100') }),
			);
			expect(deletionInsert).toHaveBeenCalledWith(
				expect.objectContaining({ _id: expect.stringMatching('200') }),
			);
			expect(deletionInsert).toHaveBeenCalledWith(
				expect.objectContaining({ _id: expect.stringMatching('500') }),
			);
			expect(deletionInsert).toHaveBeenCalledWith(
				expect.objectContaining({ _id: expect.stringMatching('600') }),
			);
			expect(deletionInsert).toHaveBeenCalledWith(
				expect.objectContaining({ _id: expect.stringMatching('700') }),
			);
		});
	});

	describe('Deletion types', () => {
		test('Should mark deleted with deleted_pledge', async () => {
			const pledgeMockCopy = pledgeMock.slice(1);

			await checkPatrons(pledgeMockCopy);
			expect(deletionInsert).toHaveBeenCalledTimes(2);
			expect(deletionInsert).toHaveBeenCalledWith(
				expect.objectContaining({ type: expect.stringMatching('deleted_pledge') }),
			);
			expect(deletionInsert).toHaveBeenCalledWith(
				// Match anything but 'deleted_pledge'
				expect.objectContaining({ type: expect.not.stringMatching(/^(?!(deleted_pledge)$).*$/) }),
			);
		});

		test('Should mark declined with declined_pledge', async () => {
			const pledgeMockCopy = pledgeMock.slice(0);
			pledgeMockCopy[0].pledge.declined_since = new Date();

			await checkPatrons(pledgeMockCopy);
			expect(deletionInsert).toHaveBeenCalledTimes(2);
			expect(deletionInsert).toHaveBeenCalledWith(
				expect.objectContaining({ type: expect.stringMatching('declined_pledge') }),
			);
			expect(deletionInsert).toHaveBeenCalledWith(
				// Match anything but 'declined_pledge'
				expect.objectContaining({ type: expect.not.stringMatching(/^(?!(declined_pledge)$).*$/) }),
			);
		});
	});

	describe('Grace Periods', () => {
		test('Should provide a 1 day grace period for deletes', async () => {
			const pledgeMockCopy = pledgeMock.slice(1);

			await checkPatrons(pledgeMockCopy);
			expect(deletionInsert).toHaveBeenCalledTimes(2);

			const deletionDate1 = moment(deletionInsert.mock.calls[0][0].disableAt);
			const deletionDate2 = moment(deletionInsert.mock.calls[1][0].disableAt);

			expect(deletionDate1.isValid()).toEqual(true);
			expect(deletionDate2.isValid()).toEqual(true);

			expect(deletionDate1.isBetween(
				moment().add(1, 'days').subtract(1, 'minutes'),
				moment().add(1, 'days').add(1, 'minutes'),
			)).toEqual(true);

			expect(deletionDate2.isBetween(
				moment().add(1, 'days').subtract(1, 'minutes'),
				moment().add(1, 'days').add(1, 'minutes'),
			)).toEqual(true);
		});

		test('Should provide a 1 week grace period for declines', async () => {
			const pledgeMockCopy = pledgeMock.slice(0);
			pledgeMockCopy[0].pledge.declined_since = new Date();

			await checkPatrons(pledgeMockCopy);
			expect(deletionInsert).toHaveBeenCalledTimes(2);

			const deletionDate1 = moment(deletionInsert.mock.calls[0][0].disableAt);
			const deletionDate2 = moment(deletionInsert.mock.calls[1][0].disableAt);

			expect(deletionDate1.isValid()).toEqual(true);
			expect(deletionDate2.isValid()).toEqual(true);

			expect(deletionDate1.isBetween(
				moment().add(1, 'weeks').subtract(1, 'minutes'),
				moment().add(1, 'weeks').add(1, 'minutes'),
			)).toEqual(true);

			expect(deletionDate2.isBetween(
				moment().add(1, 'weeks').subtract(1, 'minutes'),
				moment().add(1, 'weeks').add(1, 'minutes'),
			)).toEqual(true);
		});
	});
});

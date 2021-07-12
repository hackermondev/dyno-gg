import {Repository} from 'mongot';
import {PatreonCollection} from './PatreonCollection';
import {PatronCollection} from './PatronCollection';
export {PatreonDocument} from './documents/PatreonDocument';
export {PatronDocument} from './documents/PatronDocument';

const options = {};
const repository = new Repository('mongodb://localhost/test', options);

export const patreon = repository.get(PatreonCollection);
export const patrons = repository.get(PatronCollection);

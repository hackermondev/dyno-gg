import {Collection, collection} from 'mongot';
import {PatreonDocument} from './documents/PatreonDocument';

/**
 * Patreon collection
 */
@collection('patreon', PatreonDocument)
export class PatreonCollection extends Collection<PatreonDocument> {

}

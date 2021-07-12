import {Collection, collection, index} from 'mongot';
import {PatronDocument} from './documents/PatronDocument';

/**
 * Patron Collection
 */
@index('id', {unique: true})
@index('deleted')
@index('discord_id')
@index('pledge.id')
@collection('patrons', PatronDocument)
export class PatronCollection extends Collection<PatronDocument> {

}

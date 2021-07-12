import {SchemaDocument, SchemaFragment} from 'mongot';
import {document, fragment, prop} from 'mongot';

/**
 * Pledge sub document
 */
@fragment
class PledgeFragment extends SchemaFragment {
	@prop public id: string;
	@prop public amount_cents: number;
	@prop public created_at: Date;
	@prop public declined_since: Date;
}

/**
 * Patron Document
 */
@document
export class PatronDocument extends SchemaDocument {
	@prop
	public id: string;

	@prop
	public discord_id: string;

	@prop
	public email: string;

	@prop
	public first_name: string;

	@prop
	public last_name: string;

	@prop
	public full_name: string;

	@prop
	public is_email_verified: boolean;

	@prop
	public image_url: string;

	@prop
	public thumb_url: string;

	@prop
	public url: string;

	@prop
	public pledge: PledgeFragment;

	@prop
	public deleted: boolean = false;
}

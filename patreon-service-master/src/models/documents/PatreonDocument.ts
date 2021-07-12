import {Events, SchemaDocument} from 'mongot';
import {document, hook, prop, virtual} from 'mongot';
import {Utils} from '../../Utils';

/**
 * Patreon Auth Document
 */
@document
export class PatreonDocument extends SchemaDocument {
	@prop
	public access_token: string;

	@prop
	public refresh_token: string;

	@prop
	public scope: string;

	@prop
	public expires_in: number;

	@prop
	public expires: Date;

	@prop
	public version: string;

	@hook(Events.beforeUpdate)
	public encryptSecrets(): void {
		const secretKey = process.env.SECRET_KEY;
		if (secretKey == undefined) {
			throw new Error('SECRET_KEY is undefined');
		}
		this.access_token = Utils.encrypt(Utils.sha256(`${this.expires}.${secretKey}`), this.access_token);
		this.refresh_token = Utils.encrypt(Utils.sha256(`${this.expires}.${secretKey}`), this.refresh_token);
	}

	@hook(Events.beforeUpdate)
	public setExpires(): void {
		const expires = Date.now() + this.expires_in;
		this.expires = new Date(expires);
	}

	@virtual get accessToken() {
		const secretKey = process.env.SECRET_KEY;
		if (secretKey == undefined) {
			throw new Error('SECRET_KEY is undefined');
		}
		return Utils.decrypt(Utils.sha256(`${this.expires}.${secretKey}`), this.access_token);
	}

	@virtual get refreshToken() {
		const secretKey = process.env.SECRET_KEY;
		if (secretKey == undefined) {
			throw new Error('SECRET_KEY is undefined');
		}
		return Utils.decrypt(Utils.sha256(`${this.expires}.${secretKey}`), this.refresh_token);
	}
}

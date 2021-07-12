import * as crypto from 'crypto';

/**
 * Utility methods
 */
export class Utils {
	public static encrypt(key: string, data: any) {
		const iv = crypto.randomBytes(16);
		const cipher = crypto.createCipheriv('aes-256-cbc', new Buffer(key), iv);
		let encrypted = cipher.update(data);

		encrypted = Buffer.concat([encrypted, cipher.final()]);

		return `${iv.toString('hex')}:${encrypted.toString('hex')}`;
	}

	public static decrypt(key: string, data: string) {
		const parts = data.split(':');
		const iv = new Buffer(parts.shift(), 'hex');
		const encryptedText = new Buffer(parts.join(':'), 'hex');
		const decipher = crypto.createDecipheriv('aes-256-cbc', new Buffer(key), iv);
		let decrypted = decipher.update(encryptedText);

		decrypted = Buffer.concat([decrypted, decipher.final()]);

		return decrypted.toString();
	}

	// public static encrypt(key: string, data: string): string {
	// 	const cipher = crypto.createCipher('aes256', key);
	// 	let result  = cipher.update(`${key}`, 'utf8', 'hex');

	// 	result += cipher.final();
	// 	return result;
	// }

	// public static decrypt(key: string, data: string): string {
	// 	const decipher = crypto.createDecipher('aes256', key);
	// 	let result = decipher.update(data, 'hex', 'utf8');

	// 	result += decipher.final('utf8');
	// 	return result;
	// }

	public static sha256(data: any): string {
		return crypto.createHash('sha256').update(data, 'utf8').digest('hex');
	}
}

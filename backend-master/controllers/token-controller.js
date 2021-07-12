const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

const readFileAsync = filePath => new Promise((resolve, reject) => {
	fs.readFile(filePath, (err, data) => {
		if (err) {
			return reject(err);
		}
		resolve(data);
	});
});

class TokenController {
	constructor(algorithm) {
		this.cert = null;
		this.algorithm = algorithm || 'sha256';
	}

	/**
	 * Loads the certificate from the given file path
	 *
	 * @param {string} privCertFilePath The path where the cert is located
	 */
	async loadCert(privCertFilePath) {
		if (privCertFilePath) {
			this.cert = await readFileAsync(path.resolve(privCertFilePath));
		}
	}

	/**
	 * Generate a new token
	 * @param accountId - id of the account
	 * @param data - data that should be encrypted within the token
	 * @return {string} - the encrypted token as base64
	 */
	generate(accountId, data) {
		const secretPart = this.sign(data);
		const token = Buffer.from(`${accountId}:${secretPart.toString()}`);
		return token.toString('base64');
	}

	/**
	 * Signs the secret part of a token
	 * @param data - the data to sign
	 * @return {String} - signed data
	 */
	sign(data) {
		if (!this.cert) {
			throw new Error('Certificate not loaded yet.');
		}
		return crypto.createHmac(this.algorithm, this.cert)
			.update(data)
			.digest('hex');
	}

	/**
	 * Verifies a signed token
	 * @param signedData - the received token
	 * @param unsignedData - data that is expected within the token
	 * @return {boolean} - whether the token is valid or not
	 */
	verify(signedData, unsignedData) {
		if (!this.cert) {
			throw new Error('Certificate not loaded yet.');
		}
		const hash = crypto.createHmac(this.algorithm, this.cert)
			.update(unsignedData)
			.digest('hex');
		return hash === signedData;
	}
}
module.exports = TokenController;

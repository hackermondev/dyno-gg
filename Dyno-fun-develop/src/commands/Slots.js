const { Command } = require('@dyno.gg/dyno-core');

// this thing was made by Mika K.#2002 btw... If my discrim should change in the future or I should go missing, my user ID on Discord is 264762392683085834
class Slots extends Command {
	constructor(...args) {
		super(...args);

		this.aliases      = ['slots'];
		this.module       = 'Fun';
		this.description  = 'Spin the slots and win the jackpot! ...or lose everything.';
		this.usage        = 'slots';
		this.example      = 'slots';
		this.cooldown     = 20000;
		this.expectedArgs = 0;
	}

	checkJackpot(gameID, bonus) {
		// basically just checking if the highest possible score was reached
		if (gameID === '555' && bonus === 15) {
			return true;
		} else {
			return false;
		}
	}

	checkTriple(first, second, third, gameID) {
		// these gameIDs are valid triples even though they do not follow the standard scheme
		const special = ['154', '215', '512', '451'];

		// If all emojis on the middle line are the same
		if (first === second && second === third) {
			return true;
		} else if (first - 1 === second && second === third + 1) { // If all emojis on the diagonal starting at the bottom left are the same
			return true;
		} else if (first + 1 === second && second === third - 1) { // if all emojis on the diagonal starting at the top left are the same
			return true;
		} else if (special.indexOf(gameID) > -1) { // If it doesnt follow the scheme but is still a valid triple
			return true;
		} else {
			return false;
		}
	}

	checkDouble(first, second, third) {
		// If either the first or the last two on the middle line are the same
		if (first === second || second === third) {
			return true;
		} else {
			return false;
		}
	}

	execute({ message }) {
		const emojis = [
			':bullettrain_front:',
			':white_sun_small_cloud:',
			':lion_face:',
			':earth_africa:',
			':crown:',
			':bullettrain_front:',
			':white_sun_small_cloud:',
		]; // Insert emoji strings of whatever you like

		let first = Math.floor(Math.random() * 5) + 1;
		let second = Math.floor(Math.random() * 5) + 1;
		let third = Math.floor(Math.random() * 5) + 1;
		let bonus = Math.floor(Math.random() * 10) + 6;
		let gameID = first.toString() + second.toString() + third.toString();

		let result = `\n<:dynov4:341008963254484992> ***DYNO SLOTS*** <:dynov4:341008963254484992>\n\n`;
		result += `--------------------------\n`;
		result += `\\\u2198     ${emojis[first - 1]}  ${emojis[second - 1]}  ${emojis[third - 1]}     \\\u2199\n\n`;
		result += `\\\u25B6    ${emojis[first]}  ${emojis[second]}  ${emojis[third]}    \\\u25C0\n\n`;
		result += `\\\u2197     ${emojis[first + 1]}  ${emojis[second + 1]}  ${emojis[third + 1]}     \\\u2196`;
		result += `\n--------------------------\n\n\n`;

		let url = this.config.site.host;

		return this.sendMessage(message.channel, {
			embed: {
				url: url,
				description: `Spinning the wheels of fortune for [${message.member.username}](${url})...`,
				color: 1259143,
				thumbnail: {
					url: 'https://s18.postimg.org/hmpvac5qh/dynoslots_spin.gif',
				},
			},
		}).then(msg => {
			let embed = {
				title: '',
				url: url,
				color: 0,
				description: `${result}`,
				footer: {
					text: `Game played by ${message.member.username}#${message.member.discriminator}`,
					icon_url: message.member.avatarURL,
				},
				thumbnail: {
					url: '',
				},
			};

			if (this.checkJackpot(gameID, bonus)) {
				embed.title = 'JACKPOT!';
				embed.color = 13496340;
				embed.description += `**Woah, thats a Jackpot!** You were lucky and reached the best result in this game possible!\nNow thats a thing to screenshot and share with your friends, [${message.member.username}](${url})!`;
				embed.thumbnail.url = 'https://s17.postimg.org/w4v2gei1r/tumblr_mh79cf_ON001r88gpzo1_400.gif';

				setTimeout(() => this.client.editMessage(msg.channel.id, msg.id, { embed }), 2000);
			} else if (this.checkTriple(first, second, third, gameID)) {
				embed.title = 'Congratulations!';
				embed.color = 0x337fd5;
				embed.description += `You got **three in a row**, [${message.member.username}](${url}). Amazing!`;
				embed.thumbnail.url = 'https://s18.postimg.org/u6kzxx9bd/dynoslots_win2.gif';

				setTimeout(() => this.client.editMessage(msg.channel.id, msg.id, { embed }), 2000);
			} else if (this.checkDouble(first, second, third)) {
				embed.title = 'Thats a pair!';
				embed.color = 8773445;
				embed.description += `**Thats a pair!**, [${message.member.username}](${url})! Not bad.`;
				embed.thumbnail.url = 'https://s17.postimg.org/j0pi3qd5b/giphy.gif';

				setTimeout(() => this.client.editMessage(msg.channel.id, msg.id, { embed }), 2000);
			} else { // if none of the above was true, the player has lost, so no additional check here
				embed.title = 'Try again!';
				embed.color = 0xFF0000;
				embed.description += `**You lost**, better luck next time, [${message.member.username}](${url})!`;
				embed.thumbnail.url = 'https://s17.postimg.org/dcj7cxgjj/giphy.gif';

				setTimeout(() => this.client.editMessage(msg.channel.id, msg.id, { embed }), 2000);
			}
		});
	}
}

module.exports = Slots;

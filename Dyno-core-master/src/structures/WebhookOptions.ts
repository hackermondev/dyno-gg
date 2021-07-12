import * as eris from '@dyno.gg/eris';

export default interface WebhookOptions {
	avatarURL?: string;
	content?: string;
	embeds?: eris.EmbedOptions[];
	slack?: boolean;
}

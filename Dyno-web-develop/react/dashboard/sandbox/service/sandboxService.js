import axios from 'axios';

export async function postEmoji(channel, emoji) {
    const url = '/api/server/' + server + '/sandbox/postEmoji';
	const data = { channelId: channel.value, emoji };

    try {
        const result = await axios.post(url, data);
        _showSuccess(`Posted ${emoji.name}`);
        return result.data || result || {};
    } catch (err) {
        return _showError('Something went wrong.');
    }
}
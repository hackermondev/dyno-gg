import axios from 'axios';

export async function createMessageEmbed(message) {
    const url = '/api/server/' + server + '/messageEmbed/create';
	const data = { message };

    try {
        const result = await axios.post(url, data);
        _showSuccess(`Added Message Embed ${message.name}`);
        return result.data || result || {};
    } catch (err) {
        return _showError('Something went wrong.');
    }
}

export async function deleteMessageEmbed(message) {
    const url = '/api/server/' + server + '/messageEmbed/delete';
	const data = { message };

    try {
        await axios.post(url, data);
        return _showSuccess(`Deleted Message Embed ${message.name}`);
    } catch (err) {
        return _showError('Something went wrong.');
    }
}

export async function editMessageEmbed(message) {
    const url = '/api/server/' + server + '/messageEmbed/edit';
	const data = { message };

    try {
        await axios.post(url, data);
        return _showSuccess(`Edited Message Embed ${message.name}`);
    } catch (err) {
        return _showError('Something went wrong.');
    }
}

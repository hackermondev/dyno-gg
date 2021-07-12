import axios from 'axios';

export async function createReactionRoles(message) {
    const url = '/api/server/' + server + '/reactionRoles/create';
	const data = { message };

    try {
        const result = await axios.post(url, data);
        _showSuccess(`Added Reaction Role ${message.name}`);
        return result.data || result || {};
    } catch (err) {
        return _showError('Something went wrong.');
    }
}

export async function deleteReactionRoles(message) {
    const url = '/api/server/' + server + '/reactionRoles/delete';
	const data = { message };

    try {
        await axios.post(url, data);
        return _showSuccess(`Deleted Reaction Role ${message.name}`);
    } catch (err) {
        return _showError('Something went wrong.');
    }
}

export async function editReactionRoles(message) {
    const url = '/api/server/' + server + '/reactionRoles/edit';
	const data = { message };

    try {
        await axios.post(url, data);
        return _showSuccess(`Edited Reaction Role ${message.name}`);
    } catch (err) {
        return _showError('Something went wrong.');
    }
}

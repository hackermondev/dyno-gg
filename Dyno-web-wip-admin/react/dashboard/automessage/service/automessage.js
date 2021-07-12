import axios from 'axios';

export async function addAutomessage(data, channel) {
    const url = '/api/server/' + server + '/automessage/create';

    try {
        await axios.post(url, data);
        return _showSuccess(`Added Automessage ${channel}`);
    } catch (err) {
        return _showError('Something went wrong.');
    }
}

export async function deleteAutomessage(message, channel) {
    const url = '/api/server/' + server + '/automessage/delete';

	const data = { message, channel }

    try {
        await axios.post(url, data);
        return _showSuccess(`Deleted Automessage ${channel.name}`);
    } catch (err) {
        return _showError('Something went wrong.');
    }
}

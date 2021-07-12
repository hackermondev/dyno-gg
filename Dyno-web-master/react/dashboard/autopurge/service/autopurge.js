import axios from 'axios';

export async function addAutopurge(data, channel) {
    const url = '/api/server/' + server + '/autopurge/create';

    try {
        await axios.post(url, data);
        return _showSuccess(`Added Autopurge ${channel}`);
    } catch (err) {
        return _showError('Something went wrong.');
    }
}

export async function deleteAutopurge(purge, channel) {
    const url = '/api/server/' + server + '/autopurge/delete';

	const data = { purge, channel };

    try {
        await axios.post(url, data);
        return _showSuccess(`Deleted Autopurge ${channel.name}`);
    } catch (err) {
        return _showError('Something went wrong.');
    }
}

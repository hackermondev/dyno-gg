import axios from 'axios';

export async function addSlowmode(data, channel) {
    const url = '/api/server/' + server + '/slowmode/create';

    const int = parseInt(data.time);
    if (int > 2880) {
        return _showError(`The time must be less than 2880 minutes.`);
    }

    if (!data.id) {
        return _showError(`You must select a channel.`);
    }

    try {
        await axios.post(url, data);
        return _showSuccess(`Added Slowmode ${channel}`);
    } catch (err) {
        return _showError('Something went wrong.');
    }
}

export async function deleteSlowmode(options, channel) {
    const url = '/api/server/' + server + '/slowmode/delete';

	const data = { options, channel };

    try {
        await axios.post(url, data);
        return _showSuccess(`Deleted Slowmode ${channel.name}`);
    } catch (err) {
        return _showError('Something went wrong.');
    }
}

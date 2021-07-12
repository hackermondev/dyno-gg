import axios from 'axios';

export async function createTag(data) {
    const url = '/api/server/' + server + '/tags/create';

    try {
        const result = await axios.post(url, data);
        _showSuccess(`Created Tag ${data.tag}`);
        return result.data || result || {};
    } catch (err) {
        return _showError('Something went wrong.');
    }
}

export async function deleteTag(data) {
    const url = '/api/server/' + server + '/tags/delete';

    try {
        const result = await axios.post(url, data);
        _showSuccess(`Deleted Tag ${data.tag}`);
        return result.data || result || {};
    } catch (err) {
        return _showError('Something went wrong.');
    }
}

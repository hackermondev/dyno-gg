import axios from 'axios';

export async function updateBadWords(module, type, words) {
	const url = '/api/server/' + server + '/bannedWords/add';
    const data = { module: module.name.toLowerCase(), type, words };
    
    const wordArr = words.replace(', ', ',').split(',');
    const invalidWords = wordArr.filter(w => w.length <= 2);
    if (invalidWords && invalidWords.length) {
        _showError('Words have to be longer than 2 characters.');
        throw new Error('Words have to be longer than 2 characters.');
    }

    try {
        await axios.post(url, data);
        return _showSuccess(`Updated Banned Words`);
    } catch (err) {
        return _showError(`Something went wrong.`);
    }
}

export async function updateFilter(setting, settings, friendlyName) {
    const url = '/api/server/' + server + '/automod/updateFilter';
    const data = { setting, settings };

    try {
        await axios.post(url, data);
        return _showSuccess(`Updated ${friendlyName}`);
    } catch (err) {
        return _showError(`Something went wrong.`);
    }
}

export async function updateFilterSettings(setting, settings, friendlyName) {
    const url = '/api/server/' + server + '/automod/updateFilterSettings';
    const data = { setting, settings };

    try {
        await axios.post(url, data);
        return _showSuccess(`Updated ${friendlyName}`);
    } catch (err) {
        return _showError(`Something went wrong.`);
    }
}

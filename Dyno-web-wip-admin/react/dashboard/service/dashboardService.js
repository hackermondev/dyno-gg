import axios from 'axios';

export async function updateSetting(setting, value) {
    const url = '/api/server/' + server + '/updateSetting';
    const data = { setting, value };

    try {
        await axios.post(url, data);
        return _showSuccess(`Changed ${setting} to ${value}`);
    } catch (err) {
        return _showError('Something went wrong.');
    }
}

export async function updateNick(nick) {
    const url = '/api/server/' + server + '/updateNick';
    const data = { nick };

    try {
        await axios.post(url, data);
        return _showSuccess(`Changed Nickname to ${nick}`);
    } catch (err) {
        return _showError('Something went wrong.');
    }
}

export async function updateModuleState(module, enabled) {
    const url = '/api/server/' + server + '/toggleModule';
    const data = { module: module.name, enabled: enabled };

    try {
        await axios.post(url, data);
    } catch (err) {
        return _showError('Something went wrong.');
    }
    const enabledOrDisabled = enabled ? 'enabled' : 'disabled';
    return _showSuccess(`Module ${module.friendlyName || module.name} was ${enabledOrDisabled}.`);
}

export async function updateModuleSetting(module, setting, value, friendlyName, valueName) {
    const url = '/api/server/' + server + '/updateModuleSetting';
    const data = { module: module.name.toLowerCase(), setting: setting, value };

    try {
        await axios.post(url, data);

        if (typeof value === 'boolean') {
            const enabledOrDisabled = value ? 'enabled' : 'disabled';
            return _showSuccess(`${friendlyName} ${enabledOrDisabled}.`);
        } else {
            if (!valueName && typeof value === 'object') {
                return _showSuccess(`Updated ${friendlyName}`);
            }
            if (value) value = value.substr(0, 35) + '...';
            return _showSuccess(`Changed ${friendlyName} to ${valueName || value}`);
        }
    } catch (err) {
        return _showError('Something went wrong.');
    }
}

export async function addModuleItem(module, setting, value, friendlyName) {
    const url = '/api/server/' + server + '/moduleItem/add';
    const data = { module: module.name.toLowerCase(), setting: setting, item: value };

    try {
        await axios.post(url, data);
        return _showSuccess(`Added ${friendlyName} ${value.name || ''}`);
    } catch (err) {
        return _showError('Something went wrong.');
    }
}

export async function removeModuleItem(module, setting, value, friendlyName) {
    const url = '/api/server/' + server + '/moduleItem/remove';
    const data = { module: module.name.toLowerCase(), id: value, setting: setting };

    try {
        await axios.post(url, data);
        return _showSuccess(`Removed ${friendlyName}`);
    } catch (err) {
        return _showError('Something went wrong.');
    }
}

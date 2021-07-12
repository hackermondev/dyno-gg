import axios from 'axios';

export async function updateModRoles(roles) {
    const url = '/api/server/' + server + '/updateSetting';
    const data = { setting: 'modRoles', value: roles || [] };

    try {
        await axios.post(url, data);
        return _showSuccess(`Updated Mod Roles`);
    } catch (err) {
        return _showError(`Something went wrong.`);
    }
}

export async function addModRole(role) {
    const url = '/api/server/' + server + '/modRoles/add';
    const data = { id: role.id, name: role.name };

    try {
        await axios.post(url, data);
        return _showSuccess(`Added ${role.name}`);
    } catch (err) {
		throw err;
        return _showError('Something went wrong.');
    }
}

export async function removeModRole(role) {
    const url = '/api/server/' + server + '/modRoles/remove';
    const data = { id: role.id, name: role.name };

    try {
        await axios.post(url, data);
        return _showSuccess(`Removed ${role.name}`);
    } catch (err) {
		throw err;
        return _showError('Something went wrong.');
    }
}

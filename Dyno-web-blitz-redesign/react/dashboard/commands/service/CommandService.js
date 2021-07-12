import axios from 'axios';

export async function updateCommandToggle(command, enabled) {
    if (command.disabled) {
        return;
    }

    const hasParent = command.parent
    const url = '/api/server/' + server + '/commands/' + (!hasParent ? 'toggleCommand' : 'toggleSubcommand');
    const commandIdentifier = (!hasParent ? command.name : `${command.parent.name}.${command.name}`);
    const data = { command: commandIdentifier, enabled: enabled };

    try {
        await axios.post(url, data);
    } catch (err) {
        return _showError('Something went wrong.');
    }
    var enabledOrDisabled = enabled ? 'enabled' : 'disabled';
    return _showSuccess("Command '" + commandIdentifier + "' has been " + enabledOrDisabled + '.');
}

export async function saveCommandSettings(command, settings) {
    const url = '/api/server/' + server + '/commands/updateSettings';
    const data = { command, settings };

    try {
        await axios.post(url, data);
        return _showSuccess(`Command settings saved for ${command.name}.`);
    } catch (err) {
        return _showError(`Something went wrong.`);
    }
}

export async function saveCommandGroupSettings(group, settings) {
    const url = '/api/server/' + server + '/commands/' + group.name + '/updateSettings';
    const data = { group: group.name, settings };

    try {
        await axios.post(url, data);
        _showSuccess(`Command settings saved for ${group.name}.`);
        return Promise.resolve();
    } catch (err) {
        _showError(`Something went wrong.`);
        return Promise.reject();
    }
}

export async function saveModuleCommandSettings(module, settings) {
    const url = '/api/server/' + server + '/commands/module/' + module.name + '/updateSettings';
    const data = { module: module.name, settings };

    try {
        await axios.post(url, data);
        _showSuccess(`Command settings saved for ${module.name}.`);
        return Promise.resolve();
    } catch (err) {
        _showError(`Something went wrong.`);
        return Promise.reject();
    }
}

export async function updateCommandGroup(group, enabled) {
    const url = '/api/server/' + server + '/commands/' + group.name + '/toggle';
    const data = { group: group.name, enabled };

    try {
        await axios.post(url, data);
    } catch (err) {
        _showError(`Something went wrong.`);
        return Promise.reject();
    }

    var enabledOrDisabled = enabled ? 'enabled' : 'disabled';
    _showSuccess("All commands in '" + group.name + "' have been " + enabledOrDisabled + '.');
    return Promise.resolve();
}

export async function updateModuleGroup(module, enabled) {
    const url = '/api/server/' + server + '/commands/module/' + module.name + '/toggle';
    const data = { module: module.name, enabled };

    try {
        await axios.post(url, data);
    } catch (err) {
        _showError(`Something went wrong.`);
        return Promise.reject();
    }

    var enabledOrDisabled = enabled ? 'enabled' : 'disabled';
    _showSuccess("All commands in '" + module.name + "' have been " + enabledOrDisabled + '.');
    return Promise.resolve();
}
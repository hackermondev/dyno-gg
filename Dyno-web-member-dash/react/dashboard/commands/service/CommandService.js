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

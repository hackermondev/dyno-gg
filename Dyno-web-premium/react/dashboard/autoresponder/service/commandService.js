import axios from 'axios';

export async function addCommand(command) {
    const url = '/api/server/' + server + '/customcommands/create';
    const data = { command };

    // Max length
    if (command.command.length > 72) return _showError('Command name cannot be over 72 characters.');
    if (command.response.length > 10000) return _showError('Response cannot be over 10,000 characters.');
    command.response = command.response.replace(/ *\{[^)]*\} */g, '');
    if (command.response.length > 2000) return _showError('Response cannot be over 2,000 characters.');

    // Invalid characters
    let illegalChars = command.command.match(/[^\w\d-_]/g);
    if (illegalChars) {
        return _showError('Illegal command characters.');
    }

    try {
        await axios.post(url, data);
        _showSuccess(`Added Command ${command.command}`);
        return true;
    } catch (err) {
        _showError('Something went wrong.');
        return false;
    }
}

export async function saveCommand(command) {
    const url = '/api/server/' + server + '/customcommands/edit';
    const data = { command };

    try {
        await axios.post(url, data);
        return _showSuccess(`Edited Command ${command.command}`);
    } catch (err) {
        return _showError('Something went wrong.');
    }
}

export async function deleteCommand(command) {
    const url = '/api/server/' + server + '/customcommands/delete';
    const data = { command };

    try {
        await axios.post(url, data);
        return _showSuccess(`Deleted Command ${command.command}`);
    } catch (err) {
        return _showError('Something went wrong.');
    }
}

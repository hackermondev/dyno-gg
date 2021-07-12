import axios from 'axios';

export async function addAutorole(autorole, role) {
    const url = '/api/server/' + server + '/autoroles/create';
	const data = autorole;

    try {
        await axios.post(url, data);
        return _showSuccess(`Added Autorole ${role.name}`);
    } catch (err) {
        return _showError('Something went wrong.');
    }
}

export async function removeAutorole(autorole, role) {
    const url = '/api/server/' + server + '/autoroles/delete';
    const data = autorole;

	data.name = role.name;

    try {
        await axios.post(url, data);
        return _showSuccess(`Deleted Autorole ${role.name}`);
    } catch (err) {
        return _showError('Something went wrong.');
    }
}

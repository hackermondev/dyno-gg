/* globals _showSuccess _showError server */
import axios from 'axios';

export async function addSubreddit(data) {
    const url = '/api/server/' + server + '/reddit/create';

    try {
        await axios.post(url, data);
        _showSuccess(`Subscribed to r/${data.subreddit}`);
        return true;
    } catch (err) {
        _showError(err.response.data || 'Something went wrong.');
    }
    return false;
}

export async function removeSubreddit(subscription) {
    const url = '/api/server/' + server + '/reddit/delete';

	const data = subscription;

    try {
        await axios.post(url, data);
        _showSuccess(`Deleted Subscription.`);
        return true;
    } catch (err) {
        _showError(err.response.data || 'Something went wrong.');
    }

    return false;
}

const superagent = require('superagent');

class Steamer {
    constructor() {
        this.baseURl = "http://api.steampowered.com/"
    }

    async createRequest(token, interfaceName, method, version) {
        let url = `${this.baseURl}/${interfaceName}/${method}/v${version}/?key=${token}&format=json`;
        return url;
    }

    async ownedGames(steamID, token) {
        let requestURL = await this.createRequest(token, "IPlayerService", "GetOwnedGames", "1");
        let response = await superagent.get(`${requestURL}&steamid=${steamID}&include_appinfo=1&include_played_free_games=1`);
        if (!response) {
            return 'No response from Steam!';
        }
        return response;
    }

    async recentGames(steamID, token) {
        let requestURL = await this.createRequest(token, "IPlayerService", "GetRecentlyPlayedGames", "1");
        let response = await superagent.get(`${requestURL}&steamid=${steamID}&count=5`);
        if (!response) {
            return 'No response from Steam!';
        }
        return response;
    }

    async user(steamID, token) {
        let requestURL = await this.createRequest(token, "ISteamUser", "GetPlayerSummaries", "2");
        let response = await superagent.get(`${requestURL}&steamid=${steamID}`);
        if (!response) {
            return 'No response from Steam!';
        }
        return response;
    }

    async gameNews(appID, token) {
        let requestURL = await this.createRequest(token, "ISteamNews", "GetNewsForApp", "2");
        let response = await superagent.get(`${requestURL}&appid=${appID}&count=1&maxlength=1000`);
        if (!response) {
            return 'No response from Steam!';
        }
        return response;
    }

    async game(appID) {

        let response = await superagent.get(`http://store.steampowered.com/api/appdetails?appids=${appID}`);
        if (!response) {
            return 'No response from Steam!';
        }
        return response;
    }

}

module.exports = Steamer;
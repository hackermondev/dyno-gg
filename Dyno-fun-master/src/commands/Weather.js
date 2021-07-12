const { Command } = require('@dyno.gg/dyno-core');
const superagent = require('superagent');

class Weather extends Command {
    constructor(...args) {
        super(...args);

        this.aliases      = ['weather', 'forecast'];
        this.module       = 'Fun';
        this.description  = 'Get the forecast information for a location.';
        this.usage        = 'weather [location]';
        this.example      = 'weather michigan';
        this.cooldown     = 9000;
        this.expectedArgs = 1;
    }

    ftoc(f) {
        return Math.round(((5 / 9) * (f - 32)) * 100) / 100;
    }
    mphtokph(mph) {
        return Math.round(mph * 1.609344);
    }

    async execute({ message, args }) {
        args = args.join(' ');
        try {
            let res = await superagent.get(`https://query.yahooapis.com/v1/public/yql?q=select%20*%20from%20weather.forecast%20where%20woeid%20in%20(select%20woeid%20from%20geo.places(1)%20where%20text%3D%22${args}%22)&format=json&env=store%3A%2F%2Fdatatables.org%2Falltableswithkeys`);
            let result = res.body.query.results.channel;
            let forecast = result.item.forecast;
            let address = result.item.title.split(' at ')[0].split('Conditions for')[1];
            var img;
            switch (result.item.condition.text.toLowerCase()) {
                case 'cloudy':
                    img = 'https://i.imgur.com/zKwo2DO.png';
                    break;
                case 'rainy':
                    img = 'https://i.imgur.com/BXiYtme.png';
                    break;
                case 'sun':
                    img = 'https://i.imgur.com/ZhTAgd0.png';
                    break;
                case 'clear':
                    img = 'https://i.imgur.com/ZhTAgd0.png';
                    break;
                case 'snow':
                    img = 'https://i.imgur.com/RjcWSHq.png';
                    break;
                default:
                    img = 'https://i.imgur.com/zKwo2DO.png';
                    break;
            }
            return this.sendMessage(message.channel, {
                embed: {
                    title: 'Weather for: ' + address,
                    color: 0x337fd5,
                    fields: [
                        {
                            name: 'Wind Speed:',
                            value: `${result.wind.speed} MPH (${this.mphtokph(result.wind.speed)} KPH)`,
                            inline: true,
                        },
                        {
                            name: 'Condition:',
                            value: `${result.item.condition.temp}°F (${this.ftoc(result.item.condition.temp)}°C) - ${result.item.condition.text}`,
                            inline: true,
                        },
                        {
                            name: 'Sunrise/Sunset:',
                            value: `Sunrise: ${result.astronomy.sunrise.toUpperCase()}\nSunset: ${result.astronomy.sunset.toUpperCase()}`,
                            inline: true,
                        },
                        {
                            name: 'Atmosphere:',
                            value: `Humidity: ${result.atmosphere.humidity}%\nPressure: ${result.atmosphere.pressure} in`,
                            inline: true,
                        },
                        {
                            name: 'High/Low Temperatures:',
                            value: `Highest: ${forecast[0].high}°F (${this.ftoc(forecast[0].high)}°C)\nLowest: ${forecast[0].low}°F (${this.ftoc(forecast[0].low)}°C)`,
                            inline: true,
                        },
                        {
                            name: 'Powered by:',
                            value: '[Yahoo!](https://www.yahoo.com/?ilc=401)',
                            inline: true,
                        },
                    ],
                    thumbnail: {
                        url: img,
                    },
                    timestamp: new Date(),
                },
            });
        } catch (err) {
            return this.error(message.channel, 'An error occured: Unable to fetch weather information.');
        }
    }
}

module.exports = Weather;

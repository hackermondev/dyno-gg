import React, { Component } from 'react';
import styles from '../styles.js';
import { Container, List, ListItem, Left, Button, Header, Content, Right, Image, Thumbnail, Body, Icon, Text } from 'native-base';
import { LocalStorage } from '../db';


export class Guilds extends Component {
	constructor() {
		super();
		this.storage = new LocalStorage();
	}

	goToGuild = (guild) => {
		this.props.navigator.push({
			screen: 'dyno.Guild',
			title: guild.name,
			passProps: {
				guild: guild
			}
		});
	}


	render() {

		let guildsData = [
			{ key: "1", name: "Guild 1", id: "1", icon: "https://images-ext-2.discordapp.net/external/R2oCqyq2QU1QaDcD1pEOl6KDJqVU-2yHStbmq_TsnyU/https/discordapp.com/api/guilds/203039963636301824/icons/95daafe34f4e57af0cee7e40bf757513.jpg?width=60&height=60" },
			{ key: "2", name: "Guild 2", id: "2", icon: "https://images-ext-1.discordapp.net/external/cohvs_6nW0e2AC4oP2mRtg4fiPJ-Ws6V8T37_QpRsZk/https/discordapp.com/api/guilds/441602259860586527/icons/dd8f935a55ff5e8aa3a98f0046bbb090.jpg?width=60&height=60" },
			{ key: "3", name: "Guild 3", id: "3", icon: "https://images-ext-1.discordapp.net/external/_MczctPkDsQG1ooSVHnv0rCVGO_l0pkoetXq5gfdygs/https/discordapp.com/api/guilds/279973285507366913/icons/5415d95b6ae55beded7f0bd0358be82a.jpg?width=60&height=60" }
		];

		guildsData = guildsData.map(g => {
			let guild = {
				key: g.key,
				id: g.id,
				name: g.name,
				icon: g.icon
			}
			return guild;
		});
		return (
			<Container style={styles.defaultbackground}>
				<Content>
					<List dataArray={guildsData}
						renderRow={(item) =>
							<ListItem button onPress={() => this.goToGuild(item)}>
								<Left>
									<Thumbnail source={{ uri: item.icon }} />
								</Left>
								<Body>
									<Text style={styles.text}>{item.name}</Text>
								</Body>
								<Right>
									<Icon name="arrow-forward" />
								</Right>
							</ListItem>
						}>
					</List>
				</Content>
			</Container>
		);
	}

	async getGuilds() {
		let guilds = await this.storage.get("guilds");
		return JSON.stringify(guilds);
	}
}

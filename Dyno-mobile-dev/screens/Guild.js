import React, { Component } from 'react';
import { Button, Image } from 'react-native';
import { Text, Content, List, ListItem, Container, Separator, Thumbnail } from 'native-base';
import styles from '../styles.js';

export class Guild extends Component {
	constructor() {
		super();
		this.state = {
			settings: {},
			guild: {}
		}
	}

	componentWillMount() {
		this.updateState();
	}

	async updateState() {
		const { guild } = this.props;

		let guildSettings = 'api calls to mobile-api blah blah blah';
		guildSettings = {
			premium: true,
			prefix: '?',
			nick: 'Dyno',
			modules: [
				{
					name: 'Automod',
					enabled: true
				},
				{
					name: 'Action Log',
					enabled: false
				}
			]
		};

		this.setState({ settings: guildSettings, guild });
	}

	render() {
		return (
			<Container style={styles.mainContainer}>
				<Container style={styles.headerContainer}>
					<Content>
						<Thumbnail source={{ uri: this.state.guild.icon }} />
						<Text style={[styles.text, styles.guildName]}>{this.state.guild.name}</Text>
					</Content>
				</Container>
				<Container>
					<Content>

					</Content>
				</Container>
			</Container>
		);
	}
}


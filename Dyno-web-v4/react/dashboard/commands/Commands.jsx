import React from 'react';
import axios from 'axios';
import CommandGroup from './CommandGroup.jsx';
import { Tab, Tabs, TabList, TabPanel } from 'react-tabs';
import { updateCommandToggle } from './service/CommandService';
import Loader from '../common/Loader.jsx';

export default class Commands extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			commands: [],
			channels: [],
			roles: [],
			prefix: '?',
			isLoading: true,
		};
	}

	componentWillMount() {
		this.getCommands();
	}

	async getCommands(type, id) {
		const basePath = `/api/modules/${this.props.data.guildId}/commands`;
		const url = type ? `${basePath}/${type}/${id}` : basePath;
		try {
			let response = await axios.get(url);

			this.setState({
				commands: response.data.commands || [],
				channels: response.data.channels || [],
				roles: response.data.roles || [],
				prefix: response.data.prefix || '?',
				isLoading: false,
			});
		} catch (e) {
			this.setState({ error: 'Failed to get data, try again later' });
		}
	}

	async toggleCommand(command, checked) {
		if (command.disabled) {
			return;
		}
		updateCommandToggle(command, checked);
	}

	render() {
		if (this.state.isLoading) {
			return <Loader />;
		}

		let commands = this.state.commands;

		return (<div id="commands" className="module-content">
			<h3 className="title is-4">Commands</h3>
			<div className="settings-top">
				<Tabs selectedTabClassName="is-active" selectedTabPanelClassName="is-active">
					<div className='tabs'>
						<TabList className="tabs">
							{commands.map((c, i) => (
								<Tab key={i}><a className="subtab-control">{c.name}</a></Tab>)
							)}
						</TabList>
					</div>
					{commands.map((c, i) => (
						<TabPanel className='flex-containers' key={i}>
							<CommandGroup
								key={'cmd-group-' + c.name}
								group={c}
								onToggle={this.toggleCommand}
								getCommands={this.getCommands.bind(this)} {...this.state} {...this.props} />
						</TabPanel>))
					}
				</Tabs>
			</div>
		</div>
		);
	}
}

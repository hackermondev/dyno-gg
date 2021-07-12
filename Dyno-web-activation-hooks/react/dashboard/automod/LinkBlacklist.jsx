import React from 'react';
import { FilterList } from '../common/FilterList/index.jsx';
import { updateModuleSetting } from '../service/dashboardService.js';

export default class LinkBlacklist extends React.Component {
	state = {
		automod: [],
	}

	componentWillMount() {
		this.setState({ automod: this.props.automod || {} });
	}

	componentWillReceiveProps(props) {
		this.setState({ automod: props.automod || {} });
	}

	createItems = (items) => {
		const automod = this.state.automod;

		automod.blackurls = automod.blackurls || [];

		items = items.filter(i => !automod.blackurls.includes(i.value));
		automod.blackurls = automod.blackurls.concat(items.map(i => i.value));

		updateModuleSetting(this.props.data.module, 'blackurls', automod.blackurls, 'Link Blacklist');

		this.setState({ automod });
	}

	removeItem = (item) => {
		const automod = this.state.automod;

		automod.blackurls = automod.blackurls || [];

		const index = automod.blackurls.findIndex(u => u === item.value);
		if (index === -1) {
			return;
		}

		automod.blackurls.splice(index, 1);

		updateModuleSetting(this.props.data.module, 'blackurls', automod.blackurls, 'Link Blacklist');

		this.setState({ automod });
	}

	render() {
		const { automod } = this.props;
		const items = automod.blackurls || [];
		const initialItems = items.map((u, i) => ({ id: i, value: u }));

		return (<div id='automod-settings'>
			<div className='settings-content'>
				<h3 className='title is-5'>Link Blacklist</h3>
				<p>These will <strong>always</strong> be deleted by the bot if it matches a link and regardless of link settings.</p>
				<FilterList
					removable={true}
					createable={true}
					onCreate={this.createItems}
					onRemove={this.removeItem}
					initialItems={initialItems} />
			</div>
		</div>);
	}
}

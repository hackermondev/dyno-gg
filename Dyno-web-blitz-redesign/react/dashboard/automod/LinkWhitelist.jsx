import React from 'react';
import { FilterList } from '../common/FilterList/index.jsx';
import { updateModuleSetting } from '../service/dashboardService.js';

export default class LinkWhitelists extends React.Component {
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

		automod.whiteurls = automod.whiteurls || [];

		items = items.filter(i => !automod.whiteurls.includes(i.value));
		automod.whiteurls = automod.whiteurls.concat(items.map(i => i.value));

		updateModuleSetting(this.props.data.module, 'whiteurls', automod.whiteurls, 'Link Whitelist');

		this.setState({ automod });
	}

	removeItem = (item) => {
		const automod = this.state.automod;

		automod.whiteurls = automod.whiteurls || [];

		const index = automod.whiteurls.findIndex(u => u === item.value);
		if (index === -1) {
			return;
		}

		automod.whiteurls.splice(index, 1);

		updateModuleSetting(this.props.data.module, 'whiteurls', automod.whiteurls, 'Link Whitelist');

		this.setState({ automod });
	}

	render() {
		const { automod } = this.props;
		const items = automod.whiteurls || [];
		const initialItems = items.map((u, i) => ({ id: i, value: u }));

		return (<div id='automod-settings' className='settings-panel'>
			<div className='settings-content'>
				<h3 className='title is-5'>Link Whitelist</h3>
				<p>These will <strong>never</strong> be deleted by the bot if it matches a link and regardless of link settings.</p>
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

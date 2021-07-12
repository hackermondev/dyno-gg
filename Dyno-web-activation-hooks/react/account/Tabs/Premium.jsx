/* eslint-disable no-invalid-this */
/* global window */
import React from 'react';
import axios from 'axios';
import moment from 'moment-timezone';
import Modal from 'react-responsive-modal';
import RichSelect from '../../dashboard/common/RichSelect.jsx';

export default class Premium extends React.Component {
    constructor() {
        super();
        this.state = {
            addServerModal: {
				open: false,
				disabled: false,
				server: null,
				subscriptionType: null,
			},
			remServerModal: {
				open: false,
				disabled: false,
			},
        };
    }

    addServer = () => {
		if (this.props.isImpersonating) return;
		this.setState({ addServerModal: { open: true } });
	}

	deactivate = async (server) => {
		if (this.props.isImpersonating) return;
		this.setState({ remServerModal: { open: true, server } });
	}

	addServerModalClose = () => {
		this.setState({ addServerModal: { open: false } });
	}

	remServerModalClose = () => {
		this.setState({ remServerModal: { open: false } });
	}

	handleAddServer = (props, selectedOption) => {
		const { addServerModal } = this.state;
		addServerModal.server = selectedOption;
		this.setState({ addServerModal });
	}

	handleSubscription = (props, selectedOption) => {
		const { addServerModal } = this.state;
		addServerModal.subscriptionType = selectedOption;
		this.setState({ addServerModal });
	}

	activateServer = async () => {
		if (this.props.isImpersonating) return;
		this.setState({ addServerModal: { ...this.state.addServerModal, disabled: true } });
		try {
			await axios.post('/account/activate', { serverId: this.state.addServerModal.server.value, subscriptionType: this.state.addServerModal.subscriptionType.value });
			this.setState({ addServerModal: { open: false } });
			this.props.getData();
		} catch (err) {
			console.log(err);
			let error = (err.response ? err.response.data : 'Failed to save, try again later');
			this.setState({ addServerModal: { ...this.state.addServerModal, error, disabled: false } });
		}
	}

	deactivateServer = async () => {
		// if (this.props.isImpersonating) return;
		this.setState({ remServerModal: { ...this.state.remServerModal, disabled: true } });
		try {
			await axios.post('/account/deactivate', { serverId: this.state.remServerModal.server._id });
			this.setState({ remServerModal: { open: false } });
			this.props.getData();
		} catch (err) {
			let error = (err.response ? err.response.data : 'Failed to save, try again later');
			this.setState({ remServerModal: { ...this.state.remServerModal, error, disabled: false } });
		}
	}

	render() {
		let { userData } = this.props;
		if (userData === null) {
			return (<div className={'container'}><p>Please wait...</p></div>);
		}

		let dynoPremiumSubscriptions = userData ? userData.subscriptions.filter(subscription => subscription.planId.startsWith('premium-')) : [];
		let dynoPremiumServers = 0;
		if (dynoPremiumSubscriptions.length) {
			dynoPremiumSubscriptions = dynoPremiumSubscriptions.map(s => s.canCancel = true);
			dynoPremiumServers = dynoPremiumSubscriptions.map(i => i.qty).reduce((a, c) => a + c);
		}

		if (userData && userData.otherSubscriptions) {
			let otherSubscriptions = userData.otherSubscriptions.reduce((a, b) => a += b.qty, 0);
			dynoPremiumSubscriptions = dynoPremiumSubscriptions.concat(userData.otherSubscriptions);
			dynoPremiumServers += otherSubscriptions || 0;
		}

		if (userData && userData.patreonSubscriptions) {
			let patreonSubscriptions = userData.patreonSubscriptions.reduce((a, b) => a += b.qty, 0);
			dynoPremiumSubscriptions = dynoPremiumSubscriptions.concat(userData.patreonSubscriptions);
			dynoPremiumServers += patreonSubscriptions || 0;
		}

		const modalClasses = {
			modal: 'add-server-modal',
		};

		return (
		<div>
			{/* <h3 className={'title is-3'}>My subscriptions</h3> */}
			<div className={'columns'}>
				<div className={'column'}>
					<div className={'subscription premium'}>
						<div className={'subscription-title'}>
							<h5 className={'title is-5'}>Dyno Premium</h5>
							<a className={'button is-info'} href='/upgrade'>Add Subscription</a>
						</div>
						<div className={'active-subscriptions'}>
							<p>You have <strong>{dynoPremiumSubscriptions.length}</strong> Dyno Premium subscription(s), giving you a total of <strong>{dynoPremiumServers > 10000 ? '∞' : dynoPremiumServers}</strong> Dyno Premium server(s).</p>
							{dynoPremiumSubscriptions.map((sub, i) => (<div key={i} className={'active-subscription'}>
								<div className={'subscription-header'}>
									<div className={'title is-5 with-image'}><img className="image is-32x32" src={'https://premium.dyno.gg/images/premium-transparent.png'} /> Dyno {sub.name || sub.planObject.name}</div>
									{!sub.cancelled && sub.canCancel ?
										(<a className={'button is-danger'} onClick={() => { if (window.confirm('Are you sure? This action is irreversible.')) { this.props.cancelSubscription(sub._id); } }}>Cancel Subscription</a>) : ''}
								</div>
								{sub.firstBillingDate && (<p>Subscribed: {moment(sub.firstBillingDate).format('Do MMMM YYYY')}</p>)}
								{sub.cancelled ? (<p>Subscription will expire on {moment(sub.nextBillingDate).format('Do MMMM YYYY')}</p>) : sub.nextBillingDate && (<p>Next charge: {moment(sub.nextBillingDate).format('Do MMMM YYYY')}</p>)}
								{sub.planObject && (<p>Amount: ${sub.planObject.price}</p>)}
							</div>))}
						</div>
						<div className={'subscription-title'}>
							<h5 className={'title is-5'}>Activated Servers</h5>
							<a className={'button is-success'} onClick={this.addServer}>Add Server</a>
						</div>
						<div className={'active-subscriptions'}>
							<p>You have activated <strong>{this.props.subscriptionGuilds.length}</strong> out of <strong>{dynoPremiumServers > 10000 ? '∞' : dynoPremiumServers}</strong> Dyno Premium server(s).</p>
							<p>Once you have activated a server, click the button to add the Premium bot to your server.</p>
							{this.props.subscriptionGuilds.map((i, k) => (<div key={k} className={'active-subscription'}>
								<div className={'subscription-header'}>
									<div className={'title is-5 with-image'}><img className="image is-32x32" src={i.iconURL} /> {i.name}</div>
									<div className={'button-group'}>
										<a className={'button is-info'} href={`https://discordapp.com/oauth2/authorize?client_id=168274214858653696&scope=bot&permissions=2134207671&guild_id=${i._id}`}>Add Premium Bot</a>
										<a className={'button is-danger'} onClick={() => { this.deactivate(i); }}>Deactivate</a>
									</div>
								</div>
								<p>Since: {moment.tz(i.premiumSince, 'UTC').tz(moment.tz.guess()).format('Do MMMM YYYY hh:mmA z')}</p>
							</div>))}
						</div>
						{ this.props.patreonGuilds.length > 0 &&
							<div className={'subscription-title'}>
								<h5 className={'title is-5'}>Patreon Servers</h5>
							</div>
						}
						{ this.props.patreonGuilds.length > 0 &&
							<div className={'active-subscriptions'}>
								<p>These servers were enabled using the old subscription model (Patreon).</p>
								<p>To enable or transfer servers on this list, please contact us on the <strong>#donators</strong> channel at <a href="https://discord.gg/dyno">our support server</a>.</p>
								{this.props.patreonGuilds.map((i, k) => (<div key={k} className={'active-subscription'}>
									<div className={'subscription-header'}>
										<div className={'title is-5 with-image'}><img className="image is-32x32" src={i.iconURL} /> {i.name}</div>
										<div className={'button-group'}>
											<a className={'button is-info'} href={`https://discordapp.com/oauth2/authorize?client_id=168274214858653696&scope=bot&permissions=2134207671&guild_id=${i._id}`}>Add Premium Bot</a>
											<a className={'button is-danger'} onClick={() => { this.deactivate(i); }}>Deactivate</a>
										</div>
									</div>
									<p>Since: {moment.tz(i.premiumSince, 'UTC').tz(moment.tz.guess()).format('Do MMMM YYYY hh:mmA z')}</p>
								</div>))}
							</div>
						}
					</div>
				</div>
			</div>
			<Modal open={this.state.addServerModal.open} classNames={modalClasses} onClose={this.addServerModalClose}>
				<h5 className={'title is-5'}>Activate Dyno Premium on a server</h5>
				{dynoPremiumSubscriptions.length > 0 && (
					<RichSelect
						text='Subscription'
						defaultOption='Select Subscription'
						disabled={this.state.addServerModal.disabled}
						options={dynoPremiumSubscriptions.map((sub, i) => ({ label: sub.name || sub.planObject.name, value: sub.type || 'braintree' }))}
						onChange={this.handleSubscription}
					/>
				)}
				<RichSelect
					text='Server'
					defaultOption='Select server'
					disabled={this.state.addServerModal.disabled}
					options={this.props.guilds}
					onChange={this.handleAddServer}
				/>
				<p>This server will be upgraded to Dyno Premium instantly.</p>
				{this.state.addServerModal.error ? (<p className={'error'}>{this.state.addServerModal.error}</p>) : ''}
				<button className='button is-success' disabled={this.state.addServerModal.disabled && !this.state.addServerModal.error} onClick={this.activateServer}>{this.state.addServerModal.disabled && !this.state.addServerModal.error ? `Processing...` : `Activate`}</button>
			</Modal>
			<Modal open={this.state.remServerModal.open} classNames={modalClasses} onClose={this.remServerModalClose}>
				<h5 className={'title is-5'}>Deactivating Dyno Premium</h5>
				{this.state.remServerModal.server ? (<p>Are you sure you wish to deactivate Dyno Premium for <strong>{this.state.remServerModal.server.name}</strong>?</p>) : ''}
				<p>This server will lose Dyno Premium benefits instantly.</p>
				{this.state.remServerModal.error ? (<p className={'error'}>{this.state.remServerModal.error}</p>) : ''}
				<button className='button is-danger' disabled={this.state.remServerModal.disabled && !this.state.remServerModal.error} onClick={this.deactivateServer}>{this.state.remServerModal.disabled && !this.state.remServerModal.error ? `Processing...` : `Deactivate`}</button>
			</Modal>
		</div>);
	}
}

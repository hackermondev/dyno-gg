/* eslint-disable no-invalid-this */
/* global window */

import React from 'react';
import axios from 'axios';
import braintree from 'braintree-web-drop-in';
/* eslint-disable no-unused-vars */
import Modal from 'react-responsive-modal';
import BraintreeDropin from 'braintree-dropin-react';
import Help from '../../dashboard/common/Help.jsx';
/* eslint-enable no-unused-vars */

export default class Premium extends React.Component {
	constructor(props) {
		super(props);
		this.state = {
			fetching: false,
			plans: null,
			error: '',
			modalOpen: false,
			customerToken: '',
			plan: null,
			processingPayment: false,
			paymentError: null,
		};
	}

	async componentDidMount() {
		this.setState({ fetching: true });
		try {
			let request = await axios.get('/upgrade/plans');
			this.setState({ plans: request.data.plans });
		} catch (e) {
			this.setState({ error: 'Failed to load plans, try again later.' });
		}
		this.setState({ fetching: false });
	}

	async subscribe(plan) {
		let tokenRequest = await axios.post('/upgrade/token');
		this.setState({ token: tokenRequest.data.token, plan, modalOpen: true });
	}

	closeModal = () => {
		if (this.state.processingPayment) return;
		this.setState({ token: '', plan: null, modalOpen: false });
	}

	handlePaymentMethod = async (payload) => {
		this.setState({ processingPayment: true });
		const { plan } = this.state;

		const planId = plan.id;

		this.setState({ paymentError: null });

		try {
			let result = await axios.post('/upgrade/process', {
				paymentMethodNonce: payload.nonce,
				planId: planId,
			});

			if (result.data && result.data.success) {
				this.setState({ processingPayment: false });
				this.closeModal();
				window.location.href = '/account/premium';
			}
		} catch (err) {
			this.setState({ paymentError: { ...err.response.data, retry: false } });
			setTimeout(() => {
				this.setState({ paymentError: { ...this.state.paymentError, retry: true }, processingPayment: false });
			}, 5000);
		}
	}

	renderSubmitButton = ({ onClick, isDisabled, text }) => {
		if (this.state.processingPayment) {
			text = 'Processing payment...';
		}
		if (this.state.paymentError !== null && this.state.paymentError.retry === false) {
			text = 'Error processing payment!';
		}
		return (
			<button className={`button is-${this.state.paymentError !== null && this.state.paymentError.retry === false ? 'danger' : 'info'}`} onClick={onClick} disabled={isDisabled || (this.state.paymentError !== null && this.state.paymentError.retry === false) || this.state.processingPayment}>
				{text}
			</button>
		);
	}

	render() {
		if (this.state.fetching || this.state.plans === null) {
			return (<div className={'container'}><p>Please wait...</p></div>);
		}

		if (this.state.error !== '') {
			return (<div className={'container'}><p>{this.state.error}</p></div>);
		}

		const paypal = {
			flow: 'vault',
		};

		const modalClasses = {
			modal: 'upgrade-modal',
		};

		const dropinOptions = {
			vaultManager: true,
		};

		const basicPlan = this.state.plans.premiumPlans[0];
		const plusPlan = this.state.plans.premiumPlans[1];
		const proPlan = this.state.plans.premiumPlans[2];

		return (
			<div className="upgrade-container">
				<div className="feature-tile-wrapper">
					<div className="feature-tile feature-tile-image">
						<img alt="Green outline of a handshake icon" src="https://s.dyno.gg/web-assets/upgrade/support.png" />
					</div>
					<div className="feature-tile is-size-6 has-text-grey">
						<h1 className="has-text-white">Priority Support</h1>
						Our staff is always ready to help you with any matters. From setting up the bot, to figuring out how to use it, we've got you covered.
							</div>
				</div>
				<div className="feature-tile-wrapper">
					<div className="feature-tile feature-tile-image">
					<img alt="Green outline of a icon representing an image" src="https://s.dyno.gg/web-assets/upgrade/embed-editor.png" />
					</div>
					<div className="feature-tile is-size-6 has-text-grey">
						<h1 className="has-text-white">Embed editor</h1>
						Use our intuitive, feature rich embed editor to post delicate looking messages that can be used as announcements, rules, or whatever you like! Edit the embeds and send them directly from the dashboard.
						</div>
				</div>
				<div className="feature-tile-wrapper">
					<div className="feature-tile feature-tile-image">
					<img alt="Green outline of a microphone icon" src="https://s.dyno.gg/web-assets/upgrade/voice-recorder.png" />
					</div>
					<div className="feature-tile is-size-6 has-text-grey">
						<h1 className="has-text-white">Voice Text Linking</h1>
						Create channels that can only be seen when a member is in voice chat. Dyno will automatically reveal the channel once they join voice, and will remove it once they leave it.
						</div>
				</div>
				<div className="feature-tile-wrapper">
					<div className="feature-tile feature-tile-image">
						<img alt="Green outline of an eraser icon" src="https://s.dyno.gg/web-assets/upgrade/eraser.png" />
					</div>
					<div className="feature-tile is-size-6 has-text-grey">
						<h1 className="has-text-white">Auto purge</h1>
						Keep your channels clean by automatically purging them every once in a while. Configure once and Dyno will do the rest.
						</div>
				</div>
				<div className="feature-tile-wrapper">
					<div className="feature-tile feature-tile-image">
						<img alt="Green outline of a music note" src="https://s.dyno.gg/web-assets/upgrade/music.png" />
					</div>
					<div className="feature-tile is-size-6 has-text-grey">
						<h1 className="has-text-white">Premium music</h1>
						Enjoy your tunes with volume control, exclusive premium voice nodes with guaranteed uptime and no song length limits!
						</div>
				</div>
				<div className="feature-tile-wrapper">
					<div className="feature-tile feature-tile-image">
						<img alt="Green outline of a gift icon with a star in the center" src="https://s.dyno.gg/web-assets/upgrade/more.png" />
					</div>
					<div className="feature-tile is-size-6 has-text-grey">
						<h1 className="has-text-white">And more!</h1>
						Premium users have all feature limits lifted, near perfect uptime, faster response times, better server specs, slow-mode, 2 minutes restarts and faster updates! You also get an exclusive role on the Dyno server to show off your awesomeness & be granted access to an exclusive channel!
						</div>
				</div>
				<div className="plans-container">
					<div className="plans-title">Premium Plans</div>
					<div className="plan-tile">
						<div className="plan-name">Basic</div>
						<div className="plan-description">Premium for {basicPlan.qty} server{basicPlan.qty > 1 ? 's' : ''}</div>
						<div className="plan-price has-text-primary is-size-6"><span className="is-size-1">${basicPlan.price}</span> / month</div>
						<div className="plan-price small">${(basicPlan.price / basicPlan.qty).toFixed(2)} / server</div>
						<a onClick={() => this.subscribe(basicPlan)} className={'button is-info'}>Subscribe Now</a>
					</div>
					<div className="plan-tile popular">
						<div className="plan-popular">Popular</div>
						<div className="plan-name">Plus</div>
						<div className="plan-description">Premium for {plusPlan.qty} server{plusPlan.qty > 1 ? 's' : ''}</div>
						<div className="plan-price has-text-primary is-size-6"><span className="is-size-1">${plusPlan.price}</span> / month</div>
						<div className="plan-price small">${(plusPlan.price / plusPlan.qty).toFixed(2)} / server</div>
						<a onClick={() => this.subscribe(plusPlan)} className={'button is-info'}>Subscribe Now</a>
					</div>
					<div className="plan-tile">
						<div className="plan-name">Pro</div>
						<div className="plan-description">Premium for {proPlan.qty} server{proPlan.qty > 1 ? 's' : ''}</div>
						<div className="plan-price has-text-primary is-size-6"><span className="is-size-1">${proPlan.price}</span> / month</div>
						<div className="plan-price small">${(proPlan.price / proPlan.qty).toFixed(2)} / server</div>
						<a onClick={() => this.subscribe(proPlan)} className={'button is-info'}>Subscribe Now</a>
					</div>
				</div>
				<Modal open={this.state.modalOpen} classNames={modalClasses} little={true} onClose={this.closeModal}>
					<h4 className={'title is-4'}>Payment</h4>
					{this.state.paymentError !== null && this.state.paymentError.processorResponse !== undefined ? (
						<div className={'payment-error'}>
							<p>Payment failed! &mdash; {this.state.paymentError.error}</p>
							<p>Code {this.state.paymentError.processorResponse.code} - {this.state.paymentError.processorResponse.text}</p>
							{this.state.paymentError.processorResponse.additional !== '' ? (<p>{this.state.paymentError.processorResponse.additional}</p>) : ''}
							<p>Transaction ID: {this.state.paymentError.transaction}</p>
							<p>You have not been charged.</p>
						</div>
					) : ''}
					{this.state.paymentError !== null && this.state.paymentError.processorResponse === undefined ? (
						<div className={'payment-error'}>
							<p>Payment failed!</p>
							<p>{this.state.paymentError.error}</p>
							<p>You have not been charged.</p>
						</div>
					) : ''}
					<div>
						{this.state.plan ? (<p>Purchasing {this.state.plan.name} at a monthly recurring cost of USD$ {this.state.plan.price}</p>) : ''}
					</div>
					<BraintreeDropin
						braintree={braintree}
						authorizationToken={this.state.token}
						paypal={paypal}
						handlePaymentMethod={this.handlePaymentMethod}
						options={dropinOptions}
						onCreate={this.onCreate}
						onDestroyStart={this.onDestroyStart}
						onDestroyEnd={this.onDestroyEnd}
						onError={this.onError}
						renderSubmitButton={this.renderSubmitButton} />
				</Modal>
			</div>);
	}
}

import React from 'react';
import axios from 'axios';
import Modal from 'react-responsive-modal';
import braintree from 'braintree-web-drop-in';
import BraintreeDropin from 'braintree-dropin-react';
import Help from '../dashboard/common/Help.jsx';


export default class Upgrade extends React.Component {
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

    console.log('payload', payload);

    this.setState({ paymentError: null });

    try {
      let result = await axios.post('/upgrade/process', {
        paymentMethodNonce: payload.nonce,
        planId: planId,
      });

      if (result.data && result.data.success) {
        this.setState({ processingPayment: false });
        this.closeModal();
        window.location.href = '/account';
      }
    } catch (err) {
      this.setState({ paymentError: { ...err.response.data, retry: false } });
      setTimeout(_ => {
        this.setState({ paymentError: { ...this.state.paymentError, retry: true }, processingPayment: false })
      }, 5000);
    }
  }

  renderSubmitButton = ({ onClick, isDisabled, text }) => {
    if (this.state.processingPayment) {
      text = 'Processing payment...';
    }
    if (this.state.paymentError !== null && this.state.paymentError.retry === false) {
      text = 'Error processing payment!'
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

    return (<div className="upgrade-container">
      <div className="feature-tile-wrapper">
        <div className="feature-tile feature-tile-image">
          <i class="fas fa-headset fa-6x"></i>
        </div>
        <div className="feature-tile">
          <h1>Priority Support</h1>
          Our staff is always ready to help you with any matters. From setting up the bot, to figuring out how to use it, we've got you covered.
            </div>
      </div>
      <div className="feature-tile-wrapper">
        <div className="feature-tile feature-tile-image">
          <i class="fas fa-edit fa-6x"></i>
        </div>
        <div className="feature-tile">
          <h1>Embed editor</h1>
          Use our intuitive, feature rich embed editor to post delicate looking messages that can be used as announcements, rules, or whatever you like! Edit the embeds and send them directly from the dashboard.
          </div>
      </div>
      <div className="feature-tile-wrapper">
        <div className="feature-tile feature-tile-image" style={{ flexDirection: 'row' }}>
          <i class="fas fa-microphone-alt fa-6x"></i>  <i class="fas fa-link fa-3x"></i>  <i class="fas fa-hashtag fa-6x"></i>
        </div>
        <div className="feature-tile">
          <h1>Voice Text Linking</h1>
          Create channels that can only be seen when a member is in voice chat. Dyno will automatically reveal the channel once they join voice, and will remove it once they leave it.
          </div>
      </div>
      <div className="feature-tile-wrapper">
        <div className="feature-tile feature-tile-image" style={{ flexDirection: 'row' }}>
          <i class="fas fa-eraser fa-6x"></i>
        </div>
        <div className="feature-tile">
          <h1>Auto purge</h1>
          Keep your channels clean by automatically purging them every once in a while. Configure once and Dyno will do the rest.
          </div>
      </div>
      <div className="feature-tile-wrapper">
        <div className="feature-tile feature-tile-image" style={{ flexDirection: 'row' }}>
          <i class="fas fa-hourglass-start fa-6x"></i>
        </div>
        <div className="feature-tile">
          <h1>Slow mode</h1>
          Busy chat? Dyno can limit the number of messages your users can send on an interval. Fully customizable with per-channel rules, user slowmode and channel slowmode!
          </div>
      </div>
      <div className="feature-tile-wrapper">
        <div className="feature-tile feature-tile-image" style={{ flexDirection: 'row' }}>
          <i class="fas fa-music fa-6x"></i>
        </div>
        <div className="feature-tile">
          <h1>Premium music</h1>
          Enjoy your tunes with volume control, exclusive premium voice nodes with guaranteed uptime and no song length limits!
          </div>
      </div>
      <div className="feature-tile-wrapper big">
        <div className="feature-tile feature-tile-image" style={{ flexDirection: 'row' }}>
          <i class="fas fa-plus fa-6x"></i>
        </div>
        <div className="feature-tile">
          <h1>And more!</h1>
          Premium users have all feature limits lifted, near perfect uptime, faster response times, better server specs, 2 minute restarts and faster updates! You also get an exclusive role on the Dyno server to show off your awesomeness & be granted access to an exclusive channel!
          </div>
      </div>
      <div className="plans-container">
        <div className="plans-title">Premium Plans</div>
        {this.state.plans.premiumPlans.map((plan, i) => (
        <div className="plan-tile" key={i}>
          <div className="plan-name">{plan.name}</div>
          <div className="plan-description">Premium for {plan.qty} server{plan.qty > 1 ? 's' : ''}</div>
          <div className="plan-price">${plan.price} / month</div>
          <div className="plan-price small">${(plan.price / plan.qty).toFixed(2)} / server</div>
          <a onClick={_ => this.subscribe(plan)} className={'button is-info'}>Subscribe Now</a>
        </div>
        ))}
        {/* <table className="table">
          <thead className="upgrade-features-table-head">
            <tr>
              <th></th>
              {this.state.plans.premiumPlans.map(plan => (<th>{plan.name}</th>))}
            </tr>
          </thead>
          <tbody className="upgrade-features-table-body">
            <tr>
              <th>Number of Servers</th>
              {this.state.plans.premiumPlans.map(plan => (<td>{plan.qty}</td>))}
            </tr>
            <tr className="upgrade-features-table-price">
              <th>Price</th>
              {this.state.plans.premiumPlans.map(plan => (
                <td>
                  ${(plan.price / plan.qty).toFixed(2)} / server
                        <div className="small-price">${plan.price} / month</div>
                </td>
              ))}
            </tr>
            <tr>
              <th></th>
              {this.state.plans.premiumPlans.map(plan => (<td><a onClick={_ => this.subscribe(plan)} className={'button is-info'}>Subscribe now</a></td>))}
            </tr>
          </tbody>
        </table> */}
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
          onCreate={this.onCreate}
          onDestroyStart={this.onDestroyStart}
          onDestroyEnd={this.onDestroyEnd}
          onError={this.onError}
          renderSubmitButton={this.renderSubmitButton} />
      </Modal>
    </div>);
  }
}

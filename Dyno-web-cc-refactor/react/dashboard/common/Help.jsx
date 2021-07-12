import React from 'react';
import Modal from 'react-responsive-modal';

export default class Help extends React.Component {
	state = {
		modalOpen: false,
	};

	openHelp = () => {
		this.setState({ modalOpen: true });
	}

	closeHelp = () => {
		this.setState({ modalOpen: false });
	}

    render() {
		const modalClasses = {
            modal: 'help-modal',
		};

        return (
            <span className='help-icon'>
                <a onClick={this.openHelp}>
					<span className='icon is-help'>
						<i className={`fa fa-${this.props.icon ? this.props.icon : 'question-circle'}`}></i>
					</span>
				</a>
				<Modal open={this.state.modalOpen} classNames={modalClasses} little={true} onClose={this.closeHelp}>
					{this.props.text ?
						(<div className='help-content'><p>{this.props.text}</p></div>) :
						(<div className='help-content' dangerouslySetInnerHTML={{ __html: this.props.html }}></div>)}
				</Modal>
            </span>
        );
    }
}

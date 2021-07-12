import React from 'react';

export default class RichSaveButton extends React.Component {
    state = {
        isSaving: false,
		justSaved: false,
    }

    async handleSave(e) {
        this.setState({ isSaving: true });
        const result = await this.props.onClick(e);
        this.setState({ isSaving: false, justSaved: true });

        if (result && (result === true || result.saveButtonSuccess === true)) {
            setTimeout(() => {
                this.setState({ justSaved: false });
            }, 3000);
        } else {
            this.setState({ justSaved: false });
        }
    }

    render() {
        let saveButton;
        const style = { minWidth: '60px', marginRight: '0.5em' };
        const styleSucess = { minWidth: '60px', marginRight: '0.5em', fontFamily: '"Font Awesome 5 Regular"' };

		if (!this.state.justSaved) {
			saveButton = (
				<button className={`button is-info ${this.props.additionalClasses || ''}`} style={style} onClick={this.handleSave.bind(this)}>
					Save
				</button>);
		} else {
			saveButton = (
				<button className={`button is-success ${this.props.additionalClasses || ''}`} style={styleSucess} onClick={this.handleSave.bind(this)}>
					{/* fa-check glyph */}
					
				</button>);
		}

		if (this.state.isSaving) {
			saveButton = (
				<button className={`button is-info is-loading ${this.props.additionalClasses || ''}`} style={style} onClick={this.handleSave.bind(this)}>
				</button>);
		}
        return saveButton;
    }
}

import React from 'react';
import axios from 'axios';

export default class EditTag extends React.Component {
    state = {
        name: '',
        value: '',
        contentChars: 0,
        contentLimit: false,
        nameChars: 0,
    };

    constructor() {
        super();

        this.saveAndClose = this.saveAndClose.bind(this);
    }

    componentDidMount() {
        this.setState({
            name: this.props.name,
            value: this.props.value,
            contentChars: this.props.value.length,
            nameChars: this.props.name.length,
        });
    }

    componentWillReceiveProps(nextProps) {
        this.setState({
            name: nextProps.name,
            value: nextProps.value
        });
    }

    saveAndClose() {
        const url = `/api/server/${this.props.serverid}/tags/edit`;
        const data = { tag: this.state.name, content: this.textarea.value };
        if (this.textarea.value.length > 2000) return _showError('Response cannot be over 2000 characters.');
        
        axios.post(url, data)
        .then((res) => {
            if (res.status === 200) {
                const item = this.props.tagList.get('tag-name', this.state.name)[0];
                const values = item.values();
                values['tag-content'] = data.content;
                item.values(values);
                _showSuccess('Tag edited.');

                this.props.onClose(data.tag, data.content);
            } else {
                _showError('An error occurred.');
            }
        })
        .catch((err) => {
            if (err) {
                _showError('An error occurred.');
            }
        });
    }
    
    handleChange(event) {
        var input = event.target.value;
        this.setState({
            contentChars: input.length
        });
        if (input.length >= 2000) {
            this.setState({
                contentLimit: true
            });
        }
        else {
            this.setState({
                contentLimit: false
            })
        }
    }

    render() {
        const charClass = this.state.contentLimit ? "over2k" : "";
        const nameClass = this.state.nameChars >= 72 ? "over2k" : "";
        return (
            <div className="edit-tag-modal">
                <div className="modal-background"></div>
                <div className="modal-content">
                    <label className="label">Tag - <span className={nameClass}>{this.state.nameChars}</span> Character{this.state.nameChars == 1 ? '' : 's'}</label>
                    <p className="control has-addons">
                        <label className="label">{this.props.prefix}</label>
                        <input className="input" name="tag" type="text" disabled="disabled" defaultValue={this.props.name} pattern="[a-zA-Z0-9\-\_\+]" title="Tag name should start with an alpha character and only contain alphanumeric characters and -_+" maxLength="72" />
                    </p>
                    <p className="control">
                        <label className="label">Content - <span className={charClass}>{this.state.contentChars}</span> Character{this.state.contentChars == 1 ? '' : 's'}</label>
                        <textarea className="input" onChange={this.handleChange.bind(this)} defaultValue={this.props.value} ref={(textarea) => this.textarea = textarea} name="content"></textarea>
                    </p>
                    <p className="control">
                        <a className="button is-info tag-save" onClick={() => this.saveAndClose()}>Save</a>
                    </p>
                    <p className="help-text"> <br />
                    </p>
                </div>
                <button className="modal-close edit-tag-modal is-large" aria-label="close" onClick={() => this.props.onClose()}></button>
            </div>
        );
    }
}

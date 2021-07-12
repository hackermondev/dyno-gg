import React from 'react';
import axios from 'axios';
import Loader from '../../common/Loader.jsx';
import Modal from 'react-responsive-modal';
import EditTag from './EditTag.jsx';

export default class TagList extends React.Component {
    // If we keep this in state we need to redraw the table each time we edit a command
    // which causes the current page to be lost and the table to be reset
    tags = [];
    state = {
        isLoading: true,
        modalInfo: {
            open: false,
        }
    }

    constructor() {
        super();

        this.openModal = this.openModal.bind(this);
        this.closeModal = this.closeModal.bind(this);
    }

    async componentWillMount() {
        try {
            let response = await axios.get(`/api/modules/${this.props.match.params.id}/tags/list`);
            this.tags = response.data.tags || [],
                this.setState({
                    prefix: response.data.prefix || '?',
                    isLoading: false,
                });
        } catch (e) {
            this.setState({ error: 'Failed to get data, try again later' });
        }
    }

    componentDidUpdate() {
        if (this.tagList) {
            return;
        }
        this.tagList = new List('tagList', {
            page: 10,
            pagination: {
                innerWindow: 1,
                outerWindow: 1,
                left: 0,
                right: 0,
                paginationClass: 'pagination-list',
            },
            valueNames: ['tag-name', 'tag-author', 'tag-content'],
        });
    }

    openModal(tag) {
        const info = {
            open: true,
            name: tag.tag,
            value: tag.content,
        };

        this.setState({ modalInfo: info });
    }

    closeModal(tagName, newContent) {
        this.setState({ modalInfo: { open: false, name: '', value: '' } });
        if (tagName && newContent) {
            this.tags.find((value) => {
                if (value.tag === tagName) {
                    value.content = newContent;
                }
            });
        }
    }

    deleteTag(tag) {
        const url = `/api/server/${this.props.match.params.id}/tags/delete`;
        const data = { tag: tag._id, name: tag.tag };

        axios.post(url, data)
            .then((res) => {
                if (res.status === 200) {
                    this.tagList.remove('tag-name', tag.tag);
                    _showSuccess('Tag removed.');
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

    render() {
        if (this.state.isLoading) {
            return <Loader />;
        }

        return (
            <div id="tags-list">
                <Modal open={this.state.modalInfo.open} onClose={this.closeModal}>
                    <EditTag
                        prefix={this.state.prefix}
                        name={this.state.modalInfo.name}
                        value={this.state.modalInfo.value}
                        serverid={this.props.match.params.id}
                        tagList={this.tagList}
                        onClose={this.closeModal}
                    />
                </Modal>
                <div className="settings-content">
                    {this.tags.length > 0 ?
                        <div id="tagList">
                            <p className="control">
                                <input className="input search" placeholder="Search" type="text" title="Search" />
                            </p>
                            <table className="table is-striped">
                                <thead>
                                    <tr>
                                        <th>Name</th>
                                        <th>Author</th>
                                        <th>Content</th>
                                        <th></th>
                                    </tr>
                                </thead>
                                <tbody className="list">
                                    {this.tags.map((tag, index) => (
                                        <tr key={index}>
                                            <td className="tag-name">{tag.tag}</td>
                                            <td className="tag-author">{tag.author.username}#{tag.author.discriminator}</td>
                                            <td className="command-response">
                                                <code className="tag-content">{tag.content}</code>
                                            </td>
                                            <td>
                                                <a className="button is-info tag-edit" onClick={() => this.openModal(tag)}>Edit</a>
                                                <a className="button is-danger remove-tag" onClick={() => this.deleteTag(tag)}>Remove</a>
                                            </td>
                                        </tr>
                                    ))}
                                </tbody>
                            </table>
                            <nav className="pagination" role="navigation" aria-label="pagination">
                                <ul className="pagination-list"></ul>
                            </nav>
                        </div>
                    : (<p>There are no tags to display.</p>)}
                </div>
            </div>
        );
    }
}

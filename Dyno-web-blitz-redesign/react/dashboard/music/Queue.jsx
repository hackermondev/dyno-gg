import React from 'react';
import axios from 'axios';
import Loader from '../common/Loader.jsx';

export default class Queue extends React.Component {
    constructor() {
        super();
        this.state = {
            queue: [],
            isLoading: true,
        };

        this.deleteQueueItem = this.deleteQueueItem.bind(this);
    }
    async componentWillMount() {
        try {
            let response = await axios.get(`/api/modules/${this.props.match.params.id}/music-queue`);
            this.setState({
                queue: response.data,
                isLoading: false,
            });
        } catch (e) {
            this.setState({ error: 'Failed to get data, try again later' });
        }
    }

    componentDidUpdate() {
        this.queueList = new List('queueList', {
            page: 10,
            pagination: {
                innerWindow: 1,
                outerWindow: 1,
                left: 0,
                right: 0,
                paginationClass: 'pagination-list',
            },
            valueNames: ['queue-index', 'queue-title'],
        });
    }

    deleteQueueItem(e, item, index) {
        e.preventDefault();

        const url = `/api/server/${this.props.match.params.id}/playlist/delete`;
        const data = { objectId: item._id };

        axios.post(url, data)
            .then((res) => {
                if (res.status === 200) {
                    this.queueList.remove('queue-index', index);
                    _showSuccess('Song removed from queue.');
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
            <div id="music-queue">
                {this.state.queue.length > 0 &&
                    <div id="queueList">
                        <p className="control has-icons-right">
                            <input className="input search" placeholder="Search" type="text" title="Search" />
                            <span className="icon is-small is-right">
                                <i className="fal fa-search"></i>
                            </span>
                        </p>
                        <table className="table is-striped">
                            <thead>
                                <tr>
                                    <th>Track #</th>
                                    <th>Title</th>
                                    {/* <th></th> */}
                                </tr>
                            </thead>
                            <tbody className="list">
                                {this.state.queue.map((item, index) => {
                                    let thumbnail = '';
                                    const uri = item.uri || item.url;
                                    const identifier = item.identifier || item.video_id;
                                    if (uri.includes('soundcloud.com')) {
                                        thumbnail = ``;
                                    } else {
                                        thumbnail = `http://img.youtube.com/vi/${identifier}/default.jpg`;
                                    }
                                    return (
                                        <tr key={index}>
                                            <td className="queue-index">{('0' + (index + 1)).slice(-2)}</td>
                                            <td className="queue-title">
                                                <div className="queue-item">
                                                    <img className="music-thumb" src={thumbnail}/>
                                                    <a href={uri} target="_blank">{item.title}</a>
                                                </div>
                                            </td>
                                            {/* <td>
                                                <a className="button is-danger playlist-remove" href="#" onClick={(e) => { this.deleteQueueItem(e, item, index); }}>Remove</a>
                                            </td> */}
                                        </tr>
                                    );
                                })}

                            </tbody>
                        </table>
                        <nav className="pagination" role="navigation" aria-label="pagination">
                            <ul className="pagination-list"></ul>
                        </nav>
                    </div>}
                {this.state.queue.length === 0 &&
                    <p>There are no songs in queue.</p>
                }
            </div>
        );
    }
}

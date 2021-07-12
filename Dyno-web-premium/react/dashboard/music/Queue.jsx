import React from 'react';
import axios from 'axios';
import Loader from '../common/Loader.jsx';
import PaginatedTable from '../common/PaginatedTable.jsx';

export default class Queue extends React.Component {
    constructor() {
        super();
        this.state = {
            queue: [],
            isLoading: true,
        };

        this.deleteQueueItem = this.deleteQueueItem.bind(this);
    }
    async UNSAFE_componentWillMount() {
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
        // this.queueList = new List('queueList', {
        //     page: 10,
        //     pagination: {
        //         innerWindow: 1,
        //         outerWindow: 1,
        //         left: 0,
        //         right: 0,
        //         paginationClass: 'pagination-list',
        //     },
        //     valueNames: ['queue-index', 'queue-title'],
        // });
    }

    deleteQueueItem(e, item, index) {
        e.preventDefault();

        const url = `/api/server/${this.props.match.params.id}/playlist/delete`;
        const data = { objectId: item._id };

        axios.post(url, data)
            .then((res) => {
                if (res.status === 200) {
                    // this.queueList.remove('queue-index', index);
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

        const data = {
			headers: [
				'Track #',
				'Title',
            ],
            valueAccessor: (node, columnIndex) => {
                if (columnIndex !== 1) {
                    return false;
                }

                if (node.props && node.props.children) {
                    return node.props.children[1].props.children;
                }

                return false;
            },
            searchableColumnsIds: [0, 1],
			rows: this.state.queue.map((item, index) => {
                let thumbnail = '';
                const uri = item.uri || item.url;
                const identifier = item.identifier || item.video_id;
                if (uri.includes('soundcloud.com')) {
                    thumbnail = ``;
                } else {
                    thumbnail = `http://img.youtube.com/vi/${identifier}/default.jpg`;
                }

                return {
                    fields: [
                        {
                            value: ('0' + (index + 1)).slice(-2),
                            className: 'queue-index',
                        },
                        {
                            value: (
                                <div className="queue-item">
                                    <img className="music-thumb" src={thumbnail} alt="Video thumbnail"/>
                                    <a href={uri} target="_blank">{item.title}</a>
                                </div>
                            ),
                            className: 'queue-title',
                        },
                    ],
                };
            }),
		};

        return (
            <div id="music-queue">
                <PaginatedTable data={data} pageLimit={10} search />
                {this.state.queue.length === 0 &&
                    <p>There are no songs in queue.</p>
                }
            </div>
        );
    }
}

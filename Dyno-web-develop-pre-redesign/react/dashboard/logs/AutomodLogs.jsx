import React from 'react';
import axios from 'axios';
import ReactTable from 'react-table';

export default class AutomodLogs extends React.Component {
    constructor(props) {
        super(props);
        this.state = {
            data: [],
            pages: -1,
            pageSize: 10,
            loading: true,
        };
    }

    async onFetchData(state, instance) {
        try {
            // show the loading overlay
            this.setState({ loading: true });
            // fetch your data
            const res = await axios.post('/api/modules/' + server + '/automodlogs', {
                page: state.page,
                pageSize: state.pageSize,
            });

            this.setState({
                data: res.data.logs,
                pages: res.data.pageCount,
                loading: false,
            });
        } catch (e) {
            this.setState({ error: 'Failed to get data, try again later' });
        }
    }

    render() {
        const columns = [
            {
                Header: 'Time',
                id: 'createdAt',
				accessor: 'createdAt',
				maxWidth: 250,
			},
            {
                Header: 'User ID',
                id: 'userId',
				accessor: d => d.user.id,
				maxWidth: 250,
            },
            {
                Header: 'Username',
                id: 'username',
                accessor: d => `${d.user.username}#${d.user.discriminator}`,
                maxWidth: 250,
            },
            {
				Header: 'Reason',
				id: 'reason',
				accessor: 'reason',
				maxWidth: 250,
			},
            {
                Header: 'Message',
                id: 'message',
                accessor: d => d.message.content,
                maxWidth: 500,
            },
        ];
        return (<div id='automodlogs'>
            <h3 className='title is-4'>Automod Logs</h3>
            <ReactTable
                noDataText={'No logs found'}
                className='-striped'
                columns={columns}
                sortable={false}
                data={this.state.data}
                pages={this.state.pages}
                loading={this.state.loading}
                manual
                onFetchData={this.onFetchData.bind(this)}
            />
        </div>);
    }
}

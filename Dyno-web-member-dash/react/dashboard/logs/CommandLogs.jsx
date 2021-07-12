import React from 'react';
import axios from 'axios';
import ReactTable from 'react-table';

export default class CommandLogs extends React.Component {
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
            const res = await axios.post('/api/modules/' + server + '/commandlogs', {
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
                Header: 'User',
                id: 'user',
                accessor: d => `${d.user.name || d.user.username}#${d.user.discrim || d.user.discriminator}`,
                maxWidth: 300,
            },
			{
				Header: 'Command',
				id: 'command',
                accessor: 'command',
                maxWidth: 100,
			},
            {
                Header: 'Full Command',
                id: 'message',
                accessor: 'message',
			},
        ];
        return (<div id='commandlogs'>
            <h3 className='title is-4'>Command Logs</h3>
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

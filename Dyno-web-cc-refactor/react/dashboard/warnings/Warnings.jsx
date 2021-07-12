import React from 'react';
import axios from 'axios';
import ReactTable from 'react-table';
import ModuleSettings from '../common/ModuleSettings.jsx';

export default class Warnings extends ModuleSettings {
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
            const res = await axios.post('/api/modules/' + server + '/warnings', {
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
                maxWidth: 200,
            },
			{
                Header: 'User',
                id: 'user',
                accessor: d => `${d.user.username}#${d.user.discriminator}`,
            },
			{
				Header: 'Moderator',
				id: 'moderator',
				accessor: d => {
					if (!d.mod) {
						return `Dyno`;
					}
					return `${d.mod.username}${d.mod.discriminator ? `#${d.mod.discriminator}` : ''}`;
				},
			},
            {
                Header: 'Reason',
                id: 'reason',
                accessor: 'reason',
            },
        ];
        return (<div id='warnings' className='module-content'>
            <h3 className='title is-4'>Warnings</h3>
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

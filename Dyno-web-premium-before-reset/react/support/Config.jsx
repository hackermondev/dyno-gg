import React from 'react';
import axios from 'axios';
import Loader from '../dashboard/common/Loader.jsx';
import ReactJson from 'react-json-view';

export default class Config extends React.Component {
    state = {
        config: false,
    }

    async componentDidMount() {
        console.log('componentDidMount');
        try {
            let uniqueId = '';
            const regexMatch = window.location.href.match(/.*support\/c\/([0-9a-zA-Z\-]+)/);
            if (regexMatch) {
                uniqueId = regexMatch[1];
            }
            console.log(uniqueId);
            
            let response = await axios.get(`/api/support/c/${uniqueId}`);
            const { config } = response.data;

            if (!config) {
                return this.setState({ error: 'Failed to fetch config.' });
            }

            this.setState({ config });
        } catch (err) {
            this.setState({ error: 'Failed to fetch config.' });
        }
    }

    render() {
        if (!this.state.config) {
			return <Loader />;
        }
        
        return (
            <div className='container'>
                <ReactJson
                    src={this.state.config}
                    name={this.state.config._id}
                    theme='hopscotch'
                    iconStyle='square'
                    indentWidth={4}
                    collapseStringsAfterLength={80}
                    displayObjectSize={true}
                    displayDataTypes={false}
                    collapsed={1} />
            </div>
        )
    }
}

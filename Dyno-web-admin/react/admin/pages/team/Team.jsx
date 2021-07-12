import axios from 'axios';
import react from 'react';
import TeamMember from './TeamMember.jsx';

export default class Team extends react.Component {
    constructor(props) {
		super(props);
		this.state = {
			contributors: [],
			isLoading: true,
		};
	}

	async componentWillMount() {
		try {
			let response = await axios.get(`/api/dhq/team`);

			this.setState({
				contributors: response.data.contributors,
				isLoading: false,
			});
		} catch (e) {
			this.setState({ error: 'Failed to get data, try again later' });
		}
    }

    render() {
		const { contributors } = this.state;

		let titleArray = contributors && contributors.length &&
			[...new Set(contributors.reduce((a, b) => a = a.concat(b.titles || []), []))];

		let titleOptions = titleArray.map(title => ({ value: title, label: title }));

        return (<div>
			{contributors && contributors.map((contrib) => (
				<div className='team-member'>
					<div className='control rich-select'>
						<label className='label'>ID</label>
						<input
							className='input is-expanded'
							type='text'
							placeholder='Member ID'
							value={contrib.id || ''}
							onChange={this.handleInput.bind(this, 'id', contrib)} />
					</div>
					<div className='control rich-select'>
						<label className='label'>Name</label>
						<input
							className='input is-expanded'
							type='text'
							placeholder='Member Name'
							value={contrib.name || ''}
							onChange={this.handleInput.bind(this, 'name', contrib)} />
					</div>
					<div className='control rich-select'>
						<label className='label'>Badge</label>
						<input id='member-badge'
							className='input is-expanded'
							type='text'
							placeholder='Member Badge'
							value={contrib.badge || ''}
							onChange={this.handleInput.bind(this, 'badge', contrib)} />
					</div>
					<RichMultiSelect
						setting='titles'
						friendlyName='Titles'
						text='Titles'
						defaultValue={titles}
						defaultOption='Select Title'
						options={titleOptions}
						onChange={this.handleTitles.bind(this, contrib)} />
				</div>
			))}
		</div>)
    }
}

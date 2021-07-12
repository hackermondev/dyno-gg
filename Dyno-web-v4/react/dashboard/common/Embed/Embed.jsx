import React from 'react';
import { htmlEncode } from 'js-htmlencode';
import EmbedAuthor from './EmbedAuthor.jsx';
import EmbedTitle from './EmbedTitle.jsx';
import EmbedField from './EmbedField.jsx';
import EmbedFooter from './EmbedFooter.jsx';
import { parseChannelMentions, parseRoleMentions} from './MentionParser.js';

export default class Embed extends React.Component {
	state = {
		embed: this.defaultEmbed,
	}

	mdTags = {
		'**': 'strong',
		'__': 'u',
		'_': 'em',
		'*': 'strong',
		'~~': 'strike',
		'```': 'code.block',
		'`': 'code.inline',
	};

	get defaultEmbed() {
		return {
			author: {},
			title: false,
			url: false,
			color: false,
			description: false,
			image: false,
			thumbnail: false,
			fields: [],
			footer: false,
			timestamp: false,
		};
	}

	componentWillMount() {
		if (!this.props.embed) {
			return;
		}
		this.setState({ embed: this.getEmbedData(this.props.embed) });
	}

	componentWillReceiveProps(props) {
		if (!props.embed) {
			return this.defaultEmbed;
		}
		this.setState({ embed: this.getEmbedData(props.embed) });
	}

	getEmbedData(embed) {
		return Object.assign({}, this.defaultFormData, embed);
	}

	formatMd = (input) => {
		if (!input) return input;
		let formattedInput = htmlEncode(input);

		formattedInput = formattedInput.replace(/https?:\/\/(www\.)?[-a-zA-Z0-9@:%._\+~#=]{2,256}\.[a-z]{2,6}\b([-a-zA-Z0-9@:%_\+.~#?&//=]*)/g,
			'<a href="$&" target="_blank">$&</a>');

		const tags = Object.keys(this.mdTags).map(tag => tag.replace(/\*/g, '\\*'));

		for (let t of tags) {
			let tagRegex = new RegExp(`(${t})(.*?)(${t})`, 'g');
			formattedInput = formattedInput.replace(tagRegex, (match, open, value, close) => {
				const [tag, className] = this.mdTags[open].split('.');
				const start = className ? `<${tag} class='${className}'>` : `<${tag}>`;
				return (this.mdTags[open] && open === close) ? `${start}${value}</${tag}>` : match;
			});
		}

		const channelMentions = parseChannelMentions(formattedInput, this.props.channels);
		for (let [key, value] of channelMentions) {
			if (key.startsWith('#')) {
				const regex = `(#${value.name})(?!<\\/a>)`;
				formattedInput = formattedInput.replace(new RegExp(regex), `<a>#${value.name}</a>`);
				continue;
			}

			formattedInput = formattedInput.replace(key, `<a>#${value.name}</a>`);
		}

		const roleMentions = parseRoleMentions(formattedInput, this.props.roles);
		for (let [key, value] of roleMentions) {
			const color = value.color ? `#${value.color.toString(16)}` : 'rgb(185, 187, 190)';
			if (key.startsWith('@')) {
				const regex = `([^>]|^)(@${value.name})(?!<\\/a>)`;
				formattedInput = formattedInput.replace(new RegExp(regex), `$1<a style="color: ${color}">@${value.name}</a>`);
				continue;
			}

			formattedInput = formattedInput.replace(key, `<a style="color: ${color}">@${value.name}</a>`);
		}

		return formattedInput;
	}

	render() {
		const { embed } = this.state;

		const embedStyle = {};
		if (embed.image && embed.image.url) {
			embedStyle.maxWidth = '426px';
		}

		const pillStyle = {};
		if (embed.color) {
			pillStyle.backgroundColor = typeof embed.color === 'number' ? `#${embed.color.toString(16)}` : `#${embed.color.replace('#', '')}`;
		}

		return (
			<div className='embed-wrapper'>
				<div className='embed' style={embedStyle}>
					<div className='embed-pill' style={pillStyle}></div>
					<div className='embed-inner'>
						<div className='embed-content'>
							<div className='embed-content-inner'>
								<EmbedAuthor author={embed.author} />
								<EmbedTitle title={embed.title} url={embed.url} />
								{embed.description && (
									<div className='embed-description embed-markup' dangerouslySetInnerHTML={{ __html: this.formatMd(embed.description) }}></div>)}
								{embed.fields && (
									<div className='embed-fields'>
										{embed.fields.map(field => (<EmbedField key={Math.random()} field={field} formatter={this.formatMd} />))}
									</div>
								)}
							</div>
							{embed.thumbnail && embed.thumbnail.url && (
								<div className='embed-thumbnail'>
									<img src={embed.thumbnail.url} />
								</div>)}
						</div>
						{embed.image && embed.image.url && (
							<div className='embed-image'>
								<img src={embed.image.url} />
							</div>)}
						<EmbedFooter footer={embed.footer} timestamp={embed.timestamp} />
					</div>
				</div>
			</div>
		);
	}
}

import React from 'react';
import { createMessageEmbed, editMessageEmbed, deleteMessageEmbed } from './service/reactionRolesService.js';
import RichSelect from '../common/RichSelect.jsx';
import '!style-loader!css-loader!@dyno.gg/emoji-mart/css/emoji-mart.css';
import { Picker } from '@dyno.gg/emoji-mart';
import Emoji from '@dyno.gg/emoji-mart/dist/components/emoji/emoji.js';

export default class ReactionRolesPanel extends React.Component {
    state = {
        reaction: '',
        role: '',
        description: '',
    };

    UNSAFE_componentWillMount() {
        this.setState({
            reaction: this.props.emoji || '',
            role: this.props.role || '',
            description: this.props.description || '',
        });
    }

    deleteReaction() {
        this.setState({ reaction: '' });
        this.props.onEmojiChange(this.props.id, '');
    }

    handleDescription(event) {
        this.setState({ description: event.target.value });
        this.props.onDescriptionChange(this.props.id, event.target.value);
    }

    addReaction = (emoji) => {
        if (emoji.custom) {
            const customEmoji = this.props.emojis.find(e => e.name === emoji.name);
            emoji._id = customEmoji.id;
            emoji.animated = customEmoji.animated;
        }

        this.setState({ reaction: emoji, isPickerOpen: false });
        this.props.onEmojiChange(this.props.id, emoji);
    }

    togglePicker = () => {
        this.setState({ isPickerOpen: !this.state.isPickerOpen });
    }

    handleRole = (props, selectedOption) => {
        this.setState({ role: selectedOption });
        this.props.onRoleChange(this.props.id, selectedOption);
    }

    render() {
        const { reaction, role } = this.state;
        const customs = this.props.emojis.map(emoji => {
            return {
                name: emoji.name,
                short_names: [emoji.name],
                imageUrl: `https://cdn.discordapp.com/emojis/${emoji.id}.${emoji.animated ? 'gif' : 'png'}?v=1`,
            };
        });

        const roleOptions = this.props.roles.map(c => ({ value: c.id, label: c.name }));

        const categories = [
            'search',
            'recent',
            'custom',
            'people',
            'nature',
            'foods',
            'activity',
            'places',
            'objects',
            'symbols',
            'flags',
        ];

        return (
            <div className='columns'>
                <div className='column is-2'>
                    <span>Reaction</span>
                    <div className='reaction-picker'>
                        {reaction &&
                            <div key={reaction.id} className='reaction'>
                                {reaction.custom ?
                                    <span className='custom' style={{
                                        background: `url(${reaction.imageUrl}) no-repeat center`,
                                        backgroundSize: `20px`,
                                    }}></span> :
                                    <Emoji set='twitter' sheetSize={64} emoji={reaction.colons} size={16} />
                                }
                                <a className='icon delete-reaction' onClick={this.deleteReaction.bind(this, reaction)}>
                                    <i className='fa fa-times'></i>
                                </a>
                            </div>
                        }
                        {!reaction &&
                            <div className='reaction'>
                                <a className='is-info' onClick={this.togglePicker}>+</a>
                            </div>
                        }
                        {this.state.isPickerOpen && (
                            <Picker
                                set='twitter'
                                title='Pick an emoji'
                                custom={customs}
                                include={categories}
                                showPreview={false}
                                // emojiTooltip={true}
                                onClick={this.addReaction} />
                        )}
                    </div>
                </div>
                <div className='column is-5'>
                    <div className="control rich-select">
                        <label className='label'>Description</label>
                        <input id='description'
                            className='input is-expanded'
                            type='text'
                            placeholder=''
                            value={this.state.description || ''}
                            onChange={this.handleDescription.bind(this)} />
                    </div>
                </div>
                <div className='column is-4'>
                    <RichSelect
                        text='Role'
                        defaultValue={this.state.role}
                        defaultOption='Select Role'
                        options={roleOptions}
                        disabled={false}
                        onChange={this.handleRole.bind(this)} />
                </div>
                <div className='column is-1'>
                    <button className="button is-info is-outlined is-danger" style={{ marginTop: '35px' }} onClick={() => this.props.onDelete(this.props.id)}>
                        <i class="fas fa-times"></i>
                    </button>
                </div>
            </div>);
    }
}

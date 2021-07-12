import React from 'react';

export default class AdvancedVariables extends React.Component {
    render() {
        return (<div className='help-text'>
            <ul></ul>
            <p>{'{user}'} Variables</p>
            <ul>
                <li><code>{'{user.id}'}</code> - User's id</li>
                <li><code>{'{user.name}'}</code> - User's nickname including the discrim</li>
                <li><code>{'{user.username}'}</code> - User's username</li>
                <li><code>{'{user.discriminator}'}</code> aka {'{user.discrim}'} - User's discriminator</li>
                <li><code>{'{user.nick}'}</code> - User's nickname excluding the discrim</li>
                <li><code>{'{user.game}'}</code> - User's current game (if nothing, gets the last played game)</li>
                <li><code>{'{user.avatar}'}</code> - User's avatar</li>
                <li><code>{'{user.mention}'}</code> - Mentions the user</li>
                <li><code>{'{user.createdAt}'}</code> - User's registeration date</li>
                <li><code>{'{user.joinedAt}'}</code> - User's join date</li>
            </ul>
            <p>{'{server}'} Variables</p>
            <ul>
                <li><code>{'{server.id}'}</code> - Server's id</li>
                <li><code>{'{server.name}'}</code> - Server's name</li>
                <li><code>{'{server.icon}'}</code> - Server's icon</li>
                <li><code>{'{server.memberCount}'}</code> - Amount of members on the server</li>
                <li><code>{'{server.ownerID}'}</code> - Owner's id</li>
                <li><code>{'{server.createdAt}'}</code> - Server's creation date</li>
                <li><code>{'{server.region}'}</code> - Server region</li>
            </ul>
            <p>{'{channel}'} Variables</p>
            <ul>
                <li><code>{'{channel.id}'}</code> - Channel id</li>
                <li><code>{'{channel.name}'}</code> - Channel name</li>
                <li><code>{'{channel.mention}'}</code> - Channel mention</li>
            </ul>
            <p>{'{time}/{date}'} Variables</p>
            <ul>
                <li><code>{'{time}'}</code> - Current 24 hour time (EST timezone)</li>
                <li><code>{'{time12}'}</code> - Current 12 hour time</li>
                <li><code>{'{date}'}</code> - Current date</li>
                <li><code>{'{datetime}'}</code> - Current date with the 24 hour time</li>
                <li><code>{'{datetime12}'}</code> -  Current date with the 12 hour time</li>
            </ul>
            <p>Advanced Variables  - (Note: Most of these must be on separate lines)</p>
            <ul>
                <li><code>{'{noeveryone}'}</code> - Disables @everyone in command</li>
                <li><code>{'{prefix}'}</code> - Output command prefix for server</li>
                <li><code>{'{delete}'}</code> - Delete command trigger after, example: <code> {'{delete}'} I am Dyno </code></li>
                <li><code>{'{silent}'}</code> - Silents Bot default response, example: <code> {'{silent}'} {'{!role {user} Humans}'} </code></li>
                <li><code>$N</code> - returns a command argument, example: <code>You chose $1</code></li>
                <li><code>{'{!command}'}</code> - execute a bot command, example: <code>{'{!role $1 Regulars}'}</code></li>
                <li><code>{'{require:role}'}</code> - Set required roles or serverMod to use command, example:<code> {'{require:Accomplices} or {require:serverMod}'}</code></li>
                <li><code>{'{require:#channel}'}</code> - Set required channel to use command in, example:<code>{'{require:#batcave} This is the batcave.'}</code></li>
                <li><code>{'{not:role}'}</code> - Blacklist Role from using command, example:<code>{'{not:Lost Privileges}'}</code></li>
                <li><code>{'{not:#channel}'}</code> - Blacklist from being able to use command in said channel, example:<code>{'{not:#general}'}</code></li>
                <li><code>{'{respond:#channel}'}</code> - Set the channel the command responds in, example: <code> {'{respond:#announcements} Announcements woo!'}</code></li>
                <li><code>{'{dm}'}</code> - DM the bot response, example: <code> {'{dm} I just DMed you!'}</code></li>
                <li><code>{'{dm:user}'}</code> - DMs the bot response to a specified user, example: <code> {'{dm:Nooblance} I just DMed the mighty Lance!'}</code></li>
                <li><code>{'{choose:option1;option2;option3}'}</code> - List of items to randomize, example: <code> {'{choose:pie;cake;icecream;ban hammer} '}</code></li>
                <li><code>{'{choice}'}</code> - Placement for {'{choose}'} variable, example: <code> {'{My favorite desert is {choice}'} </code></li>
            </ul>
        </div>);
    }
}
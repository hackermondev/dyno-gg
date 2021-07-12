export function parseChannelMentions(embed, channels) {
    const matches = [];

    if (!embed) {
        return matches;
    }

    let formattedInput = embed;
    let channelMentions = formattedInput.match(/([<{]|&lt;)#([^>};]+)([>}]|&gt;)/mg);
    if (channelMentions) {
        channelMentions.forEach((item) => {
            let idOrName = item.replace('&gt;', '>').replace('&lt;', '<');
            idOrName = idOrName.substr(2).slice(0, -1);
            const channel = channels.find((c) => c.id === idOrName || c.name === idOrName);

            if (channel) {
                matches.push([item, channel]);
            }
        });
    }

    channelMentions = formattedInput.match(/#([\w\d-_]+)/mg);
    if (channelMentions) {
        channelMentions.forEach((item) => {
            const name = item.substr(1);
            const channel = channels.find((c) => c.name === name);

            if (channel) {
                matches.push([item, channel]);
            }
        });
    }

    return matches;
}

export function parseRoleMentions(embed, roles) {
    const matches = [];

    if (!embed || !roles) {
        return matches;
    }

    // sort by length desc
    const orderedRoles = roles.sort((a, b) => b.name.length - a.name.length);

    let formattedInput = embed;
    let roleMentions = formattedInput.match(/([<{]|&lt;)@*(&|&amp;)([^>};]+)([>}]|&gt;)/mg);
    if (roleMentions) {
        roleMentions.forEach((item) => {
            let idOrName = item.replace('&gt;', '>').replace('&lt;', '<').replace('&amp;', '&');
            idOrName = idOrName.substr(2).slice(0, -1);
            if (idOrName.startsWith('&')) {
                idOrName = idOrName.substr(1);
            }
            const role = orderedRoles.find((r) => r.id === idOrName || idOrName.startsWith(r.name));

            if (role) {
                matches.push([item, role]);
            }
        });
    }

    roleMentions = formattedInput.match(/@([\w\d ]+)/mg);
    if (roleMentions) {
        roleMentions.forEach((item) => {
            const name = item.substr(1);
            const role = orderedRoles.find((r) => name.startsWith(r.name));

            if (role) {
                matches.push([`@${role.name}`, role]);
            }
        });
    }

    return matches;
}


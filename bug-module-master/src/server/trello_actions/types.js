const defTrelloColors = {
    blue: 0x0079bf,
    yellow: 0xd9b51c,
    orange: 0xd29034,
    green: 0x008000,
    red: 0xff0000,
    purple: 0x89609e,
    pink: 0xcd5a91,
    lime: 0x4bbf6b,
    sky: 0x00aecc,
    grey: 0x838c91,
    trello: 0x026aa7,
    nocolor: 0xb6bbbf
};
const { inspect } = require("util");

function sliceData(data) {
    const maxLength = 240;
    return (data.length > maxLength) ? `${data.slice(0, maxLength - 3).trim()}...` : data.trim();
}

const typeParser = async function actionType(data, triggered_by, model, cardLink) {
    const { type } = data;

    switch (type) {
        case "addLabelToCard": {
            if (data.data.label.name === "") {
                return [`A label of color \`${data.data.label.color}\` has been added to card ${cardLink}`, defTrelloColors[data.data.label.color]];
            }
            else if (data.data.label.hasOwnProperty("color") === false) {
                return [`Label \`${data.data.label.name}\` has been added to card ${cardLink}`, defTrelloColors.blue];
            }
            else {
                return [`Label \`${data.data.label.name}\` of color \`${data.data.label.color}\` has been added to card ${cardLink}`, defTrelloColors[data.data.label.color]];
            }
        }
        case ("createCard") || ("emailCard"): {
            return [`Card ${cardLink} has been created`, defTrelloColors.green];
        }
        case "commentCard": {
            return [`\`${triggered_by}\` commented on card [\`${data.data.card.name}\`](https://trello.com/c/${data.data.card.shortLink}/${data.data.card.idShort}-${data.data.card.name}#comment-${data.id})\n\n**Comment**:\n${sliceData(data.data.text)}`, defTrelloColors.green];
        }
        case "createLabel": {
            if (data.data.label.name === "") {
                return [`A label of color \`${data.data.label.color}\` has been added`, defTrelloColors[data.data.label.color]];
            }
            else {
                return [`A label of name \`${data.data.label.name}\` has been added`, defTrelloColors.green];
            }
        }
        case "updateLabel": {
            if (data.data.hasOwnProperty("old")) {
                const oldData = data.data.old;
                if (oldData.hasOwnProperty("color")) {
                    if (data.data.label.name === "") {
                        return [`The color of a label has been updated from \`${oldData.color}\` to \`${data.data.label.color}\``, defTrelloColors[data.data.label.color]];
                    }
                    else if (data.data.label.color === "") {
                        return [`The color of label \`${data.data.label.name}\` has been removed.\nPrevious color: \`${oldData.color}\``, defTrelloColors.nocolor];
                    }
                    else {
                        return [`The color of label \`${data.data.label.name}\` has been updated from \`${oldData.color}\` to \`${data.data.label.color}\``, defTrelloColors[data.data.label.color]];
                    }
                }
                if (oldData.hasOwnProperty("name")) {
                    if (oldData.name === "") {
                        return [`The name of a label has been updated from undefined to \`${data.data.label.name}\``, defTrelloColors[data.data.label.color]];
                    }
                    else if (data.data.label.name === "") {
                        return [`The name of a label has been updated from \`${oldData.name}\` to undefined`, defTrelloColors[data.data.label.color]];
                    }
                    else {
                        return [`The name of a label has been changed from \`${oldData.name}\` to \`${data.data.label.name}\``, defTrelloColors[(data.data.label.color === "") ? defTrelloColors.nocolor : data.data.label.color]];
                    }
                }
            }
            else if (data.data.hasOwnProperty("old") === false) {
                return [`\`${data.data.label.color}\` color has been added to label \`${data.data.label.name}\``, defTrelloColors[data.data.label.color]];
            }

            throw `Couldn't find a matching condition for type: updateLabel\n${inspect(data.data, { depth: 0 })}`;
        }
        case "deleteLabel": {
            return [`A label of ID \`${data.data.label.id}\` has been deleted`, defTrelloColors.red];
        }
        case "removeLabelFromCard": {
            if (data.data.label.name === "") {
                return [`A label of color \`${data.data.label.color}\` has been removed from the card ${cardLink}`, defTrelloColors.nocolor];
            }
            else if (data.data.label.hasOwnProperty("color") === false) {
                return [`\`${data.data.label.name}\` label has been removed from the card ${cardLink}`, defTrelloColors.nocolor];
            }
            else {
                return [`\`${data.data.label.name}\` label of color \`${data.data.label.color}\` has been removed from the card ${cardLink}`, defTrelloColors.nocolor];
            }
        }
        case "deleteComment": {
            return [`${triggered_by} deleted their comment on card ${cardLink}`, defTrelloColors.red];
        }
        case "updateComment": {
            return [`\`${triggered_by}\` updated their [\`comment\`](https://trello.com/c/${data.data.card.shortLink}/${data.data.card.idShort}-${data.data.card.name}#comment-${data.id}) on ${cardLink}\n\n**Old Comment**:\n${sliceData(data.data.old.text)}\n\n**New Comment**:\n${sliceData(data.data.action.text)}`, defTrelloColors.blue];
        }
        case "addChecklistToCard": {
            return [`Checklist \`${data.data.checklist.name}\` has been added to the card ${cardLink}`, defTrelloColors.green];
        }
        case "createCheckItem": {
            const verboseDataInitial = `Item \`${data.data.checkItem.name}\` has been added to the checklist \`${data.data.checklist.name}\` of card ${cardLink}\n\n**Users Mentioned**:\n$|8`;
            const verboseDataArray = verboseDataInitial.split("$|8");
            const unparsedData = data.data.checkItem.name.replace(/:(.*?):/g, "");

            if (unparsedData.includes("@")) {
                const splitData = unparsedData.split(" ");
                for (const users of splitData) {
                    if (users.includes("@")) {
                        const userList = users.split("@");

                        for (const user of userList) {
                            if (user !== "") {
                                const filteredUser = user.match(/[a-z0-9_]/g);
                                const finalUser = filteredUser.join("");

                                if ((finalUser.length >= 3) && (finalUser.length <= 100)) {
                                    return verboseDataArray.push(`* [\`${finalUser}\`](https://trello.com/${finalUser})\n`);
                                }
                            }
                        }

                        return [verboseDataArray.join(""), defTrelloColors.green];
                    }
                }
            }
            else {
                verboseDataArray.push("none");
            }

            return [verboseDataArray.join(""), defTrelloColors.green];
        }
        case "updateCheckItemStateOnCard": {
            if (data.data.checkItem.state === "complete") {
                return [`An item named \`${data.data.checkItem.name}\` of card ${cardLink} has been marked as \`completed\``, defTrelloColors.blue];
            }
            else {
                return [`An item named \`${data.data.checkItem.name}\` of card ${cardLink} has been changed back to \`incomplete\` state`, defTrelloColors.blue];
            }
        }
        case "updateCheckItem": {
            const verboseDataInitial = `An item name of checklist \`${data.data.checklist.name}\` of card ${cardLink} has been changed from \`${data.data.old.name}\` to \`${data.data.checkItem.name}\`\n\n**Users mentioned**:\n$|8`;
            const verboseDataArray = verboseDataInitial.split("$|8");
            const rawHtmlData = data.display.entities.checkitem.nameHtml;
            const parsedHtmlData = rawHtmlData.match(/(title=)(.*?)>/g);

            if ((parsedHtmlData !== null) && Array.isArray(parsedHtmlData)) {
                const userList = parsedHtmlData.join(",").match(/"(.*?)"/g).join(",").match(/[^"]/g).join("").split(",");
                let index = 0;
                for (const user of userList) {
                    index = index + 1;
                    verboseDataArray.push(`${index}) [${user}](https://trello.com/${user})\n`);
                }
                return [verboseDataArray.join(""), defTrelloColors.blue];
            }
            else {
                verboseDataArray.push("none");
                return [verboseDataArray.join(""), defTrelloColors.blue];
            }
        }
        case "deleteCheckItem": {
            return [`Item \`${data.data.checkItem.name}\` has beem deleted from the Checklist \`${data.data.checklist.name}\` of card ${cardLink}`, defTrelloColors.red];
        }
        case "convertToCardFromCheckItem": {
            return [`An item named \`${data.data.card.name}\` of card [\`${data.data.cardSource.name}\`](https://www.trello.com/c/${data.data.cardSource.shortLink}) has been converted to a card named ${cardLink} which is under the list \`${data.data.list.name}\``, defTrelloColors.blue];
        }
        case "removeChecklistFromCard": {
            return [`Checklist \`${data.data.checklist.name}\` has been removed from the card ${cardLink}`, defTrelloColors.nocolor];
        }
        case "copyChecklist": {
            return [`Checklist \`${data.data.checklistSource.name}\` has been copied and renamed to ${data.data.checklist.name}`, defTrelloColors.green];
        }
        case "addMemberToBoard": {
            return [`[\`${data.display.entities.member.text}\`](https://trello.com/${data.display.entities.member.username}) has been added to the board`, defTrelloColors.green];
        }
        case "addMemberToCard": {
            return [`[\`${data.display.entities.member.text}\`](https://trello.com/${data.display.entities.member.username}) has been added to the card ${cardLink}`, defTrelloColors.green];
        }
        case "updateCard": {
            const oldData = data.data.old;
            if (oldData.hasOwnProperty("desc")) {
                if (oldData.desc === "") {
                    return [`A description has been added to card ${cardLink}\n\n**Description**:\n${sliceData(data.data.card.desc)}`, defTrelloColors.green];
                }
                else if (data.data.card.desc === "") {
                    return [`The description of card ${cardLink} has been removed\n\n**Old Description**:\n${sliceData(oldData.desc)}`, defTrelloColors.nocolor];
                }
                else {
                    return [`The description of card ${cardLink} has been updated\n\n**Old Description**:\n${sliceData(oldData.desc)}\n\n**New Description**:\n${sliceData(data.data.card.desc)}`, defTrelloColors.blue];
                }
            }

            if (oldData.hasOwnProperty("due")) {
                if (oldData.due === null) {
                    return [`Due date has been added to card ${cardLink}: \`${new Date(data.data.card.due).toUTCString()}\``, defTrelloColors.green];
                }
                else if (data.data.card.due === null) {
                    return [`Due date \`${new Date(oldData.due).toUTCString()}\` has been removed from card ${cardLink}`, defTrelloColors.nocolor];
                }
                else {
                    return [`Due date of card ${cardLink} has been changed from \`${new Date(oldData.due).toUTCString()}\` to \`${new Date(data.data.card.due).toUTCString()}\``, defTrelloColors.blue];
                }
            }

            if (oldData.hasOwnProperty("idList")) {
                return [`Card ${cardLink} has been moved from list \`${data.display.entities.listBefore.text}\` to the list \`${data.display.entities.listAfter.text}\``, defTrelloColors.blue];
            }

            if (oldData.hasOwnProperty("pos")) {
                return [`The position of card ${cardLink} has been updated in list \`${data.data.list.name}\``, defTrelloColors.blue];
            }

            if (oldData.hasOwnProperty("closed")) {
                if (oldData.closed === false) {
                    return [`A card named ${cardLink} has been archived`, defTrelloColors.nocolor];
                }
                else {
                    return [`A card named ${cardLink} has been unarchived`, defTrelloColors.blue];
                }
            }

            if (oldData.hasOwnProperty("name")) {
                return [`A card name has been changed from \`${oldData.name}\` to ${cardLink}`, defTrelloColors.blue];
            }

            if (oldData.hasOwnProperty("idAttachmentCover")) {
                if (oldData.idAttachmentCover === "") {
                    return [`A cover image has been added to card ${cardLink}`, defTrelloColors.green];
                }
                else {
                    return [`A cover image has been removed from card ${cardLink}`, defTrelloColors.red];
                }
            }

            throw `No matching condition found for type: updateCard, ${inspect(oldData, { depth: 0 })}`;
        }
        case "addAttachmentToCard": {
            return [`An [\`Attachment\`](${data.data.attachment.url}) has been added to card ${cardLink}`, defTrelloColors.green];
        }
        case "deleteAttachmentFromCard": {
            return [`An Attachment has been removed from card ${cardLink}`, defTrelloColors.red];
        }
        case "copyCard": {
            return [`Card ${cardLink} has been copied from [\`${data.data.cardSource.name}\`](https://www.trello.com/c/${data.data.cardSource.shortLink}) to the list \`${data.data.list.name}\``, defTrelloColors.green];
        }
        case "copyCommentCard": {
            return [`A [\`comment\`](https://www.trello.com/c/${data.data.card.id}#comment-${data.id}) of card [\`${data.data.cardSource.name}\`](https://www.trello.com/c/${data.data.cardSource.id}) has been copied to the card named \`${data.data.card.name}\``, defTrelloColors.green];
        }
        case "removeMemberFromCard": {
            return [`[\`${data.display.entities.member.text}\`](https://trello.com/${data.display.entities.member.username}) has been removed from the card ${cardLink}`, defTrelloColors.nocolor];
        }
        case "removeMemberFromBoard": {
            return [`[\`${data.display.entities.member.text}\`](https://trello.com/${data.display.entities.member.username}) has been removed from this board`, defTrelloColors.nocolor];
        }
        case "makeAdminOfBoard": {
            return [`[\`${data.display.entities.member.text}\`](https://trello.com/${data.display.entities.member.username}) has been made as an Admin of this board`, defTrelloColors.blue];
        }
        case "makeNormalMemberOfBoard": {
            return [`[${data.display.entities.member.text}](https://trello.com/${data.display.entities.member.username}) has been made as a normal Member of the board`, defTrelloColors.blue];
        }
        case "updateBoard": {
            const oldData = data.data.old;
            if (oldData.prefs.hasOwnProperty("permissionLevel")) {
                return [`The board has been changed from ${oldData.prefs.permissionLevel} to ${data.data.board.prefs.permissionLevel}`, defTrelloColors.blue];
            }
            if (oldData.prefs.hasOwnProperty("background")) {
                if ((model.prefs.backgroundImage === null) && (oldData.prefs.background.length <= 7)) {
                    return [`The background of this board has been changed from \`${oldData.prefs.background}\` to \`${data.data.board.prefs.background}\``, defTrelloColors.blue];
                }
                else if (Array.isArray(model.prefs.backgroundImageScaled) && (oldData.prefs.background.length <= 7)) {
                    const background = model.prefs.backgroundImageScaled;
                    let finalBackgroundURL;
                    background.find(value => {
                        if (value.width === 1920) {
                            return finalBackgroundURL = value.url;
                        }
                    });
                    return [`The background of this board has been updated from \`${oldData.prefs.background}\` to an [\`image\`](${finalBackgroundURL})`, defTrelloColors.blue];
                }
                else {
                    return [`The background of this board has been changed from an image to a color named \`${data.data.board.prefs.background}\``, defTrelloColors[data.data.board.prefs.background]];
                }
            }
            if (oldData.prefs.hasOwnProperty("voting")) {
                return [`Voting permission has been changed from \`${oldData.prefs.voting}\` to \`${data.data.board.prefs.voting}\``, defTrelloColors.blue];
            }

            throw `A matching condition couldn't be found for the type: updateBoard\n${inspect(oldData.prefs, { depth: 0 })}`;
        }
        case "deleteCard": {
            return [`A card has been deleted in the list \`${data.data.list.name}\``, defTrelloColors.red];
        }
        case "removeFromOrganizationBoard": {
            return [`This board has been removed from the organization named \`${data.data.organization.name}\``, defTrelloColors.red];
        }
        case "addToOrganizationBoard": {
            return [`This board has been made part of an organization named \`${data.data.organization.name}\``, defTrelloColors.green];
        }
        case "enablePlugin": {
            return [`A plugin named \`${data.data.plugin.name}\` has been enabled`, defTrelloColors.green];
        }
        case "createList": {
            return [`A list named \`${data.data.list.name}\` has been created`, defTrelloColors.green];
        }
        case "updateList": {
            if (data.data.hasOwnProperty("old")) {
                const oldData = data.data.old;
                if (oldData.hasOwnProperty("pos")) {
                    return [`The position of a list named ${data.data.list.name} has been changed`, defTrelloColors.blue];
                }
                if (oldData.hasOwnProperty("name")) {
                    return [`The name of a list has been changed from \`${oldData.name}\` to \`${data.data.list.name}\``, defTrelloColors.blue];
                }
                if (oldData.hasOwnProperty("closed")) {
                    if (oldData.closed === false) {
                        return [`A label named \`${data.data.label.name}\` has been archived`, defTrelloColors.nocolor];
                    }
                    else {
                        return [`A label named \`${data.data.label.name}\` has been unarchived`, defTrelloColors.blue];
                    }
                }
            }

            throw "A matching condition couldn't be found for the type: updateList" + "\n" + inspect(data.data, { depth: 0 });
        }
        case "moveListFromBoard": {
            return [`A list named \`${data.data.list.name}\` has been moved to board [\`${data.display.entities.board.text}\`](https://trello.com/b/${data.display.entities.board.shortLink})`, defTrelloColors.blue];
        }
        case "voteOnCard": {
            if (data.data.voted === true) {
                return [`A vote has been placed on the card ${cardLink}`, defTrelloColors.green];
            }
            else {
                return [`A vote has been removed from the card ${cardLink}`, defTrelloColors.nocolor];
            }
        }
        case "disablePlugin": {
            return [`A plugin named \`${data.data.plugin.name}\` has been disabled`, defTrelloColors.nocolor];
        }
        case "moveCardFromBoard": {
            return [`A card of list \`${data.data.list.name}\` has been moved from this board to [\`${data.display.entities.board.text}\`](https://trello.com/c/${data.display.entities.card.id})`, defTrelloColors.blue];
        }
        case "moveCardToBoard": {
            return [`A card named [\`${data.data.card.name}\`](https://trello.com/c/${data.data.card.id}) has been moved to this board from [\`${data.display.entities.board.text}\`](https://trello.com/b/${data.data.boardSource.id})`, defTrelloColors.blue];
        }
        default: {
            throw `Couldn't find a matching case for type: ${type}`;
        }
    }
};

module.exports = {
    typeParser
};
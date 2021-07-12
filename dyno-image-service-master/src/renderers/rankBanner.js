const { createCanvas, Image, loadImage } = require('canvas');
const Util = require('./utils');
const fs = require('fs');

const cardWidth = 900;
const cardHeight = 300;

let podiumData = fs.readFileSync('./assets/podium.svg', 'utf8');
let chatBubbleData = fs.readFileSync('./assets/chat-bubble.svg', 'utf8');
let defaultBgData = fs.readFileSync('./assets/defaultbg.png');
let defaultBgImg = new Image();
defaultBgImg.src = defaultBgData;

async function renderRankCard(accentColor, textColor, avatarUrl, currXP, levelXP, rank, rankCount, name, bgUrl, level, prevLevelXP) {
    const canvas = createCanvas(cardWidth, cardHeight);
    const ctx = canvas.getContext('2d');

    let bgImg;
    if(bgUrl) {
        bgImg = new Image();
        bgImg.src = await Util.fetchImage(bgUrl);
    }

    const avatarImg = new Image();
    avatarImg.src = await Util.fetchImage(avatarUrl);

    const podiumImg = new Image();
    podiumImg.src = Buffer.from(podiumData.replace(/{{{accentColor}}}/gm, accentColor));

    const chatBubbleImg = new Image();
    chatBubbleImg.src = Buffer.from(chatBubbleData.replace(/{{{accentColor}}}/gm, accentColor));

    drawBackground(ctx, accentColor, bgImg);
    drawXPBar(ctx, Util.convertTorgba(accentColor, 0.6), currXP, levelXP, chatBubbleImg, textColor, prevLevelXP);
    drawRank(ctx, rank, rankCount, accentColor, podiumImg, textColor);
    drawUserInfo(ctx, name, avatarImg, accentColor, textColor);
    drawLevelHexagon(ctx, accentColor, level, textColor)
    
    return canvas.toBuffer();
}

function drawBackground(ctx, accentColor, bgImg) {
    ctx.fillStyle = '#222C45';
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 10;

    bgImg = bgImg || defaultBgImg;
    Util.roundImageRect(ctx, 1, 1, cardWidth - 2, cardHeight - 2, 15, bgImg);

    //Util.roundRect(ctx, 1, 1, cardWidth - 2, cardHeight - 2, 15, true, false);

    Util.roundRect(ctx, 0, 0, cardWidth, cardHeight, 15, false, true);
}

function drawUserInfo(ctx, name, avatarImg, accentColor, textColor) {
    const x = 40;
    const y = 40;
    const w = 180;
    const h = w;
    Util.circleCropImage(ctx, avatarImg, w, h, x, y, 'black', accentColor, 2);

    ctx.font = 'bold 20px open sans';
    ctx.textAlign = 'center';

    ctx.fillStyle = textColor;
    ctx.fillText(name, x + (w / 2), y + h + 30, 250);
}

function drawLevelHexagon(ctx, accentColor, level, textColor) {
    const x = 820;
    const y = 80;
    const size = 60;
    const tx = x + 2;
    const ty = y - 8;

    ctx.save();
    ctx.fillStyle = accentColor;
    ctx.lineWidth = 6;
    ctx.font = 'bold 38px open sans';
    Util.drawHexagon(ctx, x, y, size, false, true);
    ctx.textAlign = 'center';
    ctx.fillStyle = textColor;
    ctx.fillText('lvl', tx, ty);
    ctx.fillText(level, tx, ty + 40);
    ctx.restore();
}

function drawRank(ctx, rank, rankCount, accentColor, iconImg, textColor) {
    const x = 350;
    const y = 150;

    ctx.font = 'bold 28px open sans';
    ctx.textAlign = 'start';
    ctx.fillStyle = accentColor;
    const rankWidth = ctx.measureText(`#${rank}`).width;
    ctx.fillText(`#${rank}`, x, y);

    ctx.font = 'bold 24px open sans';
    ctx.fillStyle = textColor;
    ctx.fillText(`/ ${Util.formatXp(rankCount)}`, x + rankWidth + 8, y);

    ctx.drawImage(iconImg, x - 64, y - 38, 48, 48);
}

function drawXPBar(ctx, accentColor, currXP, levelXP, iconImg, textColor, prevLevelXP) {
    const x = 350;
    const y = 200;
    const w = 500;
    const h = 30;

    ctx.save();

    ctx.fillStyle = 'rgba(255, 255, 255, 0.4)';
    Util.roundRect(ctx, x, y, w, h, 10, true, false)


    ctx.fillStyle = accentColor;
    Util.roundRect(ctx, x, y, (w / levelXP) * (currXP - prevLevelXP), h, 10, true, false);

    ctx.fillStyle = textColor;
    ctx.font = 'bold 20px open sans';
    ctx.textAlign = 'start';
    ctx.fillText(`${Util.formatXp(currXP)} XP`, x + 5, y + h + 20);

    ctx.textAlign = 'end';
    ctx.fillText(`${Util.formatXp(levelXP - currXP)} XP Needed`, x + w - 5, y + h + 20);

    ctx.drawImage(iconImg, x - 64, y - 8, 48, 48);

    ctx.restore();
}

module.exports = {
    renderRankCard,
}
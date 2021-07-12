const axios = require('axios');
const { createCanvas, Image, loadImage } = require('canvas');

class Util {
    /**
    * Draws a rounded rectangle using the current state of the canvas.
    * If you omit the last three params, it will draw a rectangle
    * outline with a 5 pixel border radius
    * @param {CanvasRenderingContext2D} ctx
    * @param {Number} x The top left x coordinate
    * @param {Number} y The top left y coordinate
    * @param {Number} width The width of the rectangle
    * @param {Number} height The height of the rectangle
    * @param {Number} [radius = 5] The corner radius; It can also be an object 
    *                 to specify different radii for corners
    * @param {Number} [radius.tl = 0] Top left
    * @param {Number} [radius.tr = 0] Top right
    * @param {Number} [radius.br = 0] Bottom right
    * @param {Number} [radius.bl = 0] Bottom left
    * @param {Boolean} [fill = false] Whether to fill the rectangle.
    * @param {Boolean} [stroke = true] Whether to stroke the rectangle.
    */
    static roundRect(ctx, x, y, width, height, radius = 0, fill, stroke) {
        ctx.save();
        if (typeof stroke === 'undefined') {
            stroke = true;
        }
        if (typeof radius === 'undefined') {
            radius = 5;
        }
        if(width < radius) {
            width = radius;
        }

        ctx.beginPath();
        ctx.moveTo(x + radius, y);
        ctx.lineTo(x + width - radius, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius);
        ctx.lineTo(x + width, y + height - radius);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius, y + height);
        ctx.lineTo(x + radius, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius);
        ctx.lineTo(x, y + radius);
        ctx.quadraticCurveTo(x, y, x + radius, y);
        ctx.closePath();
        ctx.clip();
        if (fill) {
            ctx.fill();
        }
        if (stroke) {
            ctx.stroke();
        }
        ctx.restore();
    }

    static roundImageRect(ctx, x, y, width, height, radius, img) {
        ctx.save();
        if (typeof radius === 'undefined') {
            radius = 5;
        }
        if (typeof radius === 'number') {
            radius = { tl: radius, tr: radius, br: radius, bl: radius };
        } else {
            var defaultRadius = { tl: 0, tr: 0, br: 0, bl: 0 };
            for (var side in defaultRadius) {
                radius[side] = radius[side] || defaultRadius[side];
            }
        }
        ctx.beginPath();
        ctx.moveTo(x + radius.tl, y);
        ctx.lineTo(x + width - radius.tr, y);
        ctx.quadraticCurveTo(x + width, y, x + width, y + radius.tr);
        ctx.lineTo(x + width, y + height - radius.br);
        ctx.quadraticCurveTo(x + width, y + height, x + width - radius.br, y + height);
        ctx.lineTo(x + radius.bl, y + height);
        ctx.quadraticCurveTo(x, y + height, x, y + height - radius.bl);
        ctx.lineTo(x, y + radius.tl);
        ctx.quadraticCurveTo(x, y, x + radius.tl, y);
        ctx.closePath();
        ctx.clip();
        ctx.drawImage(img, x, y);
        ctx.restore();
    }

    static async fetchImage(url) {
        if (!url) {
            return;
        }

        const resp = await axios({
            method: 'get',
            url: url,
            responseType: 'arraybuffer',
        });

        return Buffer.from(resp.data);
    }

    static async circleCropImage(destCtx, image, iw, ih, ix, iy, fillStyle = 'black', strokeStyle, strokeLineWidth) {
        const canvas = createCanvas(iw, ih);
        const ctx = canvas.getContext('2d');

        ctx.drawImage(image, 0, 0, iw, ih);
        ctx.globalCompositeOperation = 'destination-in';
        ctx.beginPath();
        ctx.arc(iw / 2, ih / 2, iw / 2, 0, Math.PI * 2);
        ctx.fillStyle = fillStyle;
        ctx.fill();
        ctx.closePath();
        ctx.globalCompositeOperation = 'source-over';

        if (strokeStyle) {
            strokeLineWidth = strokeLineWidth || 1;
            ctx.beginPath();
            ctx.arc(iw / 2, ih / 2, (iw / 2) - strokeLineWidth / 2, 0, Math.PI * 2);
            ctx.strokeStyle = strokeStyle;
            ctx.lineWidth = strokeLineWidth;
            ctx.stroke();
            ctx.closePath();
        }

        destCtx.drawImage(canvas, ix, iy);
    }

    static drawHexagon(ctx, x, y, size, fill, stroke) {
        ctx.save();
        ctx.beginPath();
        ctx.moveTo(x + size * Math.cos(0), y + size * Math.sin(0));

        for (let side = 0; side < 7; side++) {
            ctx.lineTo(x + size * Math.cos(side * 2 * Math.PI / 6), y + size * Math.sin(side * 2 * Math.PI / 6));
        }

        ctx.clip();

        if(fill) {
            ctx.fill();
        }
        if(stroke) {
            ctx.stroke();
        }

        ctx.closePath();
        ctx.restore();
    }

    static convertTorgba(colorString, alpha) {
        if(colorString.startsWith('rgb(')) {
            return colorString.replace('rgb(', 'rgba(').replace(')', `, ${alpha})`);
        } else if (colorString.startsWith('rgba(')) {
            return colorString.replace(/[^,]+(?=\))/, alpha);
        } else if (colorString.startsWith('#')) {
            const hexColor = Number.parseInt(colorString.replace('#', ''), 16);
            const red = (hexColor >> 16) & 0xFF;
            const green = (hexColor >> 8) & 0xFF;
            const blue = hexColor & 0xFF;
            return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
        }     
    }

    static formatXp(xp) {
        if (xp < 1e3) return xp;
        if (xp >= 1e3 && xp < 1e6) return +(xp / 1e3).toFixed(2) + "k";
        if (xp >= 1e6 && xp < 1e9) return +(xp / 1e6).toFixed(2) + "m";
        if (xp >= 1e9 && xp < 1e12) return +(xp / 1e9).toFixed(2) + "b";
        if (xp >= 1e12) return +(xp / 1e12).toFixed(2) + "t";
      };
}

module.exports = Util;
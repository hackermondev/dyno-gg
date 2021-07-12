'use strict';

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const sharp = require('sharp');
const express = require('express');
const router = express.Router();

const file = path.join(__dirname, 'dyno.svg');
const gifRegexp = /^GIF8[79]a/;
const pngSignature = 'PNG\r\n\x1a\n';
const pngImageHeaderChunkName = 'IHDR';
const pngFriedChunkName = 'CgBI';
let svg;

function getOrLoadSvg(file) {
    if (svg) {
        return Promise.resolve(svg);
    }
    return new Promise((res, rej) => {
        fs.readFile(file, (err, data) => {
            if (err) {
                return rej(err);
            }
            svg = data.toString('utf-8');
            return res(svg);
        });
    });
}

async function getSvg(c, w, h) {
    let svg = await getOrLoadSvg(file);
    let vars = { c, w, h };
    let s = svg;
    for (let [key, val] of Object.entries(vars)) {
        s = s.replace(`{{${key}}}`, val)
    }

    return s;
}

function isGif(buffer) {
  var signature = buffer.toString('ascii', 0, 6);
  return (gifRegexp.test(signature));
}

function isPng(buffer) {
  if (pngSignature === buffer.toString('ascii', 1, 8)) {
    var chunkName = buffer.toString('ascii', 12, 16);
    if (chunkName === pngFriedChunkName) {
      chunkName = buffer.toString('ascii', 28, 32);
    }
    if (chunkName !== pngImageHeaderChunkName) {
      throw new TypeError('invalid png');
    }
    return true;
  }
}

function getSize(buffer) {
	if (isGif(buffer)) {
		return {
			width: buffer.readUInt16LE(6),
			height: buffer.readUInt16LE(8)
		};
	} else if (isPng(buffer)) {
		if (buffer.toString('ascii', 12, 16) === pngFriedChunkName) {
			return {
				width: buffer.readUInt32BE(32),
				height: buffer.readUInt32BE(36)
			};
		}
		return {
			width: buffer.readUInt32BE(16),
			height: buffer.readUInt32BE(20)
		};
	}
}

router.get('/', async (req, res) => {
	if (!req.query.url) {
		return res.status(400).send('Missing URL query.');
	}

    const color = 'FFFFFF';

    try {
		let av = req.query.url.replace(/\?(size\=[0-9]+).*/, '');
		av += `?size=256`;

		const reqSize = req.query.size || '256x256';
		let [width, height] = reqSize.split('x');

		width = parseInt(width, 10) > 2048 ? 2048 : parseInt(width, 10);
		
		if (!height) {
			height = width;
		}

		height = parseInt(height, 10) > 2048 ? 2048 : parseInt(height, 10);
	
		if (width > height) {
			width = height;
		} else if (height > width) {
			height = width;
		}

		const avatar = await axios.get(av, {
			headers: { Accept: 'image/*' },
			responseType: 'arraybuffer',
		});

		const size = getSize(avatar.data);
		if (size && size.width <= width) {
			width = size.width;
			height = size.height;
		}

		const svg = await getSvg(color, width, height);
        const img = await sharp(avatar.data).overlayWith(Buffer.from(svg), { cutout: true }).png().toBuffer();
        res.setHeader('Content-Type', 'image/png');
        res.end(img);
    } catch (err) {
        console.error(err);
        throw err;
	}
});


module.exports = router;
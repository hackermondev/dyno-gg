'use strict';

const fs = require('fs');
const path = require('path');
const sharp = require("sharp");
const express = require('express');
const router = express.Router();

const file = path.join(__dirname, 'dyno.svg');
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

router.get('/:color/:size?.png', async (req, res) => {
    const color = req.params.color;
    const size = req.params.size || '80x80';
    let [width, height] = size.split('x');

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

    try {
        const svg = await getSvg(color, width, height);
        const img = await sharp(Buffer.from(svg)).png().toBuffer();
        res.setHeader('Content-Type', 'image/png');
        res.end(img);
    } catch (err) {
        console.error(err);
        throw err;
    }
});


module.exports = router;
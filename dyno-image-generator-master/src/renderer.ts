import axios, { AxiosResponse } from 'axios';
import { createCanvas, Image, loadImage } from 'canvas';
import * as fs from 'fs';
import * as path from 'path';
import {
	ArcObject,
	FetchImageObject,
	GeneratorTemplate,
	ImageObject,
	LineObject,
	ObjectType,
	Point,
	RectangleObject,
	Renderable,
	TextObject,
} from './types/image-generator';

export class Renderer {
	public async render (template: GeneratorTemplate) {
		const canvas = createCanvas(template.width, template.height);
		const ctx = canvas.getContext('2d');

		this.drawBackground(template, ctx);

		for (const obj of template.objects) {
			this.preRender(obj, ctx);

			if (obj.type === ObjectType.Rectangle) {
				this.drawRect(<RectangleObject> obj, ctx);
			} else if (obj.type === ObjectType.Text) {
				this.drawText(<TextObject> obj, ctx);
			} else if (obj.type === ObjectType.Arc) {
				this.drawArc(<ArcObject> obj, ctx);
			} else if (obj.type === ObjectType.Line) {
				this.drawLine(<LineObject> obj, ctx);
			} else if (obj.type === ObjectType.Image) {
				this.drawImage(<ImageObject> obj, ctx);
			} else if (obj.type === ObjectType.FetchImage) {
				await this.fetchDrawImage(<FetchImageObject> obj, ctx);
			}
		}

		// canvas.createPNGStream().pipe(fs.createWriteStream(path.join(__dirname, '/test.png')));
		return canvas.toBuffer();
	}

	private preRender(obj: Renderable, ctx: any) {
		if (obj.stroke) {
			ctx.strokeStyle = obj.style;
		} else {
			ctx.fillStyle = obj.style;
		}

		ctx.lineWidth = obj.lineWidth || 1;
	}

	private drawBackground(template: GeneratorTemplate, ctx: any) {
		if (template.background) {
			if (typeof template.background === 'string') {
				ctx.fillStyle = template.background;
			}

			ctx.fillRect(0, 0, template.width, template.height);
		}
	}

	private drawRect(object : RectangleObject, ctx: any) {
		if (object.stroke) {
			ctx.strokeRect(object.x, object.y, object.width, object.height);
		} else {
			ctx.fillRect(object.x, object.y, object.width, object.height);
		}
	}

	private drawText(object : TextObject, ctx : any) {
		if (object.font) {
			ctx.font = object.font;
		}

		if (object.textAlign) {
			ctx.textAlign = object.textAlign;
		}
		
		if (object.stroke) {
			this.fixMaxWidth(object, ctx);
			ctx.strokeText(object.text, object.x, object.y, object.maxWidth);
		} else {
			this.fixMaxWidth(object, ctx);			
			ctx.fillText(object.text, object.x, object.y, object.maxWidth);
		}
	}
	// Hack to fix maxWidth. See https://github.com/Automattic/node-canvas/issues/1088
	private fixMaxWidth(object, ctx) {
		if (!object.maxWidth) {
			return;
		}

		if (object.stroke) {
			ctx.strokeText(object.text, -500, -500, object.maxWidth);
			ctx.strokeText(object.text, -500, -500, object.maxWidth);
		} else {	
			ctx.fillText(object.text, -500, -500, object.maxWidth);
			ctx.fillText(object.text, -500, -500, object.maxWidth);
		}
	}

	private drawArc(object : ArcObject, ctx : any) {
		ctx.beginPath();
		ctx.arc(object.x, object.y, object.radius, object.startAngle, object.endAngle, object.anticlockwise);

		if (object.stroke) {
			ctx.stroke();
		} else {
			ctx.fill();
		}
		ctx.closePath();
	}

	private drawLine(object : LineObject, ctx : any) {
		ctx.beginPath();
		ctx.moveTo(object.x, object.y);

		object.pathPoints.forEach((p : Point) => {
			ctx.lineTo(p.x, p.y);
		});

		if (object.stroke) {
			ctx.stroke();
		} else {
			ctx.fill();
		}
		ctx.closePath();
	}

	private drawImage(object : ImageObject, ctx : any) {
		if (!object.image) {
			return;
		}

		const img = new Image();

		if (!object.image.type) {
			img.src = object.image;
		} else if (object.image.type === 'Buffer') {
			img.src = Buffer.from(object.image.data);
		} else {
			throw new Error('Invalid image object passed to drawImage');
		}

		if (!object.width && !object.height) {
			ctx.drawImage(img, object.x, object.y);
		} else if (object.crop) {
			const crop = object.crop;

			if (crop.x === undefined && crop.y === undefined) {
				throw new Error('Please specify the cordinates on the Crop object');
			}
			if ((crop.width === undefined || crop.height === undefined) && (crop.radius === undefined || crop.startAngle === undefined || crop.endAngle === undefined)) {
				throw new Error('Crop object is incomplete');
			}
			if (crop.width !== undefined && crop.height !== undefined && (crop.startAngle !== undefined || crop.endAngle !== undefined || crop.anticlockwise !== undefined)) {
				throw new Error('Crop object must either represent a rectangle or an circle, not both.');
			}

			if (crop.width !== undefined && crop.height !== undefined) {
				ctx.drawImage(img, crop.x, crop.y, crop.width, crop.height, object.x, object.y, object.width, object.height);
			} else {
				ctx.save();
				ctx.beginPath();
				ctx.arc(crop.x, crop.y, crop.radius, crop.startAngle, crop.endAngle, crop.anticlockwise);
				ctx.clip();
				ctx.drawImage(img, object.x, object.y, object.width, object.height);
				ctx.closePath();
				ctx.restore();				
			}
		} else {
			ctx.drawImage(img, object.x, object.y, object.width, object.height);
		}
	}

	private async fetchDrawImage(object : FetchImageObject, ctx: any) {
		if (!object.url) {
			return;
		}

		const resp = await axios({
			method: 'get',
			url: object.url,
			responseType: 'arraybuffer',
		});

		object.image = Buffer.from(resp.data);

		this.drawImage(<ImageObject> object, ctx);
	}
}

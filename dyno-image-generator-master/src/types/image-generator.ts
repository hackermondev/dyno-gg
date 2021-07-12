export interface GeneratorTemplate {
	name: string;
	objects: Renderable[];
	background?: string | { r: number, b: number, g: number, a: number };
	width: number;
	height: number;
}

export enum ObjectType {
	Rectangle,
	Arc,
	Text,
	Line,
	Image,
	FetchImage,
}

export interface Renderable {
	type: ObjectType;
	x: number;
	y: number;
	zIndex?: number;
	style?: string;
	stroke?: boolean;
	lineWidth?: number;
}

export interface TextObject extends Renderable {
	font?: string;
	text: string;
	x: number;
	y: number;
	maxWidth: number;
	stroke?: boolean;
	textAlign?: string;
}

export interface RectangleObject extends Renderable {
	width: number;
	height: number;
}

export interface ArcObject extends Renderable {
	radius: number;
	startAngle: number;
	endAngle: number;
	anticlockwise?: boolean;
}

export class Point {
	public x: number;
	public y: number;

	constructor(x: number, y: number) {
		this.x = x;
		this.y = y;
	}
}

export interface LineObject extends Renderable {
	pathPoints: Point[];
}

export interface CropDimensions {
	x: number;
	y: number;
	width?: number;
	height?: number;
	radius?: number;
	startAngle?: number;
	endAngle?: number;
	anticlockwise?: boolean;
}

export interface ImageObject extends Renderable {
	image?: any;
	width?: number;
	height?: number;
	crop?: CropDimensions;
}

export interface FetchImageObject extends ImageObject {
	url: string;
}

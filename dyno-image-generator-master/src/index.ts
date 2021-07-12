import * as dotenv from 'dotenv';
dotenv.config();

import { hemeraStart } from './hemeraNode';

export { ArcObject } from './types/image-generator';
export { FetchImageObject } from './types/image-generator';
export { GeneratorTemplate } from './types/image-generator';
export { ImageObject } from './types/image-generator';
export { LineObject } from './types/image-generator';
export { ObjectType } from './types/image-generator';
export { Point } from './types/image-generator';
export { RectangleObject } from './types/image-generator';
export { Renderable } from './types/image-generator';
export { TextObject } from './types/image-generator';

hemeraStart();

import * as HemeraJoi from 'hemera-joi';
import { connect as natsConnect } from 'nats';
import * as Hemera from 'nats-hemera';
import {Renderer} from './renderer';

export async function hemeraStart() {
	const natsUrl = process.env.NATS_ADDR || '127.0.0.1';
	const natsPort = process.env.NATS_PORT || '4222';
	const nats = natsConnect({ url: `nats://${natsUrl}:${natsPort}` });
	const hemera = new Hemera(nats, { logLevel: 'info' });
	hemera.use(HemeraJoi);

	hemera.ready(async () => {
		hemera.setOption('payloadValidator', 'hemera-joi');
		const Joi = hemera.joi;

		hemera.add({
			topic: 'image_gen',
			cmd: 'render',
			generatorTemplate: Joi.object().required(),
		}, async (req : any) => {
			const date1 = new Date().getTime();

			const renderer = new Renderer();
			const result = await renderer.render(req.generatorTemplate);

			const date2 = new Date().getTime();
			hemera.log.info(`Render took: ${Math.abs(date2 - date1)} ms`);

			return result;
		});
	});
}

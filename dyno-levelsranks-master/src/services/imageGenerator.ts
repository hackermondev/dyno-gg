// import { GeneratorTemplate } from '@dyno.gg/image-generator';
// import * as nats from 'nats';
// import * as Hemera from 'nats-hemera';
// import { setTimeout } from 'timers';

// const hemera = new Hemera(nats.connect({ url: 'nats://ares.dyno.gg:4222' }), { logLevel: 'info' });

// export async function render(template : GeneratorTemplate) {
// 	return hemera.act({ topic: 'image_gen', cmd: 'render', generatorTemplate: template, timeout$: 60000 });
// }

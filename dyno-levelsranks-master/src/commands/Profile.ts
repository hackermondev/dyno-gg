// import {Command} from '@dyno.gg/dyno-core';
// import * as I from '@dyno.gg/image-generator';
// import * as dyno from 'Dyno';
// import { render } from '../services/imageGenerator';
// import { CropDimensions } from '../../../dyno-image-generator/build/types/image-generator';

// export default class Profile extends Command {
// 	public group        : string   = 'Misc';
// 	public aliases      : string[] = [ 'profile' ];
// 	public description  : string   = 'Renders your profile';
// 	public defaultUsage : string   = 'profile';
// 	public expectedArgs : number   = 0;
// 	public cooldown     : number   = 6000;
// 	public disableDM    : boolean  = false;
// 	public usage        : string   = 'profile';
// 	public example      : string   = 'profile';

// 	public async execute({ message, args, guildConfig }: dyno.CommandData) : Promise<{}> {
// 		try {
// 			const imageBytes = await render(
// 				<I.GeneratorTemplate> {
// 					background: 'grey',
// 					name: 'test',
// 					height: 250,
// 					width: 500,
// 					objects: [
// 						<I.FetchImageObject>
// 						{
// 							x: 0,
// 							y: 0,
// 							height: 250,
// 							width: 500,
// 							url: 'https://cdn.discordapp.com/attachments/325066606923481088/401453996792872970/profilebackground.png',
// 							type: I.ObjectType.FetchImage,
// 						},
// 						<I.FetchImageObject>
// 						{
// 							x: 50,
// 							y: 30,
// 							width: 160,
// 							url: message.author.dynamicAvatarURL('png', 256),
// 							type: I.ObjectType.FetchImage,
// 							crop: <CropDimensions> {
// 								x: 50 + (160 / 2),
// 								y: 30 + (160 / 2),
// 								radius: 160 / 2,
// 								startAngle: 0,
// 								endAngle: Math.PI * 2,
// 							}
// 						},
// 						<I.LineObject>
// 						{
// 							x: 500 / 2,
// 							y: 0 + 10,
// 							lineWidth: 3,
// 							pathPoints: [
// 								<I.Point>
// 								{
// 									x: 500 / 2,
// 									y: 250 - 10,
// 								},
// 							],
// 							style: '#337fd5',
// 							stroke: true,
// 							type: I.ObjectType.Line,
// 						},
// 						<I.TextObject> 
// 						{
// 							x: 10,
// 							y: 230,
// 							maxWidth: 230,
// 							text: `${message.author.username}#${message.author.discriminator}`,
// 							style: 'white',
// 							font: '18px Helvetica',
// 							textAlign: 'center',
// 							type: I.ObjectType.Text,
// 						}
// 					],
// 				},
// 			);
// 			const buff = Buffer.from(imageBytes);
// 			return message.channel.createMessage('', {
// 				file: buff,
// 				name: 'profile.png',
// 			});
// 		} catch (e) {
// 			this.logger.error(e);
// 		}
// 	}
// }

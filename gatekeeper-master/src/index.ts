import { Service } from './Service';

const service = new Service();
/* tslint:disable-next-line:no-floating-promises */
if (!process.argv.includes('--dump-pledges')) {
	service.start();
} else {
	service.dumpPatreons();
}

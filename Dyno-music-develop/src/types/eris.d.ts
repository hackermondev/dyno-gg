import * as eris from 'eris';

declare module 'eris' {
	class Client {
		public voiceConnections: any;
	}
}
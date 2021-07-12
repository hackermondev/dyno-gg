import { Module } from '@dyno.gg/dyno-core';

/**
 * Message Embedder Module
 * @class MessageEmbedder
 * @extends Module
 */
export default class MessageEmbedder extends Module {
	public module     : string  = 'MessageEmbedder';
	public friendlyName: string = 'Message Embedder';
	public description: string  = 'Post and edit managed embeds in any channel!';
	public list       : boolean = true;
	public enabled    : boolean = true;
	public hasPartial : boolean = true;

	public start() {}
}

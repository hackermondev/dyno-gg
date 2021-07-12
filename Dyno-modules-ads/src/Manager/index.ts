import { Module } from '@dyno.gg/dyno-core';
import * as commands from './commands';

/**
 * Manager Module
 * @class Manager
 * @extends Module
 */
export default class Manager extends Module {
	public module     : string  = 'Manager';
	public friendlyName: string = 'Manager';
	public description: string  = 'Adds manager commands to dyno!';
	public core		  : boolean = true;
	public list       : boolean = false;
	public enabled    : boolean = true;
	public hasPartial : boolean = false;
	public commands   : {} = commands;

	public start() {}
}

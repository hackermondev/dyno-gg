export default interface SubCommand {
	name: string;
	desc: string;
	usage: string;
	default?: boolean;
	cooldown?: number;
}

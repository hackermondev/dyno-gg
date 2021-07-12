import * as eris from '@dyno.gg/eris';

const Permissions = eris.Constants.Permissions;

export default class Role {
	private dyno: any;
	private client: eris.Client;
	private guild: eris.Guild;

	constructor(dyno: any, guild: eris.Guild) {
		this.dyno = dyno;
		this.client = dyno.client;
		this.guild = guild;
	}

	public async createRole(options: eris.RoleOptions): Promise<eris.Role> {
		let role;
		try {
			role = await this.client.createRole(this.guild.id, options);
		} catch (err) {
			if (role && role.id) {
				role.delete().catch(() => false);
			}
			return Promise.reject(err);
		}

		return Promise.resolve(role);
	}

	/**
	 * Check if the bot has permissions
	 */
	public hasPermissions(guild: eris.Guild, ...perms: string[]): boolean {
		const clientMember = guild.members.get(this.dyno.userid);
		for (const perm of perms) {
			if (!clientMember.permission || !clientMember.permission.has(perm)) {
				return false;
			}
		}

		return true;
	}

	public getOrCreate(options: eris.RoleOptions): Promise<eris.Role> {
		if (!options || !options.name) {
			return Promise.reject('No role name or invalid options given.');
		}

		if (!this.hasPermissions(this.guild, 'manageRoles', 'manageChannels')) {
			return Promise.reject('Not enough permissions.');
		}

		const role = this.guild.roles.find((r: eris.Role) => r.name === options.name);

		if (role) {
			return Promise.resolve(role);
		}

		return this.createRole(options);
	}

	/**
	 * Verify overwrite permissions are set per channel
	 * @param {Guild} guild Guild to verify
	 */
	public createOverwritePermissions(id: string, channels: eris.GuildChannel[], permissions: string[]) {
		const isRole = this.guild.roles.find((r: eris.Role) => r.id === id) != undefined;
		const type = isRole ? 'role' : 'member';

		for (const channel of channels) {
			if (!channel.permissionOverwrites) {
				continue;
			}
			const overwrite = channel.permissionOverwrites.get(id);
			let needsOverwrite = false;
			let permInt = 0;

			if (overwrite) {
				for (const perm of permissions) {
					if (channel.type === 0 && perm.includes('voice')) {
						continue;
					}
					if (channel.type === 2 && !perm.includes('voice')) {
						continue;
					}

					permInt |= Permissions[perm];

					if (overwrite.json.hasOwnProperty(perm) && overwrite.json[perm] === false) {
						continue;
					}

					needsOverwrite = true;
				}
			} else {
				for (const perm of permissions) {
					if (channel.type === 0 && perm.includes('voice')) {
						continue;
					}
					if (channel.type === 2 && !perm.includes('voice')) {
						continue;
					}

					permInt |= Permissions[perm];
				}

				needsOverwrite = true;
			}

			if (!needsOverwrite) {
				continue;
			}

			channel.editPermission(id, 0, permInt, type).catch(() => false);
		}
	}
}

# Fun commands for Dyno

Commands should always return a promise.

### Subcommands
#### Compromises
The way subcommands are implemented right now prevent you from having a return value for `?command`, instead, we define a default subcommand that will be executed when `?command` is run.

Your execute function for the main command must look like this:
```Javascript
public execute() {
	return Promise.resolve();
}
```

#### How to add
Subcommands can be added like so:
First define the subcommands in the parent command constructor

```Javascript
this.commands = [
  { name: 'list',   desc: 'List the songs in the music queue.',  usage: 'list',   cooldown: 5000, default: true },
  { name: 'remove', desc: 'Remove a song from the music queue.', usage: 'remove', cooldown: 2000 },
];
```
Note that the list subcommand is marked as the default. So when the parent command is ran without any subcommands, that subcommand will be executed.

Afterwards, the default command handler will look into that array and match a function name with the subcommand name.

So for example, for the `list` subcommand, we would add a function on the parent command class with the same name as the subcommand:

```Javascript
async list({ message, args }) {
  //insert awesome command code here
}

async remove({ message, args }) {
  //insert awesome command code here
}
```

The arguments follow the same format as a non-subcommand.

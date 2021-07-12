interface IEnvironment {
	methods: {[key: string]: Function};
	parent: Environment | undefined;
	vars: {[key: string]: any};
	extend(): IEnvironment;
	lookup(name: string): IEnvironment|false;
	getVar(name: string): any;
	hasVar(name: string): any;
	setVar(name: string, value: any): any;
	defVar(name: string, value: any): any;
	getMethod(name: string): any;
	hasMethod(name: string): any;
}

interface IInterpreter {
	env: IEnvironment;
}

interface IExpression {
	type: string;
	[key: string]: any;
}

interface IMethodArgument {
	key: string;
	value: any;
}

interface ExecuteOptions {
	env?: {[key: string]: any};
	[key: string]: any;
}

type unknown = {} | undefined | null | void;
type UnknownObject = {[key: string]: any};
type MethodArgument = string|IMethodArgument;
type MethodArguments = Array<MethodArgument>;
/**
 * apk sub-tool for Alpine Linux package manager
 */

export const apkSchema = {
	name: "apk",
	description: "Alpine Linux APK package manager operations",
	parameters: {
		type: "object",
		properties: {
			command: {
				type: "string",
				description: "The full apk command to execute"
			},
			operation: {
				type: "string",
				description: "Operation: add, del, update, upgrade, search, info, list, fix, cache"
			},
			packages: {
				type: "string",
				description: "Package names (space separated)"
			},
			upgrade: {
				type: "boolean",
				description: "Upgrade all packages"
			},
			available: {
				type: "boolean",
				description: "Show available upgrades"
			},
			search: {
				type: "string",
				description: "Search for package"
			},
			info: {
				type: "string",
				description: "Show package info"
			},
			list: {
				type: "string",
				description: "List: installed, installed_dirs, origin, owned"
			},
			depends: {
				type: "string",
				description: "Show package dependencies"
			},
			belongs: {
				type: "string",
				description: "Find package owning file"
			},
			fix: {
				type: "boolean",
				description: "Fix dependencies"
			},
			cache: {
				type: "boolean",
				description: "Manage cache"
			},
			yes: {
				type: "boolean",
				description: "Assume yes to all"
			},
			verbose: {
				type: "boolean",
				description: "Verbose output"
			},
			version: {
				type: "boolean",
				description: "Show version"
			}
		},
		required: ["command"]
	}
};

export async function executeApk(args: { command?: string; operation?: string; packages?: string; upgrade?: boolean; available?: boolean; search?: string; info?: string; list?: string; depends?: string; belongs?: string; fix?: boolean; cache?: boolean; yes?: boolean; verbose?: boolean; version?: boolean }): Promise<string> {
	const { command, operation, packages, upgrade, available, search, info, list, depends, belongs, fix, cache, yes, verbose, version } = args;
	
	let cmd = "";
	
	if (version) {
		cmd = "apk --version 2>&1";
	} else if (command) {
		cmd = command;
	} else if (!operation && !packages && !search && !info && !list && !upgrade && !cache) {
		return "Error: Please provide an operation (add, del, update, etc.) or use --version to see apk version.";
	} else {
		// Build apk command
		cmd = "apk";
		
		if (yes) cmd += " --yes";
		if (verbose) cmd += " --verbose";
		
		// Add operation
		const op = operation || "list";
		
		if (op === "add" || op === "install") {
			cmd += " add";
			cmd += ` ${packages || ''}`;
		} else if (op === "del" || op === "remove" || op === "rm") {
			cmd += " del";
			cmd += ` ${packages || ''}`;
		} else if (op === "update") {
			cmd += " update";
		} else if (op === "upgrade" || op === "up") {
			cmd += " upgrade";
			if (available) cmd += " --available";
			cmd += ` ${packages || ''}`;
		} else if (op === "search" || op === "se") {
			cmd += ` search ${search || packages || ''}`;
		} else if (op === "info") {
			cmd += ` info ${info || packages || ''}`;
		} else if (op === "list" || op === "ls") {
			cmd += " list";
			if (list === "installed") cmd += " --installed";
			else if (list === "upgrades") cmd += " --upgrades";
			else if (list === "origin") cmd += " --origin";
			else if (list === "installed-dirs") cmd += " --installed-dirs";
			cmd += ` ${packages || ''}`;
		} else if (op === "depends") {
			cmd += ` depends ${depends || packages || ''}`;
		} else if (op === "belongs") {
			cmd += ` belongs ${belongs || packages || ''}`;
		} else if (op === "fix") {
			cmd += " fix";
			cmd += ` ${packages || ''}`;
		} else if (op === "cache") {
			cmd += " cache";
			if (cache) cmd += " clean";
		} else if (op === "index") {
			cmd += " index";
		} else if (op === "fetch") {
			cmd += ` fetch ${packages || ''}`;
		} else if (op === "audit") {
			cmd += " audit";
		} else if (search) {
			cmd += ` search ${search}`;
		} else if (info) {
			cmd += ` info ${info}`;
		} else if (list) {
			cmd += ` list ${list}`;
		} else if (upgrade) {
			cmd += " upgrade";
		} else {
			cmd += ` ${op}`;
			if (packages) cmd += ` ${packages}`;
		}
	}
	
	const { exec } = await import("child_process");
	const { promisify } = await import("util");
	const execAsync = promisify(exec);
	
	try {
		const { stdout, stderr } = await execAsync(cmd, { timeout: 120000 });
		return stdout || stderr;
	} catch (error: any) {
		return `Error: ${error.message}`;
	}
}
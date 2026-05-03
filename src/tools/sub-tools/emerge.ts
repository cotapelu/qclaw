/**
 * emerge sub-tool for Gentoo Linux package manager
 */

export const emergeSchema = {
	name: "emerge",
	description: "Gentoo Portage package manager operations",
	parameters: {
		type: "object",
		properties: {
			command: {
				type: "string",
				description: "The full emerge command to execute"
			},
			operation: {
				type: "string",
				description: "Operation: sync, search, install, remove, update, depclean, autoremove, info"
			},
			packages: {
				type: "string",
				description: "Package names (space separated)"
			},
			world: {
				type: "boolean",
				description: "Use @world set"
			},
			deep: {
				type: "number",
				description: "Deep dependencies"
			},
			newuse: {
				type: "boolean",
				description: "Include changed USE flags"
			},
			search: {
				type: "string",
				description: "Search for package"
			},
			info: {
				type: "string",
				description: "Show package info"
			},
			pretend: {
				type: "boolean",
				description: "Pretend only, don't actually install"
			},
			fetchonly: {
				type: "boolean",
				description: "Only download files, don't install"
			},
			clean: {
				type: "boolean",
				description: "Clean dependencies"
			},
			depclean: {
				type: "boolean",
				description: "Remove unused packages"
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

export async function executeEmerge(args: { command?: string; operation?: string; packages?: string; world?: boolean; deep?: number; newuse?: boolean; search?: string; info?: string; pretend?: boolean; fetchonly?: boolean; clean?: boolean; depclean?: boolean; yes?: boolean; verbose?: boolean; version?: boolean }): Promise<string> {
	const { command, operation, packages, world, deep, newuse, search, info, pretend, fetchonly, clean, depclean, yes, verbose, version } = args;
	
	let cmd = "";
	
	if (version) {
		cmd = "emerge --version 2>&1 | head -3";
	} else if (command) {
		cmd = command;
	} else if (!operation && !packages && !search && !info) {
		return "Error: Please provide an operation (sync, search, install, etc.) or use --version to see emerge version.";
	} else {
		// Build emerge command
		cmd = "emerge";
		
		if (pretend) cmd += " --pretend";
		if (fetchonly) cmd += " --fetchonly";
		if (clean) cmd += " --clean";
		if (depclean) cmd += " --depclean";
		if (yes) cmd += " --yes";
		if (verbose) cmd += " --verbose";
		if (world) cmd += " @world";
		if (deep) cmd += ` --deep=${deep}`;
		if (newuse) cmd += " --newuse";
		
		// Add operation
		const op = operation || "search";
		
		if (op === "sync") {
			cmd += " --sync";
		} else if (op === "search" || op === "se") {
			cmd += ` --search ${search || packages || ''}`;
		} else if (op === "install" || op === "i") {
			cmd += ` ${packages || ''}`;
		} else if (op === "uninstall" || op === "remove" || op === "rm") {
			cmd += ` --unmerge ${packages || ''}`;
		} else if (op === "update" || op === "up") {
			cmd += " --update";
			if (world) cmd += " @world";
			cmd += ` ${packages || ''}`;
		} else if (op === "info") {
			cmd += ` --info ${info || packages || ''}`;
		} else if (op === "world") {
			cmd += " @world";
		} else if (op === "system") {
			cmd += " @system";
		} else if (op === "preserved-rebuild") {
			cmd += " --preserved-rebuild";
		} else if (op === "depclean") {
			cmd += " --depclean";
		} else if (op === "regen") {
			cmd += " --regen";
		} else if (op === "metadata") {
			cmd += " --metadata";
		} else if (search) {
			cmd += ` --search ${search}`;
		} else if (info) {
			cmd += ` --info ${info}`;
		} else {
			cmd += ` ${op}`;
			if (packages) cmd += ` ${packages}`;
		}
	}
	
	const { exec } = await import("child_process");
	const { promisify } = await import("util");
	const execAsync = promisify(exec);
	
	try {
		const { stdout, stderr } = await execAsync(cmd, { timeout: 300000 });
		return stdout || stderr;
	} catch (error: any) {
		return `Error: ${error.message}`;
	}
}
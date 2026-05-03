/**
 * zypper sub-tool for openSUSE package manager
 */

export const zypperSchema = {
	name: "zypper",
	description: "openSUSE Zypper package manager operations",
	parameters: {
		type: "object",
		properties: {
			command: {
				type: "string",
				description: "The full zypper command to execute"
			},
			operation: {
				type: "string",
				description: "Operation: install, remove, update, patch, search, info, list, remove-orphan, clean"
			},
			packages: {
				type: "string",
				description: "Package names (space separated)"
			},
			all: {
				type: "boolean",
				description: "Update all packages"
			},
			security: {
				type: "boolean",
				description: "Security patches only"
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
				description: "List: patches, updates, packages, patterns, products"
			},
			patches: {
				type: "boolean",
				description: "List available patches"
			},
			orphans: {
				type: "boolean",
				description: "Remove orphaned packages"
			},
			clean: {
				type: "boolean",
				description: "Clean cache"
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

export async function executeZypper(args: { command?: string; operation?: string; packages?: string; all?: boolean; security?: boolean; search?: string; info?: string; list?: string; patches?: boolean; orphans?: boolean; clean?: boolean; yes?: boolean; verbose?: boolean; version?: boolean }): Promise<string> {
	const { command, operation, packages, all, security, search, info, list, patches, orphans, clean, yes, verbose, version } = args;
	
	let cmd = "";
	
	if (version) {
		cmd = "zypper --version 2>&1 | head -3";
	} else if (command) {
		cmd = command;
	} else if (!operation && !packages && !search && !info && !list && !patches && !clean) {
		return "Error: Please provide an operation (install, remove, update, etc.) or use --version to see zypper version.";
	} else {
		// Build zypper command
		cmd = "zypper";
		
		if (yes) cmd += " --no-confirm";
		if (verbose) cmd += " -v";
		
		// Add operation
		const op = operation || "list";
		
		if (op === "install" || op === "in") {
			cmd += " in";
			if (security) cmd += " --type patch";
			cmd += ` ${packages || ''}`;
		} else if (op === "remove" || op === "rm" || op === "delete") {
			cmd += " rm";
			cmd += ` ${packages || ''}`;
		} else if (op === "update" || op === "up") {
			cmd += " up";
			if (all) cmd += "";
			if (security) cmd += " --with-optional";
			cmd += ` ${packages || ''}`;
		} else if (op === "patch") {
			cmd += " patch";
			if (security) cmd += " --security";
			if (all) cmd += "";
		} else if (op === "search" || op === "se") {
			cmd += ` se ${search || packages || ''}`;
		} else if (op === "info" || op === "if") {
			cmd += ` if ${info || packages || ''}`;
		} else if (op === "list" || op === "ls") {
			cmd += " ls";
			if (list === "patches") cmd += " patches";
			else if (list === "updates") cmd += " updates";
			else if (list === "packages") cmd += " packages";
			else if (list === "patterns") cmd += " patterns";
			else if (list === "products") cmd += " products";
			else if (patches || list === "available-patches") cmd += " patches";
		} else if (op === "remove-orphan" || op === "rm-orphan") {
			cmd += " rm-orphans";
		} else if (op === "clean") {
			cmd += " clean";
		} else if (op === "dist-upgrade" || op === "dup") {
			cmd += " dup";
			if (all) cmd += "";
		} else if (search) {
			cmd += ` se ${search}`;
		} else if (info) {
			cmd += ` if ${info}`;
		} else if (list) {
			cmd += ` ls ${list}`;
		} else if (clean) {
			cmd += " clean";
		} else {
			cmd += ` ${op}`;
			if (packages) cmd += ` ${packages}`;
		}
	}
	
	const { exec } = await import("child_process");
	const { promisify } = await import("util");
	const execAsync = promisify(exec);
	
	try {
		const { stdout, stderr } = await execAsync(cmd, { timeout: 180000 });
		return stdout || stderr;
	} catch (error: any) {
		return `Error: ${error.message}`;
	}
}
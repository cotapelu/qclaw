/**
 * dnf sub-tool for Fedora/Red Hat package manager
 */

export const dnfSchema = {
	name: "dnf",
	description: "DNF package manager operations for Fedora/RHEL",
	parameters: {
		type: "object",
		properties: {
			command: {
				type: "string",
				description: "The full dnf command to execute"
			},
			operation: {
				type: "string",
				description: "Operation: install, remove, update, upgrade, search, info, list, autoremove, clean"
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
				description: "Security related operations"
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
				description: "List packages: installed, available, updates"
			},
			history: {
				type: "boolean",
				description: "Show transaction history"
			},
			autoremove: {
				type: "boolean",
				description: "Remove unused packages"
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

export async function executeDnf(args: { command?: string; operation?: string; packages?: string; all?: boolean; security?: boolean; search?: string; info?: string; list?: string; history?: boolean; autoremove?: boolean; clean?: boolean; yes?: boolean; verbose?: boolean; version?: boolean }): Promise<string> {
	const { command, operation, packages, all, security, search, info, list, history, autoremove, clean, yes, verbose, version } = args;
	
	let cmd = "";
	
	if (version) {
		cmd = "dnf --version 2>&1 | head -5";
	} else if (command) {
		cmd = command;
	} else if (!operation && !packages && !all && !search && !info && !list && !history && !clean) {
		return "Error: Please provide an operation (install, remove, update, etc.) or use --version to see dnf version.";
	} else {
		// Build dnf command
		cmd = "dnf";
		
		if (yes) cmd += " -y";
		if (verbose) cmd += " -v";
		
		// Add operation
		const op = operation || "list";
		
		if (op === "install" || op === "in") {
			cmd += " install";
			if (security) cmd += " --security";
			cmd += ` ${packages || ''}`;
		} else if (op === "remove" || op === "er" || op === "rm") {
			cmd += " remove";
			cmd += ` ${packages || ''}`;
		} else if (op === "update" || op === "up") {
			cmd += " update";
			if (all) cmd += "";
			if (security) cmd += " --security";
			cmd += ` ${packages || ''}`;
		} else if (op === "upgrade" || op === "distro-sync") {
			cmd += " upgrade";
			if (all) cmd += "";
			cmd += ` ${packages || ''}`;
		} else if (op === "search") {
			cmd += ` search ${search || packages || ''}`;
		} else if (op === "info") {
			cmd += ` info ${info || packages || ''}`;
		} else if (op === "list") {
			cmd += " list";
			if (list === "installed") cmd += " installed";
			else if (list === "available") cmd += " available";
			else if (list === "updates") cmd += " updates";
			else if (list === "extras") cmd += " extras";
			else if (list === "obsoletes") cmd += " obsoletes";
			else if (list === "recent") cmd += " recent";
			cmd += ` ${packages || ''}`;
		} else if (op === "history") {
			cmd += " history";
			if (history) cmd += " list";
		} else if (op === "autoremove") {
			cmd += " autoremove";
		} else if (op === "clean") {
			cmd += " clean all";
		} else if (op === "check-update") {
			cmd += " check-update";
		} else if (op === "provides" || op === "whatprovides") {
			cmd += ` provides ${packages || ''}`;
		} else if (op === "requires" || op === "deptree") {
			cmd += ` requires ${packages || ''}`;
		} else if (search) {
			cmd += ` search ${search}`;
		} else if (info) {
			cmd += ` info ${info}`;
		} else if (list) {
			cmd += ` list ${list}`;
		} else if (clean) {
			cmd += " clean all";
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
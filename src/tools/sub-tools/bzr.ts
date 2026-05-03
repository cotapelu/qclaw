/**
 * bzr (Bazaar) sub-tool for Bazaar version control
 */

export const bzrSchema = {
	name: "bzr",
	description: "Bazaar distributed version control operations",
	parameters: {
		type: "object",
		properties: {
			command: {
				type: "string",
				description: "The full bzr command to execute"
			},
			operation: {
				type: "string",
				description: "Operation: branch, pull, push, commit, status, diff, log, add, remove, merge, update, revert, info, whoami"
			},
			target: {
				type: "string",
				description: "Target file or directory"
			},
			url: {
				type: "string",
				description: "Repository URL"
			},
			revision: {
				type: "string",
				description: "Revision number"
			},
			message: {
				type: "string",
				description: "Commit message"
			},
			author: {
				type: "string",
				description: "Author name"
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

export async function executeBzr(args: { command?: string; operation?: string; target?: string; url?: string; revision?: string; message?: string; author?: string; verbose?: boolean; version?: boolean }): Promise<string> {
	const { command, operation, target, url, revision, message, author, verbose, version } = args;
	
	let cmd = "";
	
	if (version) {
		cmd = "bzr --version 2>&1 | head -3";
	} else if (command) {
		cmd = command;
	} else if (!operation && !target && !url) {
		return "Error: Please provide an operation (branch, commit, status, etc.) or use --version to see bzr version.";
	} else {
		// Build bzr command
		cmd = "bzr";
		
		if (verbose) cmd += " -v";
		
		// Add operation
		const op = operation || "status";
		
		if (op === "branch") {
			cmd += ` branch`;
			if (revision) cmd += ` -r ${revision}`;
			cmd += ` '${url || 'REPO_URL'}'`;
			cmd += ` ${target || '.'}`;
		} else if (op === "pull") {
			cmd += ` pull`;
			if (url) cmd += ` ${url}`;
			if (revision) cmd += ` -r ${revision}`;
		} else if (op === "push") {
			cmd += ` push`;
			if (url) cmd += ` ${url}`;
			if (revision) cmd += ` -r ${revision}`;
		} else if (op === "commit" || op === "ci") {
			cmd += ` commit`;
			if (message) cmd += ` -m '${message}'`;
			if (author) cmd += ` --author '${author}'`;
			cmd += ` ${target || '.'}`;
		} else if (op === "status" || op === "st") {
			cmd += ` status`;
			cmd += ` ${target || '.'}`;
		} else if (op === "diff") {
			cmd += ` diff`;
			if (revision) cmd += ` -r ${revision}`;
			cmd += ` ${target || '.'}`;
		} else if (op === "log") {
			cmd += ` log`;
			if (revision) cmd += ` -r ${revision}`;
			cmd += ` ${target || '.'}`;
		} else if (op === "add") {
			cmd += ` add`;
			cmd += ` ${target || '.'}`;
		} else if (op === "remove" || op === "rm") {
			cmd += ` remove`;
			cmd += ` ${target || '.'}`;
		} else if (op === "merge") {
			cmd += ` merge`;
			if (url) cmd += ` ${url}`;
			if (revision) cmd += ` -r ${revision}`;
		} else if (op === "update" || op === "up") {
			cmd += ` update`;
			if (revision) cmd += ` -r ${revision}`;
		} else if (op === "revert") {
			cmd += ` revert`;
			if (revision) cmd += ` -r ${revision}`;
			cmd += ` ${target || '.'}`;
		} else if (op === "info") {
			cmd += ` info`;
			cmd += ` ${target || '.'}`;
		} else if (op === "whoami") {
			cmd += ` whoami`;
			if (author) cmd += ` '${author}'`;
		} else if (op === "init") {
			cmd += ` init`;
			cmd += ` ${target || '.'}`;
		} else if (op === "checkout" || op === "co") {
			cmd += ` checkout`;
			if (revision) cmd += ` -r ${revision}`;
			if (url) cmd += ` ${url}`;
			cmd += ` ${target || '.'}`;
		} else {
			cmd += ` ${op}`;
			if (target) cmd += ` ${target}`;
		}
	}
	
	const { exec } = await import("child_process");
	const { promisify } = await import("util");
	const execAsync = promisify(exec);
	
	try {
		const { stdout, stderr } = await execAsync(cmd, { timeout: 60000 });
		return stdout || stderr;
	} catch (error: any) {
		return `Error: ${error.message}`;
	}
}
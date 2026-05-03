/**
 * svn sub-tool for Subversion version control
 */

export const svnSchema = {
	name: "svn",
	description: "Subversion version control operations",
	parameters: {
		type: "object",
		properties: {
			command: {
				type: "string",
				description: "The full svn command to execute"
			},
			operation: {
				type: "string",
				description: "Operation: checkout, update, commit, status, diff, log, add, delete, info, list"
			},
			target: {
				type: "string",
				description: "Target file or directory"
			},
			url: {
				type: "string",
				description: "SVN repository URL"
			},
			revision: {
				type: "string",
				description: "Revision number or range"
			},
			message: {
				type: "string",
				description: "Commit message"
			},
			username: {
				type: "string",
				description: "SVN username"
			},
			password: {
				type: "string",
				description: "SVN password"
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

export async function executeSvn(args: { command?: string; operation?: string; target?: string; url?: string; revision?: string; message?: string; username?: string; password?: string; verbose?: boolean; version?: boolean }): Promise<string> {
	const { command, operation, target, url, revision, message, username, password, verbose, version } = args;
	
	let cmd = "";
	
	if (version) {
		cmd = "svn --version 2>&1 | head -3";
	} else if (command) {
		cmd = command;
	} else if (!operation && !target && !url) {
		return "Error: Please provide an operation (checkout, update, commit, status, etc.) or use --version to see svn version.";
	} else {
		// Build svn command
		cmd = "svn";
		
		// Add authentication
		if (username) cmd += ` --username ${username}`;
		if (password) cmd += ` --password ${password}`;
		if (verbose) cmd += " -v";
		
		// Add operation
		const op = operation || "status";
		
		if (op === "checkout" || op === "co") {
			cmd += ` checkout`;
			if (revision) cmd += ` -r ${revision}`;
			cmd += ` '${url || 'REPO_URL'}'`;
			cmd += ` ${target || '.'}`;
		} else if (op === "update" || op === "up") {
			cmd += ` update`;
			if (revision) cmd += ` -r ${revision}`;
			cmd += ` ${target || '.'}`;
		} else if (op === "commit" || op === "ci") {
			cmd += ` commit`;
			if (message) cmd += ` -m '${message}'`;
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
		} else if (op === "delete" || op === "del" || op === "remove") {
			cmd += ` delete`;
			cmd += ` ${target || '.'}`;
		} else if (op === "info") {
			cmd += ` info`;
			cmd += ` ${target || '.'}`;
		} else if (op === "list" || op === "ls") {
			cmd += ` list`;
			if (url) cmd += ` '${url}'`;
			else cmd += ` ${target || '.'}`;
		} else if (op === "revert") {
			cmd += ` revert`;
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
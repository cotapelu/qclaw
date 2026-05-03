/**
 * hg (Mercurial) sub-tool for Mercurial version control
 */

export const hgSchema = {
	name: "hg",
	description: "Mercurial version control operations",
	parameters: {
		type: "object",
		properties: {
			command: {
				type: "string",
				description: "The full hg command to execute"
			},
			operation: {
				type: "string",
				description: "Operation: clone, pull, push, update, status, diff, log, commit, add, remove, branch, heads, tags"
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
				description: "Revision number or hash"
			},
			message: {
				type: "string",
				description: "Commit message"
			},
			branch: {
				type: "string",
				description: "Branch name"
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

export async function executeHg(args: { command?: string; operation?: string; target?: string; url?: string; revision?: string; message?: string; branch?: string; verbose?: boolean; version?: boolean }): Promise<string> {
	const { command, operation, target, url, revision, message, branch, verbose, version } = args;
	
	let cmd = "";
	
	if (version) {
		cmd = "hg --version 2>&1 | head -3";
	} else if (command) {
		cmd = command;
	} else if (!operation && !target && !url) {
		return "Error: Please provide an operation (clone, pull, push, status, etc.) or use --version to see hg version.";
	} else {
		// Build hg command
		cmd = "hg";
		
		if (verbose) cmd += " -v";
		
		// Add operation
		const op = operation || "status";
		
		if (op === "clone") {
			cmd += ` clone`;
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
		} else if (op === "update" || op === "checkout" || op === "co") {
			cmd += ` update`;
			if (revision) cmd += ` -r ${revision}`;
			if (branch) cmd += ` -b ${branch}`;
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
			if (branch) cmd += ` -b ${branch}`;
			cmd += ` ${target || '.'}`;
		} else if (op === "commit" || op === "ci") {
			cmd += ` commit`;
			if (message) cmd += ` -m '${message}'`;
			cmd += ` ${target || '.'}`;
		} else if (op === "add") {
			cmd += ` add`;
			cmd += ` ${target || '.'}`;
		} else if (op === "remove" || op === "rm") {
			cmd += ` remove`;
			cmd += ` ${target || '.'}`;
		} else if (op === "branch") {
			cmd += ` branch`;
			if (branch) cmd += ` ${branch}`;
		} else if (op === "heads") {
			cmd += ` heads`;
			if (branch) cmd += ` -b ${branch}`;
		} else if (op === "tags") {
			cmd += ` tags`;
		} else if (op === "incoming" || op === "in") {
			cmd += ` incoming`;
			if (url) cmd += ` ${url}`;
		} else if (op === "outgoing" || op === "out") {
			cmd += ` outgoing`;
			if (url) cmd += ` ${url}`;
		} else if (op === "rollback") {
			cmd += ` rollback`;
		} else if (op === "revert") {
			cmd += ` revert`;
			if (revision) cmd += ` -r ${revision}`;
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
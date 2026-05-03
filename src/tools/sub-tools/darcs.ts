/**
 * darcs sub-tool for Darcs version control
 */

export const darcsSchema = {
	name: "darcs",
	description: "Darcs distributed version control operations",
	parameters: {
		type: "object",
		properties: {
			command: {
				type: "string",
				description: "The full darcs command to execute"
			},
			operation: {
				type: "string",
				description: "Operation: clone, pull, push, get, apply, record, amend, status, diff, log, add, remove, tag, optimize"
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
				description: "Patch or tag name"
			},
			message: {
				type: "string",
				description: "Patch message"
			},
			author: {
				type: "string",
				description: "Author name/email"
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

export async function executeDarcs(args: { command?: string; operation?: string; target?: string; url?: string; revision?: string; message?: string; author?: string; verbose?: boolean; version?: boolean }): Promise<string> {
	const { command, operation, target, url, revision, message, author, verbose, version } = args;
	
	let cmd = "";
	
	if (version) {
		cmd = "darcs --version 2>&1";
	} else if (command) {
		cmd = command;
	} else if (!operation && !target && !url) {
		return "Error: Please provide an operation (clone, pull, push, record, etc.) or use --version to see darcs version.";
	} else {
		// Build darcs command
		cmd = "darcs";
		
		if (verbose) cmd += " -v";
		
		// Add operation
		const op = operation || "status";
		
		if (op === "clone" || op === "get") {
			cmd += ` get`;
			if (revision) cmd += ` -t ${revision}`;
			cmd += ` '${url || 'REPO_URL'}'`;
			cmd += ` ${target || '.'}`;
		} else if (op === "pull") {
			cmd += ` pull`;
			if (url) cmd += ` ${url}`;
			if (revision) cmd += ` -t ${revision}`;
		} else if (op === "push") {
			cmd += ` push`;
			if (url) cmd += ` ${url}`;
			if (revision) cmd += ` -t ${revision}`;
		} else if (op === "apply") {
			cmd += ` apply`;
			if (url) cmd += ` ${url}`;
			if (revision) cmd += ` -t ${revision}`;
		} else if (op === "record" || op === "commit" || op === "ci") {
			cmd += ` record`;
			if (message) cmd += ` -m '${message}'`;
			if (author) cmd += ` --author '${author}'`;
			cmd += ` ${target || '.'}`;
		} else if (op === "amend") {
			cmd += ` amend`;
			if (message) cmd += ` -m '${message}'`;
			if (author) cmd += ` --author '${author}'`;
		} else if (op === "status" || op === "st") {
			cmd += ` status`;
			cmd += ` ${target || '.'}`;
		} else if (op === "diff") {
			cmd += ` diff`;
			if (revision) cmd += ` -t ${revision}`;
			cmd += ` ${target || '.'}`;
		} else if (op === "log") {
			cmd += ` log`;
			if (revision) cmd += ` -t ${revision}`;
			cmd += ` ${target || '.'}`;
		} else if (op === "add") {
			cmd += ` add`;
			cmd += ` ${target || '.'}`;
		} else if (op === "remove" || op === "rm") {
			cmd += ` remove`;
			cmd += ` ${target || '.'}`;
		} else if (op === "tag") {
			cmd += ` tag`;
			if (revision) cmd += ` ${revision}`;
		} else if (op === "optimize") {
			cmd += ` optimize`;
		} else if (op === "what") {
			cmd += ` whatsnew`;
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
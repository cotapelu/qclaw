/**
 * fossil sub-tool for Fossil version control
 */

export const fossilSchema = {
	name: "fossil",
	description: "Fossil distributed version control operations",
	parameters: {
		type: "object",
		properties: {
			command: {
				type: "string",
				description: "The full fossil command to execute"
			},
			operation: {
				type: "string",
				description: "Operation: clone, open, pull, push, commit, status, diff, log, add, rm, undo, timeline, branch, tag, merge, update"
			},
			target: {
				type: "string",
				description: "Target file, directory or repository"
			},
			url: {
				type: "string",
				description: "Repository URL"
			},
			revision: {
				type: "string",
				description: "Version or tag"
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

export async function executeFossil(args: { command?: string; operation?: string; target?: string; url?: string; revision?: string; message?: string; branch?: string; verbose?: boolean; version?: boolean }): Promise<string> {
	const { command, operation, target, url, revision, message, branch, verbose, version } = args;
	
	let cmd = "";
	
	if (version) {
		cmd = "fossil --version 2>&1";
	} else if (command) {
		cmd = command;
	} else if (!operation && !target && !url) {
		return "Error: Please provide an operation (clone, commit, status, etc.) or use --version to see fossil version.";
	} else {
		// Build fossil command
		cmd = "fossil";
		
		if (verbose) cmd += " -v";
		
		// Add operation
		const op = operation || "status";
		
		if (op === "clone") {
			cmd += ` clone`;
			cmd += ` '${url || 'REPO_URL'}'`;
			cmd += ` ${target || 'repo.fossil'}`;
		} else if (op === "open") {
			cmd += ` open`;
			if (revision) cmd += ` -r ${revision}`;
			if (branch) cmd += ` --branch ${branch}`;
			cmd += ` ${target || 'repo.fossil'}`;
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
			if (branch) cmd += ` --branch ${branch}`;
		} else if (op === "status" || op === "st") {
			cmd += ` status`;
		} else if (op === "diff") {
			cmd += ` diff`;
			if (revision) cmd += ` -r ${revision}`;
			cmd += ` ${target || '.'}`;
		} else if (op === "log") {
			cmd += ` log`;
			if (revision) cmd += ` -r ${revision}`;
			if (branch) cmd += ` -b`;
			cmd += ` ${target || '.'}`;
		} else if (op === "add") {
			cmd += ` add`;
			cmd += ` ${target || '.'}`;
		} else if (op === "rm" || op === "remove" || op === "delete") {
			cmd += ` rm`;
			cmd += ` ${target || '.'}`;
		} else if (op === "undo") {
			cmd += ` undo`;
		} else if (op === "timeline" || op === "timeline") {
			cmd += ` timeline`;
			if (branch) cmd += ` -b ${branch}`;
		} else if (op === "branch") {
			cmd += ` branch`;
			if (branch) cmd += ` ${branch}`;
		} else if (op === "tag") {
			cmd += ` tag`;
			if (revision) cmd += ` add ${revision}`;
		} else if (op === "merge") {
			cmd += ` merge`;
			if (revision) cmd += ` ${revision}`;
		} else if (op === "update" || op === "up") {
			cmd += ` update`;
			if (revision) cmd += ` ${revision}`;
		} else if (op === "checkout" || op === "co") {
			cmd += ` checkout`;
			if (revision) cmd += ` ${revision}`;
		} else if (op === "ui" || op === "server") {
			cmd += ` ui`;
			if (url) cmd += ` ${url}`;
		} else if (op === "info") {
			cmd += ` info`;
			if (target) cmd += ` ${target}`;
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
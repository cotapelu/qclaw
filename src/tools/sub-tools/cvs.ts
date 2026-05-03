/**
 * cvs sub-tool for CVS version control
 */

export const cvsSchema = {
	name: "cvs",
	description: "CVS version control operations",
	parameters: {
		type: "object",
		properties: {
			command: {
				type: "string",
				description: "The full cvs command to execute"
			},
			operation: {
				type: "string",
				description: "Operation: checkout, update, commit, status, diff, log, add, remove, tag, rtag, import"
			},
			target: {
				type: "string",
				description: "Target file or directory"
			},
			module: {
				type: "string",
				description: "CVS module"
			},
			revision: {
				type: "string",
				description: "Revision number"
			},
			message: {
				type: "string",
				description: "Commit message"
			},
			repository: {
				type: "string",
				description: "Repository path"
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

export async function executeCvs(args: { command?: string; operation?: string; target?: string; module?: string; revision?: string; message?: string; repository?: string; verbose?: boolean; version?: boolean }): Promise<string> {
	const { command, operation, target, module, revision, message, repository, verbose, version } = args;
	
	let cmd = "";
	
	if (version) {
		cmd = "cvs --version 2>&1 | head -5";
	} else if (command) {
		cmd = command;
	} else if (!operation && !target && !module) {
		return "Error: Please provide an operation (checkout, commit, update, etc.) or use --version to see cvs version.";
	} else {
		// Build cvs command
		cmd = "cvs";
		
		if (verbose) cmd += " -v";
		
		// Add operation
		const op = operation || "status";
		
		if (op === "checkout" || op === "co") {
			cmd += ` checkout`;
			if (revision) cmd += ` -r ${revision}`;
			cmd += ` ${module || 'MODULENAME'}`;
		} else if (op === "update" || op === "up") {
			cmd += ` update`;
			if (revision) cmd += ` -r ${revision}`;
			cmd += ` ${target || '.'}`;
		} else if (op === "commit" || op === "ci") {
			cmd += ` commit`;
			if (message) cmd += ` -m '${message}'`;
			cmd += ` ${target || '.'}`;
		} else if (op === "status") {
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
		} else if (op === "remove" || op === "rm" || op === "delete") {
			cmd += ` remove`;
			cmd += ` ${target || '.'}`;
		} else if (op === "tag") {
			cmd += ` tag`;
			if (revision) cmd += ` -r ${revision}`;
			cmd += ` ${target || 'TAGNAME'}`;
		} else if (op === "rtag") {
			cmd += ` rtag`;
			if (revision) cmd += ` -r ${revision}`;
			cmd += ` ${module || 'TAGNAME'}`;
		} else if (op === "import") {
			cmd += ` import`;
			if (message) cmd += ` -m '${message}'`;
			cmd += ` ${repository || 'REPO'} ${module || 'vendor'} ${'initial'}`;
		} else if (op === "export") {
			cmd += ` export`;
			if (revision) cmd += ` -r ${revision}`;
			cmd += ` -d ${target || 'DIR'} ${module || 'MODULENAME'}`;
		} else if (op === "history") {
			cmd += ` history`;
			cmd += ` ${target || '.'}`;
		} else if (op === "annotate") {
			cmd += ` annotate`;
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
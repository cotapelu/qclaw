/**
 * xz sub-tool for XZ compression
 */

export const xzSchema = {
	name: "xz",
	description: "Compress and decompress files using XZ utils",
	parameters: {
		type: "object",
		properties: {
			command: {
				type: "string",
				description: "The full xz command to execute"
			},
			files: {
				type: "string",
				description: "Files to compress (space separated)"
			},
			decompress: {
				type: "string",
				description: "File to decompress"
			},
			output: {
				type: "string",
				description: "Output file name"
			},
			level: {
				type: "number",
				description: "Compression level (0-9)"
			},
			keep: {
				type: "boolean",
				description: "Keep (don't delete) input files"
			},
			force: {
				type: "boolean",
				description: "Force overwrite output"
			},
			test: {
				type: "boolean",
				description: "Test integrity of compressed file"
			},
			list: {
				type: "boolean",
				description: "List information about .xz files"
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

export async function executeXz(args: { command?: string; files?: string; decompress?: string; output?: string; level?: number; keep?: boolean; force?: boolean; test?: boolean; list?: boolean; verbose?: boolean; version?: boolean }): Promise<string> {
	const { command, files, decompress, output, level, keep, force, test, list, verbose, version } = args;
	
	let cmd = "";
	
	if (version) {
		cmd = "xz --version 2>&1 | head -3";
	} else if (command) {
		cmd = command;
	} else if (decompress || test || list) {
		// Decompress, test or list mode
		if (test) {
			cmd = `xz -t '${decompress || files || 'file.xz'}'`;
		} else if (list) {
			cmd = `xz -l ${verbose ? '-v' : ''} '${decompress || files || 'file.xz'}'`;
		} else {
			// Decompress
			cmd = "xz -d";
			if (keep) cmd += " -k";
			if (force) cmd += " -f";
			if (output) cmd += ` -c ${output}`;
			cmd += ` '${decompress || files || 'file.xz'}'`;
		}
	} else if (files) {
		// Compress mode
		cmd = "xz";
		
		if (level) cmd += ` -${level}`;
		if (keep !== false) cmd += " -k";  // keep input by default
		if (force) cmd += " -f";
		if (verbose) cmd += " -v";
		if (output) cmd += ` -c ${output}`;
		
		cmd += ` ${files}`;
	} else {
		return "Error: Please provide files to compress or file to decompress. Use --version to see xz version.";
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
/**
 * zip/unzip sub-tool for ZIP archive operations
 */

export const zipSchema = {
	name: "zip",
	description: "Create and extract ZIP archives using zip and unzip",
	parameters: {
		type: "object",
		properties: {
			command: {
				type: "string",
				description: "The full zip/unzip command to execute"
			},
			tool: {
				type: "string",
				description: "Which tool: 'zip' or 'unzip'"
			},
			files: {
				type: "string",
				description: "Files or directories to archive (space separated)"
			},
			archive: {
				type: "string",
				description: "Archive file name"
			},
			extract: {
				type: "string",
				description: "Archive file to extract"
			},
			output_dir: {
				type: "string",
				description: "Output directory for extraction"
			},
			password: {
				type: "string",
				description: "Password for encrypted archive"
			},
			list: {
				type: "boolean",
				description: "List archive contents"
			},
			verbose: {
				type: "boolean",
				description: "Verbose output"
			},
			recurse: {
				type: "boolean",
				description: "Recurse into directories"
			},
			version: {
				type: "boolean",
				description: "Show version"
			}
		},
		required: ["command"]
	}
};

export async function executeZip(args: { command?: string; tool?: string; files?: string; archive?: string; extract?: string; output_dir?: string; password?: string; list?: boolean; verbose?: boolean; recurse?: boolean; version?: boolean }): Promise<string> {
	const { command, tool, files, archive, extract, output_dir, password, list, verbose, recurse, version } = args;
	
	let cmd = "";
	
	if (version) {
		cmd = "echo '=== zip ===' && zip -v 2>&1 | head -2; echo '=== unzip ===' && unzip -v 2>&1 | head -2";
	} else if (command) {
		cmd = command;
	} else if (extract || list) {
		// Extract or list mode
		const selectedTool = tool || "unzip";
		
		if (selectedTool === "unzip") {
			cmd = "unzip";
			
			if (output_dir) cmd += ` -d ${output_dir}`;
			if (password) cmd += ` -P ${password}`;
			if (verbose) cmd += " -v";
			if (list) cmd += " -l";
			
			cmd += ` '${extract || archive || 'archive.zip'}'`;
		} else {
			// zip can't extract, just list
			cmd = `zipinfo '${extract || archive || 'archive.zip'}'`;
		}
	} else if (archive || files) {
		// Create mode
		const selectedTool = tool || "zip";
		
		if (selectedTool === "zip") {
			cmd = "zip";
			
			if (recurse !== false) cmd += " -r";
			if (verbose) cmd += " -v";
			if (password) cmd += ` -P ${password}`;
			
			const archiveName = archive || "archive.zip";
			cmd += ` ${archiveName}`;
			cmd += ` ${files || "."}`;
		} else {
			cmd = `unzip -l '${archive || 'archive.zip'}'`;
		}
	} else {
		return "Error: Please provide files to archive or archive to extract. Use --version to see versions.";
	}
	
	const { exec } = await import("child_process");
	const { promisify } = await import("util");
	const execAsync = promisify(exec);
	
	try {
		const { stdout, stderr } = await execAsync(cmd, { timeout: 120000 });
		return stdout || stderr;
	} catch (error: any) {
		return `Error: ${error.message}`;
	}
}
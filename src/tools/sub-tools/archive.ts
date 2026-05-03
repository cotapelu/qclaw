/**
 * archive (tar/gzip/bzip2) sub-tool for archive operations
 */

export const archiveSchema = {
	name: "archive",
	description: "Create and extract archives using tar, gzip, bzip2",
	parameters: {
		type: "object",
		properties: {
			command: {
				type: "string",
				description: "The full archive command to execute"
			},
			tool: {
				type: "string",
				description: "Which tool: 'tar', 'gzip', 'bzip2'"
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
			compress: {
				type: "string",
				description: "Compression: gzip, bzip2, xz, none"
			},
			list: {
				type: "boolean",
				description: "List archive contents"
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

export async function executeArchive(args: { command?: string; tool?: string; files?: string; archive?: string; extract?: string; output_dir?: string; compress?: string; list?: boolean; verbose?: boolean; version?: boolean }): Promise<string> {
	const { command, tool, files, archive, extract, output_dir, compress: compressArg, list, verbose, version } = args;
	let compress = compressArg;
	
	let cmd = "";
	
	if (version) {
		cmd = "echo '=== tar ===' && tar --version 2>&1 | head -1; echo '=== gzip ===' && gzip --version 2>&1 | head -1; echo '=== bzip2 ===' && bzip2 --version 2>&1 | head -1";
	} else if (command) {
		cmd = command;
	} else if (extract) {
		// Extract mode
		const selectedTool = tool || "tar";
		
		if (selectedTool === "tar") {
			cmd = "tar";
			if (output_dir) cmd += ` -C ${output_dir}`;
			if (verbose) cmd += " -v";
			cmd += ` -xf '${extract}'`;
		} else if (selectedTool === "gzip") {
			cmd = `gunzip ${verbose ? '-v' : ''} '${extract}'`;
		} else if (selectedTool === "bzip2") {
			cmd = `bunzip2 ${verbose ? '-v' : ''} '${extract}'`;
		}
	} else if (archive || files) {
		// Create mode
		const selectedTool = tool || "tar";
		
		if (selectedTool === "tar") {
			cmd = "tar";
			
			if (!compress) compress = "gzip";
			
			if (compress === "gzip") cmd += " -czf";
			else if (compress === "bzip2") cmd += " -cjf";
			else if (compress === "xz") cmd += " -cJf";
			else cmd += " -cf";  // no compression
			
			if (verbose) cmd += "v";
			
			const archiveName = archive || "archive.tar" + (compress === "gzip" ? ".gz" : compress === "bzip2" ? ".bz2" : compress === "xz" ? ".xz" : "");
			cmd += ` ${archiveName}`;
			cmd += ` ${files || "."}`;
		} else if (selectedTool === "gzip") {
			cmd = `gzip ${verbose ? '-v' : ''} ${files || ''}`;
		} else if (selectedTool === "bzip2") {
			cmd = `bzip2 ${verbose ? '-v' : ''} ${files || ''}`;
		}
	} else if (list) {
		cmd = `tar -tf '${archive || extract || 'archive.tar'}'`;
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
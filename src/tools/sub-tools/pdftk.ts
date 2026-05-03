/**
 * pdftk/qpdf sub-tool for PDF manipulation
 */

export const pdftkSchema = {
	name: "pdftk",
	description: "Manipulate PDF files using pdftk or qpdf",
	parameters: {
		type: "object",
		properties: {
			command: {
				type: "string",
				description: "The full pdftk/qpdf command to execute"
			},
			tool: {
				type: "string",
				description: "Which tool: 'pdftk' or 'qpdf'"
			},
			input: {
				type: "string",
				description: "Input PDF file"
			},
			output: {
				type: "string",
				description: "Output PDF file"
			},
			operation: {
				type: "string",
				description: "Operation: info, burst, merge, split, rotate, dump, uncompress, compress"
			},
			pages: {
				type: "string",
				description: "Page range (e.g., '1-5', '1,3,5', 'end')"
			},
			rotate: {
				type: "string",
				description: "Rotation: '90', '180', '270' or 'down' (180 degrees)"
			},
			password: {
				type: "string",
				description: "Password for encrypted PDF"
			},
			flatten: {
				type: "boolean",
				description: "Flatten form fields"
			},
			compress: {
				type: "boolean",
				description: "Compress output"
			},
			version: {
				type: "boolean",
				description: "Show version"
			}
		},
		required: ["command"]
	}
};

export async function executePdftk(args: { command?: string; tool?: string; input?: string; output?: string; operation?: string; pages?: string; rotate?: string; password?: string; flatten?: boolean; compress?: boolean; version?: boolean }): Promise<string> {
	const { command, tool, input, output, operation, pages, rotate, password, flatten, compress, version } = args;
	
	let cmd = "";
	
	if (version) {
		cmd = "echo '=== pdftk ===' && pdftk --version 2>&1 | head -3; echo '=== qpdf ===' && qpdf --version 2>&1 | head -3";
	} else if (command) {
		cmd = command;
	} else if (!input) {
		return "Error: Please provide an input PDF file. Use --version to see versions.";
	} else {
		const selectedTool = tool || "pdftk";
		
		if (selectedTool === "qpdf") {
			// qpdf commands
			cmd = "qpdf";
			
			if (operation === "info") {
				cmd += ` --show-info ${input}`;
			} else if (operation === "uncompress") {
				cmd += ` --object-streams=disable ${input} ${output || 'output.pdf'}`;
			} else if (operation === "compress") {
				cmd += ` --object-streams=preserve ${input} ${output || 'output.pdf'}`;
			} else if (operation === "split") {
				cmd += ` --split-pages ${input} ${output || 'page_%04d.pdf'}`;
			} else if (pages) {
				cmd += ` --page=${pages} ${input} ${output || 'output.pdf'}`;
			} else if (rotate) {
				cmd += ` --rotate-pages=${rotate} ${input} ${output || 'output.pdf'}`;
			} else {
				cmd += ` ${input} ${output || 'output.pdf'}`;
			}
		} else {
			// pdftk commands
			cmd = "pdftk";
			
			if (operation === "info") {
				cmd += ` ${input} dump_data`;
			} else if (operation === "burst") {
				cmd += ` ${input} burst`;
			} else if (operation === "merge" || (pages && output)) {
				// Extract and merge
				cmd += ` ${input}`;
				if (pages) cmd += ` cat ${pages}`;
				cmd += ` output ${output || 'output.pdf'}`;
			} else if (rotate) {
				cmd += ` ${input} cat ${pages || '1-end'} ${rotate} output ${output || 'output.pdf'}`;
			} else if (flatten) {
				cmd += ` ${input} flatten output ${output || 'output.pdf'}`;
			} else {
				cmd += ` ${input} cat output ${output || 'output.pdf'}`;
			}
		}
		
		if (compress) cmd += " compress";
		if (password) cmd += ` user_password=${password}`;
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
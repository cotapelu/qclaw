/**
 * enscript/a2ps sub-tool for text to PostScript conversion
 */

export const enscriptSchema = {
	name: "enscript",
	description: "Convert text files to PostScript using enscript or a2ps",
	parameters: {
		type: "object",
		properties: {
			command: {
				type: "string",
				description: "The full enscript/a2ps command to execute"
			},
			tool: {
				type: "string",
				description: "Which tool: 'enscript' or 'a2ps'"
			},
			input: {
				type: "string",
				description: "Input text file"
			},
			output: {
				type: "string",
				description: "Output file (default: output.ps)"
			},
			format: {
				type: "string",
				description: "Output format: ps, ps2, pdf, etc."
			},
			font: {
				type: "string",
				description: "Font (e.g., 'Courier', 'Helvetica')"
			},
			font_size: {
				type: "number",
				description: "Font size (default: 10)"
			},
			columns: {
				type: "number",
				description: "Number of columns (for a2ps)"
			},
			landscape: {
				type: "boolean",
				description: "Use landscape orientation"
			},
			page_size: {
				type: "string",
				description: "Page size (a4, letter, etc.)"
			},
			header: {
				type: "string",
				description: "Header string"
			},
			version: {
				type: "boolean",
				description: "Show version"
			}
		},
		required: ["command"]
	}
};

export async function executeEnscript(args: { command?: string; tool?: string; input?: string; output?: string; format?: string; font?: string; font_size?: number; columns?: number; landscape?: boolean; page_size?: string; header?: string; version?: boolean }): Promise<string> {
	const { command, tool, input, output, format, font, font_size, columns, landscape, page_size, header, version } = args;
	
	let cmd = "";
	
	if (version) {
		cmd = "echo '=== enscript ===' && enscript --version 2>&1 | head -2; echo '=== a2ps ===' && a2ps --version 2>&1 | head -2";
	} else if (command) {
		cmd = command;
	} else if (!input) {
		return "Error: Please provide an input file. Use --version to see versions.";
	} else {
		const selectedTool = tool || "enscript";
		
		if (selectedTool === "a2ps") {
			// a2ps commands
			cmd = "a2ps";
			
			if (columns) cmd += ` --columns=${columns}`;
			if (landscape) cmd += " --landscape";
			else cmd += " --portrait";
			if (page_size) cmd += ` --medium=${page_size}`;
			if (font) cmd += ` --font=${font}`;
			if (font_size) cmd += ` -s${font_size}`;
			if (header) cmd += ` --header='${header}'`;
			if (output) cmd += ` -o ${output}`;
			
			cmd += ` '${input}'`;
		} else {
			// enscript commands
			cmd = "enscript";
			
			if (font) cmd += ` -f${font}`;
			if (font_size) cmd += ` -r${font_size}`;  // actually point size
			if (landscape) cmd += " -R";  // landscape (rotated)
			if (page_size) cmd += ` --media=${page_size}`;
			if (header) cmd += ` --header='${header}'`;
			if (format === "pdf") {
				cmd += " --pdf";
			} else if (format) {
				cmd += ` -O ${format}`;
			}
			if (output) cmd += ` -o ${output}`;
			
			cmd += ` '${input}'`;
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
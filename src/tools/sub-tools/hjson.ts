/**
 * hjson sub-tool for HJSON processing
 */

export const hjsonSchema = {
	name: "hjson",
	description: "Process and convert HJSON files using hjson tool",
	parameters: {
		type: "object",
			"properties": {
			command: {
				type: "string",
				description: "The full hjson command to execute"
			},
			input: {
				type: "string",
				description: "Input HJSON/JSON file"
			},
			output: {
				type: "string",
				description: "Output file"
			},
			format: {
				type: "string",
				description: "Output format: json, yaml, hjson"
			},
			indent: {
				type: "number",
				description: "Indentation spaces"
			},
			quote_keys: {
				type: "boolean",
				description: "Quote all keys"
			},
			version: {
				type: "boolean",
				description: "Show hjson version"
			}
		},
		required: ["command"]
	}
};

export async function executeHjson(args: { command?: string; input?: string; output?: string; format?: string; indent?: number; quote_keys?: boolean; version?: boolean }): Promise<string> {
	const { command, input, output, format, indent, quote_keys, version } = args;
	
	let cmd = "";
	
	if (version) {
		cmd = "hjson --version 2>&1 || echo 'hjson not installed. Install via: npm install -g hjson'";
	} else if (command) {
		cmd = command;
	} else if (!input) {
		return "Error: Please provide an input HJSON file. Use --version to see hjson version.";
	} else {
		// Build hjson command
		cmd = "hjson";
		
		if (format) cmd += ` -${format}`;
		if (indent) cmd += ` -I ${indent}`;
		if (quote_keys) cmd += " -k";
		
		cmd += ` '${input}'`;
		
		if (output) cmd += ` > ${output}`;
	}
	
	const { exec } = await import("child_process");
	const { promisify } = await import("util");
	const execAsync = promisify(exec);
	
	try {
		const { stdout, stderr } = await execAsync(cmd, { timeout: 30000 });
		return stdout || stderr;
	} catch (error: any) {
		return `Error: ${error.message}`;
	}
}
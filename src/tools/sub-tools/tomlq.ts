/**
 * tomlq sub-tool for TOML processing
 */

export const tomlqSchema = {
	name: "tomlq",
	description: "Process and query TOML files using tomlq",
	parameters: {
		type: "object",
		properties: {
			command: {
				type: "string",
				description: "The full tomlq command to execute"
			},
			input: {
				type: "string",
				description: "Input TOML file"
			},
			output: {
				type: "string",
				description: "Output file"
			},
			query: {
				type: "string",
				description: "JSON path query (e.g., '.server.port')"
			},
			raw: {
				type: "boolean",
				description: "Output raw values"
			},
			format: {
				type: "string",
				description: "Output format: json, yaml, toml"
			},
			indent: {
				type: "number",
				description: "Indentation spaces"
			},
			version: {
				type: "boolean",
				description: "Show tomlq version"
			}
		},
		required: ["command"]
	}
};

export async function executeTomlq(args: { command?: string; input?: string; output?: string; query?: string; raw?: boolean; format?: string; indent?: number; version?: boolean }): Promise<string> {
	const { command, input, output, query, raw, format, indent, version } = args;
	
	let cmd = "";
	
	if (version) {
		cmd = "tomlq --version 2>&1 || echo 'tomlq not installed. Install via: cargo install tomlq'";
	} else if (command) {
		cmd = command;
	} else if (!input) {
		return "Error: Please provide an input TOML file. Use --version to see tomlq version.";
	} else {
		// Build tomlq command
		cmd = "tomlq";
		
		if (query) cmd += ` '${query}'`;
		if (raw) cmd += " -r";
		if (format) cmd += ` -f ${format}`;
		if (indent) cmd += ` -I ${indent}`;
		
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
/**
 * yamllint sub-tool for YAML validation
 */

export const yamllintSchema = {
	name: "yamllint",
	description: "Validate and lint YAML files using yamllint",
	parameters: {
		type: "object",
		properties: {
			command: {
				type: "string",
				description: "The full yamllint command to execute"
			},
			input: {
				type: "string",
				description: "Input YAML file(s) or directory"
			},
			config_file: {
				type: "string",
				description: "Custom configuration file"
			},
			format: {
				type: "string",
				description: "Output format: standard, plain, colored, json"
			},
			strict: {
				type: "boolean",
				description: "Enable strict mode"
			},
			version: {
				type: "boolean",
				description: "Show yamllint version"
			}
		},
		required: ["command"]
	}
};

export async function executeYamllint(args: { command?: string; input?: string; config_file?: string; format?: string; strict?: boolean; version?: boolean }): Promise<string> {
	const { command, input, config_file, format, strict, version } = args;
	
	let cmd = "";
	
	if (version) {
		cmd = "yamllint --version 2>&1";
	} else if (command) {
		cmd = command;
	} else if (!input) {
		return "Error: Please provide an input YAML file or directory. Use --version to see yamllint version.";
	} else {
		// Build yamllint command
		cmd = "yamllint";
		
		if (config_file) cmd += ` -c ${config_file}`;
		if (format) cmd += ` -f ${format}`;
		if (strict) cmd += " --strict";
		
		cmd += ` '${input}'`;
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
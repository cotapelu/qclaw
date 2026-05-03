/**
 * json_pp/jsonschema sub-tool for JSON processing
 */

export const json_ppSchema = {
	name: "json_pp",
	description: "Process and validate JSON files using json_pp or jsonschema",
	parameters: {
		type: "object",
		properties: {
			command: {
				type: "string",
				description: "The full json_pp/jsonschema command to execute"
			},
			tool: {
				type: "string",
				description: "Which tool: 'json_pp' or 'jsonschema'"
			},
			input: {
				type: "string",
				description: "Input JSON file"
			},
			output: {
				type: "string",
				description: "Output file"
			},
			schema: {
				type: "string",
				description: "JSON Schema file for validation"
			},
			pretty: {
				type: "boolean",
				description: "Pretty print output"
			},
			indent: {
				type: "number",
				description: "Indentation spaces (2, 4, etc.)"
			},
			validate: {
				type: "boolean",
				description: "Validate JSON (if jsonschema)"
			},
			version: {
				type: "boolean",
				description: "Show version"
			}
		},
		required: ["command"]
	}
};

export async function executeJson_pp(args: { command?: string; tool?: string; input?: string; output?: string; schema?: string; pretty?: boolean; indent?: number; validate?: boolean; version?: boolean }): Promise<string> {
	const { command, tool, input, output, schema, pretty, indent, validate, version } = args;
	
	let cmd = "";
	
	if (version) {
		cmd = "echo '=== json_pp ===' && json_pp -v 2>&1 | head -2; echo '=== jsonschema ===' && jsonschema --version 2>&1 || echo 'jsonschema not installed'";
	} else if (command) {
		cmd = command;
	} else if (!input) {
		return "Error: Please provide an input JSON file. Use --version to see versions.";
	} else {
		const selectedTool = tool || "json_pp";
		
		if (selectedTool === "jsonschema") {
			// jsonschema commands
			cmd = "jsonschema";
			
			if (validate || schema) {
				cmd += " --instance";
				if (schema) cmd += ` ${schema}`;
			} else {
				cmd += " --version 2>&1 || echo 'Use --instance and --schema to validate'";
			}
			
			cmd += ` '${input}'`;
		} else {
			// json_pp commands
			cmd = "json_pp";
			
			if (pretty !== false) cmd += " -f";
			
			if (indent) cmd += ` -json_opt indent,${indent}`;
			
			if (output) cmd += ` > ${output}`;
			
			cmd += ` '${input}'`;
		}
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
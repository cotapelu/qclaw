/**
 * XMLStarlet sub-tool for XML processing
 */

export const xmlstarletSchema = {
	name: "xmlstarlet",
	description: "Process and transform XML files using XMLStarlet",
	parameters: {
		type: "object",
		properties: {
			command: {
				type: "string",
				description: "The full xmlstarlet command to execute"
			},
			input: {
				type: "string",
				description: "Input XML file"
			},
			output: {
				type: "string",
				description: "Output file"
			},
			operation: {
				type: "string",
				description: "Operation: select, edit, delete, insert, format, validate, escape, unescape"
			},
			xpath: {
				type: "string",
				description: "XPath expression"
			},
			"xml Declaration": {
				type: "boolean",
				description: "Include XML declaration in output"
			},
			indent: {
				type: "boolean",
				description: "Indent output"
			},
			version: {
				type: "boolean",
				description: "Show xmlstarlet version"
			},
			help: {
				type: "boolean",
				description: "Show help"
			}
		},
		required: ["command"]
	}
};

export async function executeXmlstarlet(args: { command?: string; input?: string; output?: string; operation?: string; xpath?: string; xml_declaration?: boolean; indent?: boolean; version?: boolean; help?: boolean }): Promise<string> {
	const { command, input, output, operation, xpath, xml_declaration, indent, version, help: showHelp } = args;
	
	let cmd = "";
	
	if (version) {
		cmd = "xmlstarlet --version 2>&1 | head -3";
	} else if (showHelp) {
		cmd = "xmlstarlet --help 2>&1 | head -40";
	} else if (command) {
		cmd = command;
	} else if (!input) {
		return "Error: Please provide an input XML file. Use --version to see xmlstarlet version.";
	} else {
		// Build xmlstarlet command
		cmd = "xmlstarlet";
		
		// Add formatting options
		let options = "";
		if (xml_declaration !== false) options += " -N";  // default is no declaration
		if (indent !== false) options += " -B";  // no pretty print by default
		
		// Operations
		if (operation === "select" || operation === "sel") {
			cmd += ` sel ${options}`;
			if (xpath) cmd += ` -t -v '${xpath}'`;
		} else if (operation === "edit" || operation === "ed") {
			cmd += ` ed ${options}`;
			if (xpath) cmd += ` -u '${xpath}'`;
		} else if (operation === "delete" || operation === "del") {
			cmd += ` del ${options}`;
			if (xpath) cmd += ` '${xpath}'`;
		} else if (operation === "insert" || operation === "ins") {
			cmd += ` ins ${options}`;
		} else if (operation === "format" || operation === "fmt") {
			cmd += ` fmt ${options}`;
		} else if (operation === "validate" || operation === "val") {
			cmd += ` val ${options}`;
		} else if (operation === "escape" || operation === "esc") {
			cmd += ` esc ${options}`;
		} else if (operation === "unescape" || operation === "unesc") {
			cmd += ` unesc ${options}`;
		} else if (xpath) {
			// Default: select
			cmd += ` sel ${options} -t -v '${xpath}'`;
		} else {
			// Default: format
			cmd += ` fmt ${options}`;
		}
		
		cmd += ` ${input}`;
		
		if (output) {
			cmd += ` > ${output}`;
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
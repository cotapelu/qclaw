/**
 * Graphviz (dot) sub-tool for graph visualization
 */

export const graphvizSchema = {
	name: "graphviz",
	description: "Generate graphs from DOT language using Graphviz",
	parameters: {
		type: "object",
		properties: {
			command: {
				type: "string",
				description: "The full graphviz command to execute"
			},
			input: {
				type: "string",
				description: "Input DOT file"
			},
			output: {
				type: "string",
				description: "Output file (default: output.png)"
			},
			format: {
				type: "string",
				description: "Output format: png, pdf, svg, ps, eps, jpg, gif, etc."
			},
			layout: {
				type: "string",
				description: "Layout engine: dot, neato, fdp, sfdp, twopi, circo"
			},
			version: {
				type: "boolean",
				description: "Show version"
			},
			list_formats: {
				type: "boolean",
				description: "List available output formats"
			}
		},
		required: ["command"]
	}
};

export async function executeGraphviz(args: { command?: string; input?: string; output?: string; format?: string; layout?: string; version?: boolean; list_formats?: boolean }): Promise<string> {
	const { command, input, output, format, layout, version, list_formats } = args;
	
	let cmd = "";
	
	if (version) {
		cmd = "dot -V 2>&1 | head -5";
	} else if (list_formats) {
		cmd = "dot -Tpng: 2>&1 || echo 'Use -T format to specify output'";
	} else if (command) {
		cmd = command;
	} else if (!input) {
		return "Error: Please provide an input DOT file. Use --version to see dot version. Use --list-formats to see available formats.";
	} else {
		// Build dot command
		const layoutEngine = layout || "dot";
		cmd = `${layoutEngine} -T${format || 'png'}`;
		
		if (output) {
			cmd += ` -o ${output}`;
		} else {
			// Generate output filename based on format
			const ext = format || 'png';
			cmd += ` -o ${input.replace(/\.dot$/i, '').replace(/\.gv$/i, '')}.${ext}`;
		}
		
		cmd += ` ${input}`;
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
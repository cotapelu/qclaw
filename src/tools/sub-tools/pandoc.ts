/**
 * Pandoc sub-tool for document conversion
 */

export const pandocSchema = {
	name: "pandoc",
	description: "Convert documents between various formats using Pandoc",
	parameters: {
		type: "object",
		properties: {
			command: {
				type: "string",
				description: "The full pandoc command to execute"
			},
			input: {
				type: "string",
				description: "Input file (markdown, rst, latex, html, etc.)"
			},
			output: {
				type: "string",
				description: "Output file"
			},
			from: {
				type: "string",
				description: "Input format (markdown, rst, latex, html, docx, etc.)"
			},
			to: {
				type: "string",
				description: "Output format (html, pdf, docx, markdown, latex, etc.)"
			},
			template: {
				type: "string",
				description: "Use custom template"
			},
			standalone: {
				type: "boolean",
				description: "Produce standalone HTML, LaTeX, etc."
			},
			self_contained: {
				type: "boolean",
				description: "Produce self-contained HTML"
			},
			metadata: {
				type: "string",
				description: "Metadata (key=value pairs, comma-separated)"
			},
			extract_media: {
				type: "string",
				description: "Extract media to directory"
			},
			number_sections: {
				type: "boolean",
				description: "Number sections"
			},
			toc: {
				type: "boolean",
				description: "Generate table of contents"
			},
			version: {
				type: "boolean",
				description: "Show pandoc version"
			}
		},
		required: ["command"]
	}
};

export async function executePandoc(args: { command?: string; input?: string; output?: string; from?: string; to?: string; template?: string; standalone?: boolean; self_contained?: boolean; metadata?: string; extract_media?: string; number_sections?: boolean; toc?: boolean; version?: boolean }): Promise<string> {
	const { command, input, output, from: fromFormat, to: toFormat, template, standalone, self_contained, metadata, extract_media, number_sections, toc, version } = args;
	
	let cmd = "";
	
	if (version) {
		cmd = "pandoc --version 2>&1 | head -5";
	} else if (command) {
		cmd = command;
	} else if (!input) {
		return "Error: Please provide an input file. Use --version to see pandoc version.";
	} else {
		// Build pandoc command
		cmd = "pandoc";
		
		if (fromFormat) cmd += ` -f ${fromFormat}`;
		if (toFormat) cmd += ` -t ${toFormat}`;
		if (template) cmd += ` --template=${template}`;
		if (standalone) cmd += " -s";
		if (self_contained) cmd += " --self-contained";
		if (metadata) {
			const metaParts = metadata.split(',');
			for (const m of metaParts) {
				cmd += ` --metadata '${m.trim()}'`;
			}
		}
		if (extract_media) cmd += ` --extract-media ${extract_media}`;
		if (number_sections) cmd += " --number-sections";
		if (toc) cmd += " --toc";
		
		cmd += ` -o ${output || 'output'}`;
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
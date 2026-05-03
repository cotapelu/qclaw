/**
 * wkhtmltopdf sub-tool for HTML to PDF conversion
 */

export const wkhtmltopdfSchema = {
	name: "wkhtmltopdf",
	description: "Convert HTML to PDF using wkhtmltopdf",
	parameters: {
		type: "object",
		properties: {
			command: {
				type: "string",
				description: "The full wkhtmltopdf command to execute"
			},
			input: {
				type: "string",
				description: "Input HTML file or URL"
			},
			output: {
				type: "string",
				description: "Output PDF file"
			},
			page_size: {
				type: "string",
				description: "Page size (A4, Letter, Legal, etc.)"
			},
			orientation: {
				type: "string",
				description: "Orientation (portrait, landscape)"
			},
			margin: {
				type: "string",
				description: "Margins (e.g., '10mm', '1in')"
			},
			zoom: {
				type: "number",
				description: "Zoom factor (default 1.0)"
			},
			copies: {
				type: "number",
				description: "Number of copies"
			},
			header: {
				type: "string",
				description: "Header HTML or text"
			},
			footer: {
				type: "string",
				description: "Footer HTML or text"
			},
			disable_smart_shrinking: {
				type: "boolean",
				description: "Disable smart shrinking"
			},
			enable_local_links: {
				type: "boolean",
				description: "Enable local links"
			},
			version: {
				type: "boolean",
				description: "Show wkhtmltopdf version"
			}
		},
		required: ["command"]
	}
};

export async function executeWkhtmltopdf(args: { command?: string; input?: string; output?: string; page_size?: string; orientation?: string; margin?: string; zoom?: number; copies?: number; header?: string; footer?: string; disable_smart_shrinking?: boolean; enable_local_links?: boolean; version?: boolean }): Promise<string> {
	const { command, input, output, page_size, orientation, margin, zoom, copies, header, footer, disable_smart_shrinking, enable_local_links, version } = args;
	
	let cmd = "";
	
	if (version) {
		cmd = "wkhtmltopdf --version 2>&1 | head -3";
	} else if (command) {
		cmd = command;
	} else if (!input) {
		return "Error: Please provide an input HTML file or URL. Use --version to see wkhtmltopdf version.";
	} else {
		// Build wkhtmltopdf command
		cmd = "wkhtmltopdf";
		
		if (page_size) cmd += ` --page-size ${page_size}`;
		if (orientation) cmd += ` --orientation ${orientation}`;
		if (margin) cmd += ` --margin-${margin.includes(' ') ? margin.split(' ')[0] : 'top'} ${margin}`;
		if (zoom) cmd += ` --zoom ${zoom}`;
		if (copies) cmd += ` --copies ${copies}`;
		if (header) cmd += ` --header-html '${header}'`;
		if (footer) cmd += ` --footer-html '${footer}'`;
		if (disable_smart_shrinking) cmd += " --disable-smart-shrinking";
		if (enable_local_links) cmd += " --enable-local-file-access";
		
		cmd += ` '${input}'`;
		cmd += ` ${output || 'output.pdf'}`;
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
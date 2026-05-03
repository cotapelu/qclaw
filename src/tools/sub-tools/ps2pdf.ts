/**
 * ps2pdf/pdf2ps sub-tool for PostScript/PDF conversion
 */

export const ps2pdfSchema = {
	name: "ps2pdf",
	description: "Convert between PostScript and PDF using Ghostscript",
	parameters: {
		type: "object",
		properties: {
			command: {
				type: "string",
				description: "The full ps2pdf/pdf2ps command to execute"
			},
			input: {
				type: "string",
				description: "Input file (PS or PDF)"
			},
			output: {
				type: "string",
				description: "Output file"
			},
			device: {
				type: "string",
				description: "Ghostscript device (pdfwrite, ps2write, etc.)"
			},
			resolution: {
				type: "string",
				description: "Resolution (e.g., '72', '300', '600')"
			},
			paper_size: {
				type: "string",
				description: "Paper size (a4, letter, legal, etc.)"
			},
			compress: {
				type: "boolean",
				description: "Enable compression"
			},
			version: {
				type: "boolean",
				description: "Show Ghostscript version"
			}
		},
		required: ["command"]
	}
};

export async function executePs2pdf(args: { command?: string; input?: string; output?: string; device?: string; resolution?: string; paper_size?: string; compress?: boolean; version?: boolean }): Promise<string> {
	const { command, input, output, device, resolution, paper_size, compress, version } = args;
	
	let cmd = "";
	
	if (version) {
		cmd = "gs --version 2>&1";
	} else if (command) {
		cmd = command;
	} else if (!input) {
		return "Error: Please provide an input file. Use --version to see Ghostscript version.";
	} else {
		// Determine conversion direction
		const inputExt = input.split('.').pop()?.toLowerCase();
		
		if (inputExt === 'ps' || inputExt === 'eps') {
			// PostScript to PDF
			cmd = "ps2pdf";
			
			if (device) cmd += ` -dDEVICEWIDTHPOINTS=${device}`;
			if (resolution) cmd += ` -r${resolution}`;
			if (paper_size) cmd += ` -sPAPERSIZE=${paper_size}`;
			if (compress === false) cmd += " -dCompressFonts=false";
			
			cmd += ` '${input}'`;
			cmd += ` ${output || input.replace(/\.ps$/i, '.pdf').replace(/\.eps$/i, '.pdf')}`;
		} else if (inputExt === 'pdf') {
			// PDF to PostScript
			cmd = "pdf2ps";
			
			if (resolution) cmd += ` -r${resolution}`;
			
			cmd += ` '${input}'`;
			cmd += ` ${output || input.replace(/\.pdf$/i, '.ps')}`;
		} else {
			return "Error: Input file must have .ps, .eps, or .pdf extension";
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
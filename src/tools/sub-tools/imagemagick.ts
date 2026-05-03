/**
 * ImageMagick/GraphicsMagick sub-tool for image processing
 */

export const imagemagickSchema = {
	name: "imagemagick",
	description: "Process and convert images using ImageMagick or GraphicsMagick",
	parameters: {
		type: "object",
		properties: {
			command: {
				type: "string",
				description: "The full imagemagick command to execute"
			},
			tool: {
				type: "string",
				description: "Which tool: 'convert' (ImageMagick) or 'gm' (GraphicsMagick)"
			},
			input: {
				type: "string",
				description: "Input image file"
			},
			output: {
				type: "string",
				description: "Output image file"
			},
			resize: {
				type: "string",
				description: "Resize (e.g., '800x600', '50%')"
			},
			format: {
				type: "string",
				description: "Output format (jpg, png, gif, webp, etc.)"
			},
			quality: {
				type: "number",
				description: "Quality (1-100 for JPEG, etc.)"
			},
			rotate: {
				type: "number",
				description: "Rotate by degrees"
			},
			flip: {
				type: "boolean",
				description: "Flip horizontally"
			},
			flop: {
				type: "boolean",
				description: "Flip vertically"
			},
			grayscale: {
				type: "boolean",
				description: "Convert to grayscale"
			},
			blur: {
				type: "number",
				description: "Gaussian blur radius"
			},
			sharpen: {
				type: "number",
				description: "Sharpen radius"
			},
			thumbnail: {
				type: "string",
				description: "Create thumbnail (e.g., '200x200^')"
			},
			identify: {
				type: "boolean",
				description: "Show image information"
			},
			version: {
				type: "boolean",
				description: "Show version"
			}
		},
		required: ["command"]
	}
};

export async function executeImagemagick(args: { command?: string; tool?: string; input?: string; output?: string; resize?: string; format?: string; quality?: number; rotate?: number; flip?: boolean; flop?: boolean; grayscale?: boolean; blur?: number; sharpen?: number; thumbnail?: string; identify?: boolean; version?: boolean }): Promise<string> {
	const { command, tool, input, output, resize, format, quality, rotate, flip, flop, grayscale, blur, sharpen, thumbnail, identify, version } = args;
	
	let cmd = "";
	
	if (version) {
		cmd = "echo '=== ImageMagick ===' && convert --version 2>&1 | head -3; echo '=== GraphicsMagick ===' && gm version 2>&1 | head -3";
	} else if (identify && input) {
		// Identify image info
		const toolCmd = tool === "gm" ? "gm identify" : "identify";
		cmd = `${toolCmd} -verbose ${input} 2>&1 | head -30`;
	} else if (command) {
		cmd = command;
	} else if (!input) {
		return "Error: Please provide an input file. Use identify to get image info.";
	} else {
		// Build convert command
		const toolCmd = tool === "gm" ? "gm convert" : "convert";
		cmd = `${toolCmd} ${input}`;
		
		if (resize) cmd += ` -resize ${resize}`;
		if (thumbnail) cmd += ` -thumbnail ${thumbnail}`;
		if (format) cmd += ` -format ${format}`;
		if (quality) cmd += ` -quality ${quality}`;
		if (rotate) cmd += ` -rotate ${rotate}`;
		if (flip) cmd += " -flip";
		if (flop) cmd += " -flop";
		if (grayscale) cmd += " -colorspace Gray";
		if (blur) cmd += ` -blur 0x${blur}`;
		if (sharpen) cmd += ` -sharpen 0x${sharpen}`;
		
		// Output file
		const outFile = output || (format ? input.replace(/\.[^.]+$/, `.${format}`) : input.replace(/\.[^.]+$/, '_output.png'));
		cmd += ` ${outFile}`;
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
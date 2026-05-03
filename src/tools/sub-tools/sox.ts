/**
 * SoX (Sound eXchange) sub-tool for audio processing
 */

export const soxSchema = {
	name: "sox",
	description: "Process and convert audio files using SoX",
	parameters: {
		type: "object",
		properties: {
			command: {
				type: "string",
				description: "The full sox command to execute"
			},
			input: {
				type: "string",
				description: "Input audio file"
			},
			output: {
				type: "string",
				description: "Output audio file"
			},
			format: {
				type: "string",
				description: "Output format (mp3, wav, ogg, flac, etc.)"
			},
			channels: {
				type: "number",
				description: "Number of channels (1=mono, 2=stereo)"
			},
			rate: {
				type: "number",
				description: "Sample rate (e.g., 44100, 48000)"
			},
			bits: {
				type: "number",
				description: "Bits per sample (8, 16, 24, 32)"
			},
			volume: {
				type: "number",
				description: "Volume adjustment (0.0 to 2.0, or percentage)"
			},
			trim: {
				type: "string",
				description: "Trim audio (e.g., '0:30', '1:00-2:00')"
			},
			reverse: {
				type: "boolean",
				description: "Reverse audio"
			},
			normalize: {
				type: "boolean",
				description: "Normalize audio volume"
			},
			fade: {
				type: "string",
				description: "Apply fade (e.g., 'in 5', 'out 3', '0:5 0:3')"
			},
			concatenate: {
				type: "string",
				description: "Files to concatenate (comma-separated)"
			},
			version: {
				type: "boolean",
				description: "Show sox version"
			}
		},
		required: ["command"]
	}
};

export async function executeSox(args: { command?: string; input?: string; output?: string; format?: string; channels?: number; rate?: number; bits?: number; volume?: number; trim?: string; reverse?: boolean; normalize?: boolean; fade?: string; concatenate?: string; version?: boolean }): Promise<string> {
	const { command, input, output, format, channels, rate, bits, volume, trim, reverse, normalize, fade, concatenate, version } = args;
	
	let cmd = "";
	
	if (version) {
		cmd = "sox --version 2>&1 | head -3";
	} else if (command) {
		cmd = command;
	} else if (concatenate) {
		// Concatenate multiple files
		const files = concatenate.split(',').map((f: string) => f.trim()).join(' ');
		const outFile = output || "output.wav";
		cmd = `sox ${files} ${outFile}`;
	} else if (!input) {
		return "Error: Please provide an input file. Use --version to see sox version.";
	} else {
		// Build sox command
		cmd = "sox";
		cmd += ` ${input}`;
		
		// Effects
		let effects = "";
		if (volume) effects += ` vol ${volume}`;
		if (trim) effects += ` trim ${trim}`;
		if (reverse) effects += " reverse";
		if (normalize) effects += " norm";
		if (fade) effects += ` fade ${fade}`;
		
		// Output file
		const outFile = output || (format ? input.replace(/\.[^.]+$/, `.${format}`) : "output.wav");
		cmd += ` ${outFile}`;
		
		// Add format options before output
		if (format || channels || rate || bits) {
			cmd += " ";
			if (format) cmd += `-t ${format} `;
			if (channels) cmd += `-c ${channels} `;
			if (rate) cmd += `-r ${rate} `;
			if (bits) cmd += `-b ${bits} `;
		}
		
		if (effects) cmd += effects;
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
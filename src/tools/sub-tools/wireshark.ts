/**
 * Wireshark/Tshark sub-tool for packet analysis
 */

export const wiresharkSchema = {
	name: "wireshark",
	description: "Analyze network packets using tshark (terminal Wireshark)",
	parameters: {
		type: "object",
		properties: {
			command: {
				type: "string",
				description: "The full tshark command to execute"
			},
			tool: {
				type: "string",
				description: "Which tool: 'tshark' or 'dumpcap'"
			},
			interface: {
				type: "string",
				description: "Network interface to capture on (e.g., eth0, any)"
			},
			filter: {
				type: "string",
				description: "Capture or display filter (e.g., 'tcp port 80')"
			},
			count: {
				type: "number",
				description: "Number of packets to capture"
			},
			read_file: {
				type: "string",
				description: "Read packets from pcap file"
			},
			output_file: {
				type: "string",
				description: "Output file to save captured packets"
			},
			fields: {
				type: "string",
				description: "Fields to display (e.g., 'ip.src,ip.dst,tcp.port')"
			},
			format: {
				type: "string",
				description: "Output format: 'txt', 'json', 'csv', 'psml', 'pdml'"
			},
			verbose: {
				type: "boolean",
				description: "Verbose packet details"
			},
			version: {
				type: "boolean",
				description: "Show tshark version"
			},
			help: {
				type: "boolean",
				description: "Show help information"
			}
		},
		required: ["command"]
	}
};

export async function executeWireshark(args: { command?: string; tool?: string; interface?: string; filter?: string; count?: number; read_file?: string; output_file?: string; fields?: string; format?: string; verbose?: boolean; version?: boolean; help?: boolean }): Promise<string> {
	const { command, tool, interface: iface, filter, count, read_file, output_file, fields, format, verbose, version, help } = args;
	
	let cmd = "";
	
	if (version) {
		cmd = "tshark --version 2>&1 | head -5";
	} else if (help) {
		cmd = "tshark --help 2>&1 | head -40";
	} else if (command) {
		cmd = command;
	} else if (tool === "dumpcap") {
		// Use dumpcap for capturing only
		cmd = "dumpcap";
		if (iface) cmd += ` -i ${iface}`;
		if (count) cmd += ` -c ${count}`;
		if (output_file) cmd += ` -w ${output_file}`;
		if (filter) cmd += ` -f '${filter}'`;
	} else if (read_file) {
		// Analyze pcap file with tshark
		cmd = `tshark -r ${read_file}`;
		if (filter) cmd += ` '${filter}'`;
		if (fields) cmd += ` -T fields -e ${fields}`;
		else if (format === "json") cmd += " -T json";
		else if (format === "csv") cmd += " -T csv";
		else if (verbose) cmd += " -V";
		else cmd += " 2>&1 | head -30";
	} else {
		// Capture packets with tshark
		cmd = "tshark";
		
		if (iface) {
			cmd += ` -i ${iface}`;
		}
		
		if (count) {
			cmd += ` -c ${count}`;
		} else {
			cmd += " -c 10";  // default 10 packets
		}
		
		if (output_file) {
			cmd += ` -w ${output_file}`;
		}
		
		if (filter) {
			cmd += ` -f '${filter}'`;
		}
		
		// Add display options
		if (fields) {
			cmd += ` -T fields -e ${fields}`;
		} else if (format === "json") {
			cmd += " -T json";
		} else if (format === "csv") {
			cmd += " -T csv";
		} else if (format === "pdml") {
			cmd += " -T pdml";
		} else if (format === "psml") {
			cmd += " -T psml";
		} else if (verbose) {
			cmd += " -V";
		}
		
		if (!output_file && !verbose) {
			cmd += " 2>&1 | head -40";
		} else if (!output_file) {
			cmd += " 2>&1 | head -100";
		}
	}
	
	const { exec } = await import("child_process");
	const { promisify } = await import("util");
	const execAsync = promisify(exec);
	
	try {
		const { stdout, stderr } = await execAsync(cmd, { timeout: 15000 });
		return stdout || stderr || "tshark/dumpcap may require root privileges";
	} catch (error: any) {
		return `Error: ${error.message}`;
	}
}
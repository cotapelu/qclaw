/**
 * TCPdump sub-tool for network packet capture and analysis
 */

export const tcpdumpSchema = {
	name: "tcpdump",
	description: "Capture and analyze network packets using tcpdump",
	parameters: {
		type: "object",
		properties: {
			command: {
				type: "string",
				description: "The full tcpdump command to execute"
			},
			interface: {
				type: "string",
				description: "Network interface to capture on (e.g., eth0, any)"
			},
			filter: {
				type: "string",
				description: "BPF filter expression (e.g., 'tcp port 80', 'host 192.168.1.1')"
			},
			count: {
				type: "number",
				description: "Number of packets to capture"
			},
			snaplen: {
				type: "number",
				description: "Snaplen (bytes to capture per packet, default 68)"
			},
			verbose: {
				type: "boolean",
				description: "Verbose output (-v, -vv, -vvv)"
			},
			timestamp: {
				type: "string",
				description: "Timestamp format (tt, ttt, tttt)"
			},
			promiscuous: {
				type: "boolean",
				description: "Promiscuous mode (default on, use -p to disable)"
			},
			read_file: {
				type: "string",
				description: "Read packets from pcap file"
			},
			version: {
				type: "boolean",
				description: "Show tcpdump version"
			},
			help: {
				type: "boolean",
				description: "Show help information"
			}
		},
		required: ["command"]
	}
};

export async function executeTcpdump(args: { command?: string; interface?: string; filter?: string; count?: number; snaplen?: number; verbose?: boolean; timestamp?: string; promiscuous?: boolean; read_file?: string; version?: boolean; help?: boolean }): Promise<string> {
	const { command, interface: iface, filter, count, snaplen, verbose, timestamp, promiscuous, read_file, version, help } = args;
	
	let cmd = "";
	
	if (version) {
		cmd = "tcpdump --version 2>&1 | head -5";
	} else if (help) {
		cmd = "tcpdump --help 2>&1 | head -40";
	} else if (command) {
		cmd = command;
	} else if (read_file) {
		// Read from pcap file
		cmd = `tcpdump -r ${read_file}`;
		if (filter) cmd += ` '${filter}'`;
		if (verbose) cmd += " -v";
		cmd += " 2>&1 | head -30";
	} else {
		// Build tcpdump command
		cmd = "tcpdump";
		
		if (iface) {
			cmd += ` -i ${iface}`;
		}
		
		if (snaplen) {
			cmd += ` -s ${snaplen}`;
		} else {
			cmd += " -s 96";  // reasonable snaplen
		}
		
		if (count) {
			cmd += ` -c ${count}`;
		} else {
			cmd += " -c 10";  // default 10 packets
		}
		
		if (verbose) {
			cmd += " -v";
		}
		
		if (timestamp) {
			cmd += ` -t ${timestamp}`;
		}
		
		if (promiscuous === false) {
			cmd += " -p";  // disable promiscuous
		}
		
		if (filter) {
			cmd += ` '${filter}'`;
		}
		
		// Add options and limit output
		cmd += " -nn 2>&1 | head -40";  // -nn: don't resolve DNS or ports
	}
	
	const { exec } = await import("child_process");
	const { promisify } = await import("util");
	const execAsync = promisify(exec);
	
	try {
		const { stdout, stderr } = await execAsync(cmd, { timeout: 15000 });
		return stdout || stderr || "tcpdump may require root privileges";
	} catch (error: any) {
		return `Error: ${error.message}`;
	}
}
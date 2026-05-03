/**
 * Network traffic monitoring sub-tool (iftop, iptraf-ng)
 */

export const iftopSchema = {
	name: "iftop",
	description: "Monitor network traffic using iftop and iptraf-ng",
	parameters: {
		type: "object",
		properties: {
			command: {
				type: "string",
				description: "The full iftop/iptraf command to execute"
			},
			tool: {
				type: "string",
				description: "Which tool to use: 'iftop' or 'iptraf'"
			},
			interface: {
				type: "string",
				description: "Network interface to monitor (e.g., eth0, wlan0)"
			},
			filter: {
				type: "string",
				description: "BPF filter expression (iftop)"
			},
			port: {
				type: "string",
				description: "Port to filter (iptraf)"
			},
			verbose: {
				type: "boolean",
				description: "Verbose output"
			},
			version: {
				type: "boolean",
				description: "Show version information"
			},
			help: {
				type: "boolean",
				description: "Show help information"
			}
		},
		required: ["command"]
	}
};

export async function executeIftop(args: { command?: string; tool?: string; interface?: string; filter?: string; port?: string; verbose?: boolean; version?: boolean; help?: boolean }): Promise<string> {
	const { command, tool, interface: iface, filter, port, verbose, version, help } = args;
	
	let cmd = "";
	
	if (version) {
		cmd = "echo '=== iftop ===' && iftop -v 2>&1 | head -3; echo '=== iptraf ===' && iptraf-ng -v 2>&1 || echo 'iptraf-ng not found'";
	} else if (help) {
		cmd = "echo '=== iftop ===' && iftop -h 2>&1 | head -20; echo '=== iptraf-ng ===' && iptraf-ng -h 2>&1 | head -20";
	} else if (command) {
		cmd = command;
	} else {
		// Determine which tool to use
		const selectedTool = tool || "iftop";
		
		if (selectedTool === "iptraf" || selectedTool === "iptraf-ng") {
			cmd = "iptraf-ng";
			
			if (port) {
				cmd += ` -i ${iface || 'all'} -t ${port} -B`;  // Background mode with port
			} else {
				cmd += ` -i ${iface || 'all'} -B`;  // Background mode, all traffic
			}
			
			if (verbose) {
				cmd = "iptraf-ng -i ${iface || 'all'} -f 2>&1 | head -50";  // Flush intervals
			}
		} else {
			// Default to iftop
			cmd = "iftop";
			
			if (iface) {
				cmd += ` -i ${iface}`;
			}
			
			if (filter) {
				cmd += ` -f '${filter}'`;
			}
			
			// iftop is interactive, so we run it with -n (no DNS) and -N (no port numbers)
			// and limit to a few samples for non-interactive use
			if (verbose) {
				cmd += " -nN -L 5";  // 5 lines of output
			} else {
				cmd += " -nN -L 1";  // 1 line of output for quick check
			}
		}
		
		cmd += " 2>&1 | head -20";  // Limit output for non-interactive use
	}
	
	const { exec } = await import("child_process");
	const { promisify } = await import("util");
	const execAsync = promisify(exec);
	
	try {
		const { stdout, stderr } = await execAsync(cmd, { timeout: 15000 });
		return stdout || stderr || "Tool may require root privileges or specific network interface";
	} catch (error: any) {
		return `Error: ${error.message}`;
	}
}
/**
 * Netcat (nc) sub-tool for network connections, port scanning, and network debugging
 */

export const netcatSchema = {
	name: "netcat",
	description: "Execute netcat (nc) commands for network connections, port scanning, and debugging",
	parameters: {
		type: "object",
		properties: {
			host: {
				type: "string",
				description: "Target host or IP address"
			},
			port: {
				type: "string",
				description: "Target port or port range"
			},
			command: {
				type: "string",
				description: "The netcat command to execute (full command override)"
			},
			listen: {
				type: "boolean",
				description: "Listen mode for incoming connections"
			},
			connect: {
				type: "boolean",
				description: "Connect to a remote host (default)"
			},
			port_scan: {
				type: "string",
				description: "Port range to scan (e.g., '1-1000' or '80,443,8080')"
			},
			verbose: {
				type: "boolean",
				description: "Verbose output"
			},
			timeout: {
				type: "number",
				description: "Connection timeout in seconds"
			},
			send: {
				type: "string",
				description: "Data to send to the remote host"
			},
			file: {
				type: "string",
				description: "File to send or receive"
			},
			keep_open: {
				type: "boolean",
				description: "Keep listening after client disconnects (-k)"
			},
			exec: {
				type: "string",
				description: "Execute a command after connection (-e)"
			},
			version: {
				type: "boolean",
				description: "Show netcat version"
			}
		},
		required: ["command"]
	}
};

export async function executeNetcat(args: { host?: string; port?: string; command?: string; listen?: boolean; connect?: boolean; port_scan?: string; verbose?: boolean; timeout?: number; send?: string; file?: string; keep_open?: boolean; exec?: string; version?: boolean }): Promise<string> {
	const { host, port, command, listen, connect, port_scan, verbose, timeout, send, file, keep_open, exec, version } = args;
	
	let cmd = "nc";
	
	if (version) {
		cmd = "nc -h 2>&1 | head -5";
	} else if (command) {
		cmd = command;
	} else if (port_scan && host) {
		// Simple port scan using nc
		const ports = port_scan.includes('-') ? 
			`$(seq ${port_scan.replace('-', ' ')})` : 
			port_scan.replace(/,/g, ' ');
		cmd = `for p in ${ports}; do nc -zv -w2 ${host} $p 2>&1 & done; wait`;
	} else if (host && port) {
		if (listen) {
			cmd = `nc -l ${port}`;
			if (verbose) cmd += " -v";
			if (keep_open) cmd += " -k";
			if (exec) cmd += ` -e ${exec}`;
			if (file) cmd += ` > ${file}`;
		} else {
			cmd = `nc ${host} ${port}`;
			if (verbose) cmd += " -v";
			if (timeout) cmd += ` -w ${timeout}`;
			if (send) cmd += ` -c "${send}"`;
		}
	} else {
		return "Error: Please provide host and port, or use a full command. Use --version to see netcat options.";
	}
	
	const { exec: execModule } = await import("child_process");
	const { promisify } = await import("util");
	const execAsync = promisify(execModule);
	
	try {
		const { stdout, stderr } = await execAsync(cmd, { timeout: 30000 });
		return stdout || stderr;
	} catch (error: any) {
		return `Error: ${error.message}`;
	}
}
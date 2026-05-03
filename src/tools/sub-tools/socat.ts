/**
 * Socat (SOcket CAT) sub-tool for bidirectional data transfer between endpoints
 */

export const socatSchema = {
	name: "socat",
	description: "Execute socat commands for bidirectional data transfer between endpoints",
	parameters: {
		type: "object",
		properties: {
			command: {
				type: "string",
				description: "The full socat command to execute"
			},
			listen: {
				type: "boolean",
				description: "Listen mode - create a server"
			},
			address: {
				type: "string",
				description: "Address to connect or listen on (e.g., 'TCP-LISTEN:8080', 'stdio')"
			},
			connect: {
				type: "string",
				description: "Remote address to connect to (e.g., 'TCP:example.com:80')"
			},
			file: {
				type: "string",
				description: "File to read from or write to"
			},
			stdio: {
				type: "boolean",
				description: "Use standard input/output as one endpoint"
			},
			fork: {
				type: "boolean",
				description: "Fork after accepting a connection"
			},
			verbose: {
				type: "boolean",
				description: "Verbose output"
			},
			timeout: {
				type: "number",
				description: "Timeout in seconds"
			},
			version: {
				type: "boolean",
				description: "Show socat version"
			}
		},
		required: ["command"]
	}
};

export async function executeSocat(args: { command?: string; listen?: boolean; address?: string; connect?: string; file?: string; stdio?: boolean; fork?: boolean; verbose?: boolean; timeout?: number; version?: boolean }): Promise<string> {
	const { command, listen, address, connect, file, stdio, fork, verbose, timeout, version } = args;
	
	let cmd = "socat";
	
	if (version) {
		cmd = "socat -V";
	} else if (command) {
		cmd = command;
	} else if (address) {
		// Build socat command from parameters
		if (stdio && connect) {
			// stdio to TCP connection
			cmd = `socat - ${connect}`;
		} else if (listen && address) {
			// Listen mode
			cmd = `socat ${address} -`;
			if (fork) cmd += " fork";
		} else if (connect && address) {
			// Connect to remote, use address as local
			cmd = `socat ${address} ${connect}`;
		} else if (address && file) {
			// Address to file
			cmd = `socat ${address} ${file}`;
		} else if (listen) {
			cmd = `socat TCP-LISTEN:${address || '8080'} -`;
		} else {
			cmd = `socat - ${address}`;
		}
		
		if (verbose) cmd += " -v";
		if (timeout) cmd += ` -T ${timeout}`;
	} else {
		return "Error: Please provide an address or a full command. Use --version to see socat version.";
	}
	
	const { exec } = await import("child_process");
	const { promisify } = await import("util");
	const execAsync = promisify(exec);
	
	try {
		const { stdout, stderr } = await execAsync(cmd, { timeout: timeout ? timeout * 1000 : 30000 });
		return stdout || stderr;
	} catch (error: any) {
		return `Error: ${error.message}`;
	}
}
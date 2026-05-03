/**
 * Nethogs sub-tool for per-process network traffic monitoring
 */

export const nethogsSchema = {
	name: "nethogs",
	description: "Monitor per-process network traffic using nethogs",
	parameters: {
		type: "object",
		properties: {
			command: {
				type: "string",
				description: "The full nethogs command to execute"
			},
			interface: {
				type: "string",
				description: "Network interface to monitor (e.g., eth0, wlan0)"
			},
			refresh: {
				type: "number",
				description: "Refresh rate in seconds"
			},
			version: {
				type: "boolean",
				description: "Show nethogs version"
			},
			help: {
				type: "boolean",
				description: "Show help information"
			},
			monitor_mode: {
				type: "boolean",
				description: "Monitor mode - show all processes"
			}
		},
		required: ["command"]
	}
};

export async function executeNethogs(args: { command?: string; interface?: string; refresh?: number; version?: boolean; help?: boolean; monitor_mode?: boolean }): Promise<string> {
	const { command, interface: iface, refresh, version, help, monitor_mode } = args;
	
	let cmd = "";
	
	if (version) {
		cmd = "nethogs -V 2>&1 || echo 'nethogs version info not available'";
	} else if (help) {
		cmd = "nethogs -h 2>&1 || echo 'nethogs help not available'";
	} else if (command) {
		cmd = command;
	} else {
		// Build nethogs command
		cmd = "nethogs";
		
		if (iface) {
			cmd += ` -d ${refresh || 5} ${iface}`;  // delay + interface
		} else if (refresh) {
			cmd += ` -d ${refresh}`;
		} else {
			cmd += " -d 3";  // default 3 second refresh
		}
		
		if (monitor_mode) {
			cmd += " -m";  // monitor mode
		}
		
		// Run with limited output for non-interactive use
		cmd += " 2>&1 | head -30";
	}
	
	const { exec } = await import("child_process");
	const { promisify } = await import("util");
	const execAsync = promisify(exec);
	
	try {
		const { stdout, stderr } = await execAsync(cmd, { timeout: 15000 });
		return stdout || stderr || "nethogs may require root privileges";
	} catch (error: any) {
		return `Error: ${error.message}`;
	}
}
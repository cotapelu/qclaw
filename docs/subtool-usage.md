# SubTool Loader - Usage Guide

The SubTool Loader provides a unified interface for executing common system commands and tools. Each sub-tool wraps a specific command-line tool with a consistent API.

## Overview

All sub-tools follow a common pattern:
- **command**: The actual command to execute (required)
- **cwd**: Working directory (optional)
- **timeout**: Timeout in seconds (optional)
- Some tools have additional specific parameters

## Available Sub-Tools

---

## 🔧 System & Administration

### systemctl
Control the systemd system and service manager.

```json
{
  "subtool": "systemctl",
  "args": {
    "command": "status nginx"
  }
}
```

```json
{
  "subtool": "systemctl",
  "args": {
    "command": "restart docker",
    "timeout": 30
  }
}
```

### journalctl
Query the systemd journal.

```json
{
  "subtool": "journalctl",
  "args": {
    "command": "-u nginx --since '1 hour ago'",
    "timeout": 10
  }
}
```

```json
{
  "subtool": "journalctl",
  "args": {
    "command": "-xe --no-pager",
    "timeout": 15
  }
}
```

### crontab
Manage cron tables.

```json
{
  "subtool": "crontab",
  "args": {
    "command": "-l"
  }
}
```

```json
{
  "subtool": "crontab",
  "args": {
    "command": "-e"
  }
}
```

### apt
Debian/Ubuntu package manager.

```json
{
  "subtool": "apt",
  "args": {
    "command": "update"
  }
}
```

```json
{
  "subtool": "apt",
  "args": {
    "command": "install -y nginx",
    "timeout": 120
  }
}
```

### yum
RHEL/CentOS package manager.

```json
{
  "subtool": "yum",
  "args": {
    "command": "check-update"
  }
}
```

```json
{
  "subtool": "yum",
  "args": {
    "command": "install -y docker-ce",
    "timeout": 180
  }
}
```

### update
System update utilities.

```json
{
  "subtool": "update",
  "args": {
    "command": "--security"
  }
}
```

---

## 📊 System Monitoring

### ps
Report a snapshot of current processes.

```json
{
  "subtool": "ps",
  "args": {
    "command": "aux | grep node"
  }
}
```

```json
{
  "subtool": "ps",
  "args": {
    "command": "-ef | grep java"
  }
}
```

### kill
Terminate a process.

```json
{
  "subtool": "kill",
  "args": {
    "command": "-9 12345"
  }
}
```

```json
{
  "subtool": "kill",
  "args": {
    "command": "-TERM 9876"
  }
}
```

### df
Report file system disk space usage.

```json
{
  "subtool": "df",
  "args": {
    "command": "-h"
  }
}
```

```json
{
  "subtool": "df",
  "args": {
    "command": "-i"
  }
}
```

### du
Estimate file space usage.

```json
{
  "subtool": "du",
  "args": {
    "command": "-sh /var/log/*"
  }
}
```

```json
{
  "subtool": "du",
  "args": {
    "command": "-ah --max-depth=1"
  }
}
```

### free
Display amount of free and used memory.

```json
{
  "subtool": "free",
  "args": {
    "command": "-h"
  }
}
```

```json
{
  "subtool": "free",
  "args": {
    "command": "-m -s 5"
  }
}
```

### iostat
Report CPU and I/O statistics.

```json
{
  "subtool": "iostat",
  "args": {
    "command": "-x 5 3"
  }
}
```

### netstat
Print network connections, routing tables, interface statistics.

```json
{
  "subtool": "netstat",
  "args": {
    "command": "-tuln"
  }
}
```

```json
{
  "subtool": "netstat",
  "args": {
    "command": "-an | grep ESTABLISHED"
  }
}
```

### ss
Socket statistics (modern replacement for netstat).

```json
{
  "subtool": "ss",
  "args": {
    "command": "-tuln"
  }
}
```

```json
{
  "subtool": "ss",
  "args": {
    "command": "-s"
  }
}
```

---

## 🌐 Network Tools

### ping
Send ICMP ECHO_REQUEST to network hosts.

```json
{
  "subtool": "ping",
  "args": {
    "command": "-c 4 google.com"
  }
}
```

```json
{
  "subtool": "ping",
  "args": {
    "command": "-i 2 8.8.8.8"
  }
}
```

### traceroute
Print the route packets take to network host.

```json
{
  "subtool": "traceroute",
  "args": {
    "command": "google.com"
  }
}
```

```json
{
  "subtool": "traceroute",
  "args": {
    "command": "-m 15 1.1.1.1"
  }
}
```

### nslookup
Query DNS for domain names.

```json
{
  "subtool": "nslookup",
  "args": {
    "command": "example.com"
  }
}
```

```json
{
  "subtool": "nslookup",
  "args": {
    "command": "-type=MX gmail.com"
  }
}
```

### dig
DNS lookup utility.

```json
{
  "subtool": "dig",
  "args": {
    "command": "example.com"
  }
}
```

```json
{
  "subtool": "dig",
  "args": {
    "command": "example.com TXT"
  }
}
```

### wget
Download files from the web.

```json
{
  "subtool": "wget",
  "args": {
    "command": "https://example.com/file.tar.gz"
  }
}
```

```json
{
  "subtool": "wget",
  "args": {
    "command": "-O /tmp/file.zip https://example.com/file.zip"
  }
}
```

---

## 🔀 File Operations

### tail
Output the last part of files.

```json
{
  "subtool": "tail",
  "args": {
    "command": "-f /var/log/syslog"
  }
}
```

```json
{
  "subtool": "tail",
  "args": {
    "command": "-n 100 /var/log/nginx/access.log"
  }
}
```

### scp
Secure copy (remote file copy program).

```json
{
  "subtool": "scp",
  "args": {
    "command": "file.txt user@host:/remote/path/"
  }
}
```

```json
{
  "subtool": "scp",
  "args": {
    "command": "-r /local/dir user@host:/remote/dir/"
  }
}
```

### rsync
Remote file sync utility.

```json
{
  "subtool": "rsync",
  "args": {
    "command": "-avz source/ user@host:/destination/"
  }
}
```

```json
{
  "subtool": "rsync",
  "args": {
    "command": "--exclude='*.log' -avz /src/ /dest/"
  }
}
```

---

## 📦 Containers & Orchestration

### docker
Docker container platform.

```json
{
  "subtool": "docker",
  "args": {
    "command": "ps -a"
  }
}
```

```json
{
  "subtool": "docker",
  "args": {
    "command": "run -d nginx:latest"
  }
}
```

```json
{
  "subtool": "docker",
  "args": {
    "command": "logs -f container_name",
    "timeout": 30
  }
}
```

```json
{
  "subtool": "docker",
  "args": {
    "command": "exec -it container_name bash"
  }
}
```

### k8s
Kubernetes kubectl commands.

```json
{
  "subtool": "k8s",
  "args": {
    "command": "get pods -n default"
  }
}
```

```json
{
  "subtool": "k8s",
  "args": {
    "command": "apply -f deployment.yaml",
    "timeout": 60
  }
}
```

```json
{
  "subtool": "k8s",
  "args": {
    "command": "logs -f pod_name -n namespace",
    "context": "production"
  }
}
```

---

## 🔐 Security & Network

### ssh
OpenSSH SSH client (remote login program).

```json
{
  "subtool": "ssh",
  "args": {
    "command": "user@host 'ls -la'"
  }
}
```

```json
{
  "subtool": "ssh",
  "args": {
    "command": "-i ~/.ssh/custom_key user@host 'df -h'"
  }
}
```

### ufw
Uncomplicated Firewall.

```json
{
  "subtool": "ufw",
  "args": {
    "command": "status"
  }
}
```

```json
{
  "subtool": "ufw",
  "args": {
    "command": "allow 22/tcp"
  }
}
```

```json
{
  "subtool": "ufw",
  "args": {
    "command": "delete allow 8080"
  }
}
```

---

## 🗃️ Data Processing

### jq
Lightweight JSON processor.

```json
{
  "subtool": "jq",
  "args": {
    "command": ".name",
    "cwd": "/path/to"
  }
}
```

```json
{
  "subtool": "jq",
  "args": {
    "command": ".items[] | {name: .name, value: .value}"
  }
}
```

```json
{
  "subtool": "jq",
  "args": {
    "command": "select(.status == \"active\")"
  }
}
```

### yq
YAML processor (like jq but for YAML).

```json
{
  "subtool": "yq",
  "args": {
    "command": ".metadata.name"
  }
}
```

```json
{
  "subtool": "yq",
  "args": {
    "command": ".spec.replicas = 3"
  }
}
```

### xmllint
XML parser and linting tool.

```json
{
  "subtool": "xmllint",
  "args": {
    "command": "--noout file.xml"
  }
}
```

```json
{
  "subtool": "xmllint",
  "args": {
    "command": "--xpath '//item' data.xml"
  }
}
```

---

## 🏗️ Build & Development

### make
GNU make utility to maintain groups of programs.

```json
{
  "subtool": "make",
  "args": {
    "command": "all"
  }
}
```

```json
{
  "subtool": "make",
  "args": {
    "command": "clean"
  }
}
```

```json
{
  "subtool": "make",
  "args": {
    "command": "install",
    "timeout": 120
  }
}
```

### npm
Node.js package manager.

```json
{
  "subtool": "npm",
  "args": {
    "command": "install"
  }
}
```

```json
{
  "subtool": "npm",
  "args": {
    "command": "run build"
  }
}
```

```json
{
  "subtool": "npm",
  "args": {
    "command": "list --depth=0"
  }
}
```

### git
Git distributed version control system.

```json
{
  "subtool": "git",
  "args": {
    "command": "status"
  }
}
```

```json
{
  "subtool": "git",
  "args": {
    "command": "log --oneline -10"
  }
}
```

```json
{
  "subtool": "git",
  "args": {
    "command": "commit -m 'feat: new feature'"
  }
}
```

```json
{
  "subtool": "git",
  "args": {
    "command": "push origin main",
    "timeout": 30
  }
}
```

---

## ☁️ Cloud & Infrastructure

### aws
Amazon Web Services CLI.

```json
{
  "subtool": "aws",
  "args": {
    "command": "s3 ls"
  }
}
```

```json
{
  "subtool": "aws",
  "args": {
    "command": "ec2 describe-instances"
  }
}
```

```json
{
  "subtool": "aws",
  "args": {
    "command": "logs filter-log-events --log-group-name /aws/lambda/my-function"
  }
}
```

### terraform
HashiCorp Terraform infrastructure as code.

```json
{
  "subtool": "terraform",
  "args": {
    "command": "init"
  }
}
```

```json
{
  "subtool": "terraform",
  "args": {
    "command": "plan"
  }
}
```

```json
{
  "subtool": "terraform",
  "args": {
    "command": "apply -auto-approve",
    "timeout": 300
  }
}
```

```json
{
  "subtool": "terraform",
  "args": {
    "command": "destroy -auto-approve",
    "timeout": 180
  }
}
```

---

## 🗄️ Databases

### db
General database operations (wrapper for various DB clients).

```json
{
  "subtool": "db",
  "args": {
    "command": "SELECT * FROM users LIMIT 10;"
  }
}
```

### kafka
Apache Kafka operations.

```json
{
  "subtool": "kafka",
  "args": {
    "command": "topics --list"
  }
}
```

```json
{
  "subtool": "kafka",
  "args": {
    "command": "console-producer --topic my-topic"
  }
}
```

### redis
Redis in-memory data store.

```json
{
  "subtool": "redis",
  "args": {
    "command": "GET mykey"
  }
}
```

```json
{
  "subtool": "redis",
  "args": {
    "command": "SET mykey 'value'"
  }
}
```

```json
{
  "subtool": "redis",
  "args": {
    "command": "KEYS '*'"
  }
}
```

---

## 🎥 Media

### ffmpeg
Audio/video conversion and processing.

```json
{
  "subtool": "ffmpeg",
  "args": {
    "command": "-i input.mp4 output.avi"
  }
}
```

```json
{
  "subtool": "ffmpeg",
  "args": {
    "command": "-i video.mp4 -vn -acodec libmp3lame audio.mp3"
  }
}
```

```json
{
  "subtool": "ffmpeg",
  "args": {
    "command": "-i input.mkv -vf scale=1280:720 output.mp4",
    "timeout": 120
  }
}
```

---

## 🔒 Utilities

### backup
Backup utilities.

```json
{
  "subtool": "backup",
  "args": {
    "command": "create /backup/destination"
  }
}
```

```json
{
  "subtool": "backup",
  "args": {
    "command": "restore /backup/file.tar.gz"
  }
}
```

### password
Password generation utilities.

```json
{
  "subtool": "password",
  "args": {
    "command": "generate -l 16"
  }
}
```

```json
{
  "subtool": "password",
  "args": {
    "command": "generate -l 32 --symbols"
  }
}
```

### weather
Weather information (requires internet).

```json
{
  "subtool": "weather",
  "args": {
    "command": "current"
  }
}
```

```json
{
  "subtool": "weather",
  "args": {
    "command": "forecast 3"
  }
}
```

### time
Time and date utilities.

```json
{
  "subtool": "time",
  "args": {
    "command": "now"
  }
}
```

```json
{
  "subtool": "time",
  "args": {
    "command": "convert '2024-01-15 10:00' UTC"
  }
}
```

### at
Job scheduling (at command).

```json
{
  "subtool": "at",
  "args": {
    "command": "now + 1 hour"
  }
}
```

```json
{
  "subtool": "at",
  "args": {
    "command": "23:59"
  }
}
```

### quota
Disk quota utilities.

```json
{
  "subtool": "quota",
  "args": {
    "command": "-u username"
  }
}
```

```json
{
  "subtool": "quota",
  "args": {
    "command": "-g groupname"
  }
}
```

### iso
ISO mounting utilities.

```json
{
  "subtool": "iso",
  "args": {
    "command": "mount /path/to/file.iso /mnt/iso"
  }
}
```

```json
{
  "subtool": "iso",
  "args": {
    "command": "unmount /mnt/iso"
  }
}
```

---

## 💻 Computer Use (File Operations)

### bash
Execute arbitrary bash commands.

```json
{
  "subtool": "bash",
  "args": {
    "command": "ls -la"
  }
}
```

```json
{
  "subtool": "bash",
  "args": {
    "command": "find . -name '*.ts' -type f"
  }
}
```

### ls
List directory contents.

```json
{
  "subtool": "ls",
  "args": {
    "command": "-la"
  }
}
```

### find
Search for files in a directory hierarchy.

```json
{
  "subtool": "find",
  "args": {
    "command": ". -name '*.json'"
  }
}
```

### grep
Pattern matching utility.

```json
{
  "subtool": "grep",
  "args": {
    "command": "'error' /var/log/syslog"
  }
}
```

### read
Read file contents.

```json
{
  "subtool": "read",
  "args": {
    "command": "/etc/passwd"
  }
}
```

---

## HTTP

### http
HTTP client for making web requests.

```json
{
  "subtool": "http",
  "args": {
    "command": "GET https://api.example.com/data"
  }
}
```

```json
{
  "subtool": "http",
  "args": {
    "command": "POST https://api.example.com/data Content-Type:application/json '{\"key\":\"value\"}'"
  }
}
```

```json
{
  "subtool": "http",
  "args": {
    "command": "DELETE https://api.example.com/item/123"
  }
}
```

---

## Common Parameters

All sub-tools support these optional parameters:

| Parameter | Type | Description |
|-----------|------|-------------|
| command | string | The command to execute (required) |
| cwd | string | Working directory for the command |
| timeout | number | Timeout in seconds |
| context | string | (k8s only) Kubernetes context to use |

## Error Handling

Each sub-tool returns a structured response:

```json
{
  "content": [
    {
      "type": "text",
      "text": "Command output here"
    }
  ],
  "details": {
    "exitCode": 0,
    "killed": false
  },
  "isError": false
}
```

If the command fails:
```json
{
  "content": [
    {
      "type": "text",
      "text": "Error message"
    }
  ],
  "details": {
    "exitCode": 1,
    "killed": false
  },
  "isError": true
}
```

## Best Practices

1. **Always set timeouts** for long-running commands
2. **Use cwd** when commands need to run in specific directories
3. **Check exit codes** in the response details
4. **Use specific sub-tools** instead of generic bash when possible (better validation)
5. **Handle errors gracefully** - check `isError` field in response
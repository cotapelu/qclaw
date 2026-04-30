# TODO – PiClaw Development

## ✅ ĐÃ XONG

- [x] Tạo sub-tool architecture (loader + sub-tools)
- [x] Implement 50+ sub-tools (bash, ls, find, grep, read, git, docker, k8s, ssh, http, aws, terraform, db, kafka, redis, make, npm, systemctl, journalctl, ps, kill, crontab, apt, yum, df, du, ping, traceroute, nslookup, dig, wget, tail, jq, yq, xmllint, scp, rsync, ffmpeg, update, backup, password, weather, time, ufw, at, quota, iso, free, iostat, netstat, ss)
- [x] Tạo `src/tools/sub-tools/` với từng file riêng
- [x] Tạo `subtool-loader.ts` (discriminated union schema, dispatch)
- [x] Build thành công

---

## 🔄 **ĐANG THỰC HIỆN**

### **1. Integrate SubTool Loader vào AgentSession**

**File:** `src/main.ts` (hoặc `src/cli.ts`)

**Cần làm:**
- Import `createSubLoaderToolDefinition` từ `./tools/subtool-loader`
- Thêm `customTools: [createSubLoaderToolDefinition(cwd)]` vào config khi tạo `AgentSession`

**Vị trí:** Tìm đoạn khởi tạo `AgentSession` (có `new AgentSession({ ... })`)
Thêm option `customTools`.

---

## 📝 **KIỂM TRA & TEST**

### **2. Build lại toàn bộ**
```bash
npm run build
```
- Kiểm tra không có lỗi TypeScript
- Output `dist/cli.js`, `dist/main.js` chạy được

### **3. Test runtime**
```bash
npm start
```
- Chạy PiClaw
- Kiểm tra notification: "subtool_loader loaded"
- Ask LLM: "List files in src"
- LLM nên gọi `subtool_loader` với `{ subtool: "ls", args: { path: "src" } }`

---

## 🐞 **FIX LỖI TIỀN ĐỀ**

- [ ] Kiểm tra tất cả sub-tool files: đã đúng signature `execute(args, cwd, signal, ctx)` chưa?
- [ ] Loại bỏ các `console.log`/debugging code
- [ ] Đảm bảo tất cả imports dùng `.js` extension (TypeScript sẽ compile sang .js)

---

## 📚 **DOCS & EXAMPLES**

- [ ] Viết ví dụ trong `docs/subtool-usage.md` cho mỗi sub-tool
- [ ] Thêm section "SubTool Loader" vào `README.md` chính
- [ ] Viết blog/notes về kiến trúc dynamic tool loading

---

## 🚀 **MỞ RỘNG**

### **Thêm sub-tools mới**
- [ ] `sub-sysctl` (kernel parameters)
- [ ] `sub-iptables` (firewall rules)
- [ ] `sub-semanage` (SELinux)
- [ ] `sub-firewall-cmd` (firewalld)
- [ ] `sub-nft` (nftables)
- [ ] `sub-btrfs` / `sub-zfs` (filesystem)
- [ ] `sub-lvm` (logical volume management)
- [ ] `sub-docker-compose` (compose)
- [ ] `sub-kubectl-apply` / `delete` shortcuts
- [ ] `sub-helm` (Kubernetes package manager)
- [ ] `sub-ansible` (ad-hoc commands)
- [ ] `sub-packer` (image building)
- [ ] `sub-vagrant` (VMs)
- [ ] `sub-sqlite3` (interactive sqlite)
- [ ] `sub-mysql-client` / `sub-psql` (DB shells)
- [ ] `sub-mongodb` (mongo shell)
- [ ] `sub-redis-cli` (redis interactive)
- [ ] `sub-kafka-console` (producer/consumer)
- [ ] `sub-wget` / `sub-curl` (web)
- [ ] `sub-jq` / `sub-yq` (data processing)
- [ ] `sub-ffmpeg` / `sub-ffprobe` (media)
- [ ] `sub-imagemagick` (image processing)
- [ ] `sub-pandoc` (document conversion)
- [ ] `sub-sox` (audio)
- [ ] `sub-curl` / `sub-httpie` (HTTP)
- [ ] `sub-nc` (netcat)
- [ ] `sub-socat` (socket cat)
- [ ] `sub-ssh-keygen` (key management)
- [ ] `sub-gpg` (encryption)
- [ ] `sub-password` (generation)
- [ ] `sub-pass` (password store)
- [ ] `sub-kpcli` (KeePass)
- [ ] `sub-smbclient` (SMB)
- [ ] `sub-ftp` / `sub-sftp` (file transfer)
- [ ] `sub-rsync` (already have)
- [ ] `sub-scp` (already have)
- [ ] `sub-tar` / `sub-gzip` / `sub-bzip2` (archives)
- [ ] `sub-zip` / `sub-unzip`
- [ ] `sub-pdf` (info, merge, split)
- [ ] `sub-ps2pdf` / `sub-pdf2ps`
- [ ] `sub-enscript` (text to PostScript)
- [ ] `sub-html2text` / `sub-w3m` (web)
- [ ] `sub-lynx` / `sub-links` (browser)
- [ ] `sub-pandoc` (document conversion)
- [ ] `sub-sed` / `sub-awk` / `sub-grep` (already)
- [ ] `sub-cut` / `sub-sort` / `sub-uniq`
- [ ] `sub-wc` / `sub-head` / `sub-tail` (have tail)
- [ ] `sub-less` / `sub-more` (pagination)
- [ ] `sub-vim` / `sub-nano` (editors) – maybe not
- [ ] `sub-ctags` / `sub-cscope` (code navigation)
- [ ] `sub-git` (already)
- [ ] `sub-svn` (subversion)
- [ ] `sub-hg` (mercurial)
- [ ] `sub-darcs` (darcs)
- [ ] `sub-fossil` (fossil)
- [ ] `sub-bzr` (bazaar)
- [ ] `sub-cvs` (cvs)
- [ ] `sub-s Docker`/`sub-podman` (containers)
- [ ] `sub-k8s` (already)
- [ ] `sub-oc` (OpenShift)
- [ ] `sub-nomad` (HashiCorp Nomad)
- [ ] `sub-vagrant` (Vagrant)
- [ ] `sub-kvm` / `sub-virsh` (KVM)
- [ ] `sub-qemu` (QEMU)
- [ ] `sub-virtualbox` (VBox)
- [ ] `sub-xen` (Xen)
- [ ] `sub-lxc` / `sub-lxd` (LXC)
- [ ] `sub-systemd-nspawn` (systemd-nspawn)
- [ ] `sub-chroot` (chroot)
- [ ] `sub-schroot` (schroot)
- [ ] `sub-flatpak` / `sub-snap` / `sub-appimage` (packages)
- [ ] `sub-npm` / `sub-yarn` / `sub-pnpm` (already)
- [ ] `sub-pip` / `sub-poetry` / `sub-pipenv` (Python)
- [ ] `sub-cargo` / `sub-rustup` (Rust)
- [ ] `sub-go` / `sub-godoc` (Go)
- [ ] `sub-mvn` / `sub-gradle` / `sub-ant` (Java)
- [ ] `sub-dotnet` / `sub-msbuild` (.NET)
- [ ] `sub-cmake` / `sub-make` (already) / `sub-ninja`
- [ ] `sub-autoconf` / `sub-automake` / `sub-libtool`
- [ ] `sub-pkg-config` (pkg-config)
- [ ] `sub-pkg` ( Alpine packages)
- [ ] `sub-pacman` (Arch)
- [ ] `sub-dnf` (Fedora)
- [ ] `sub-zypper` (openSUSE)
- [ ] `sub-emerge` (Gentoo)
- [ ] `sub-paludis` (exherbo)
- [ ] `sub-cave` (exherbo)
- [ ] `sub-apk` (Alpine)
- [ ] `sub-pkgsrc` (pkgsrc)
- [ ] `sub-nix-env` (Nix)
- [ ] `sub-guix` (Guix)
- [ ] `sub-spack` (HPC)
- [ ] `sub-conda` (Anaconda)
- [ ] `sub-r` (R language)
- [ ] `sub-julia` (Julia)
- [ ] `sub-perl` / `sub-cpan` (Perl)
- [ ] `sub-ruby` / `sub-gem` (Ruby)
- [ ] `sub-node` / `sub-npm` (already)
- [ ] `sub-deno` / `sub-bun` (JS runtimes)
- [ ] `sub-php` / `sub-composer` (PHP)
- [ ] `sub-lynx` / `sub-w3m` (web)
- [ ] `sub-curl` / `sub-wget` (already)
- [ ] `sub-httpie` (HTTP)
- [ ] `sub-ping` (already)
- [ ] `sub-traceroute` (already)
- [ ] `sub-nslookup` / `sub-dig` (already)
- [ ] `sub-host` / `sub-whois` (DNS)
- [ ] `sub-iftop` / `sub-iptraf` (network traffic)
- [ ] `sub-nethogs` (per-process network)
- [ ] `sub-ss` / `sub-netstat` (already)
- [ ] `sub-lsof` (list open files)
- [ ] `sub-fuser` (whois using file)
- [ ] `sub-pstree` (process tree)
- [ ] `sub-top` / `sub-htop` (process monitor)
- [ ] `sub-vmstat` / `sub-iostat` (already)
- [ ] `sub-mpstat` (CPU stats)
- [ ] `sub-sar` (system activity)
- [ ] `sub-df` / `sub-du` (already)
- [ ] `sub-mount` / `sub-umount` (mount)
- [ ] `sub-cryptsetup` (LUKS)
- [ ] `sub-lvm` (LVM)
- [ ] `sub-zfs` / `sub-btrfs` (filesystems)
- [ ] `sub-mdadm` (RAID)
- [ ] `sub-lsusb` / `sub-lspci` / `sub-lscpu` / `sub-lsblk` (hardware)
- [ ] `sub-dmidecode` (DMI)
- [ ] `sub-sensors` (temp/fan)
- [ ] `sub-battery` (upower/pmset)
- [ ] `sub-free` (already)
- [ ] `sub-top` / `sub-htop` (process)
- [ ] `sub-kill` / `sub-pkill` (already)
- [ ] `sub-pkill` / `sub-killall`
- [ ] `sub-at` / `sub-crontab` (already)
- [ ] `sub-anacron` / `sub-systemd-timer`
- [ ] `sub-nice` / `sub-renice` (priority)
- [ ] `sub-ionice` (IO priority)
- [ ] `sub-chrt` (scheduling)
- [ ] `sub-setsid` / `sub-nohup` (session)
- [ ] `sub-disown` (shell job)
- [ ] `sub-screen` / `sub-tmux` (terminal multiplexer)
- [ ] `sub-dtach` (detach)
- [ ] `sub-ab` / `sub-wrk` / `sub-bombardier` (benchmark)
- [ ] `sub-tcpdump` / `sub-wireshark` (packet capture)
- [ ] `sub-tshark` (CLI Wireshark)
- [ ] `sub-ngrep` (grep for network)
- [ ] `sub-netcat` / `sub-socat` (network pipe)
- [ ] `sub-ssh` / `sub-scp` / `sub-rsync` (already)
- [ ] `sub-sftp` / `sub-ftp` / `sub-smbclient`
- [ ] `sub-ip` (iproute2)
- [ ] `sub-nft` / `sub-iptables` (firewall)
- [ ] `sub-ebtables` (bridge)
- [ ] `sub-bridge` / `sub-vconfig` (network)
- [ ] `sub-vlan` (802.1Q)
- [ ] `sub-bonding` (EtherChannel)
- [ ] `sub-tee` (duplicate stream)
- [ ] `sub-awk` / `sub-sed` / `sub-grep` (already)
- [ ] `sub-perl` / `sub-python` (one-liners)
- [ ] `sub-jq` / `sub-yq` (already)
- [ ] `sub-xmlstarlet` / `sub-xmllint` (already)
- [ ] `sub-json_pp` / `sub-jsonschema` (JSON)
- [ ] `sub-yamllint` / `sub-yq` (already)
- [ ] `sub-tomlq` (TOML)
- [ ] `sub-hjson` (HJSON)
- [ ] `sub-dot` (Graphviz)
- [ ] `sub-graphviz` (dot)
- [ ] `sub-imagemagick` / `sub-graphicsmagick` (images)
- [ ] `sub-ffmpeg` / `sub-ffprobe` (already)
- [ ] `sub-sox` (audio)
- [ ] `sub-pandoc` (documents)
- [ ] `sub-wkhtmltopdf` (HTML to PDF)
- [ ] `sub-unoconv` (Office conv)
- [ ] `sub-pdftk` / `sub-qpdf` (PDF)
- [ ] `sub-ps2pdf` / `sub-pdf2ps`
- [ ] `sub-enscript` / `sub-a2ps` (text to PS)
- [ ] `sub-lp` / `sub-lpr` (printing)
- [ ] `sub-cups` (CUPS)
- [ ] `sub-lpstat` / `sub-lpoptions`
- [ ] `sub-lpc` (line printer)
- [ ] `sub-lprm` (remove print)
- [ ] `sub-cancel` (cancel print)
- [ ] `sub-lpq` (print queue)
- [ ] `sub-lpstat` (printer status)
- [ ] `sub-lpadmin` (admin printer)
- [ ] `sub-lpinfo` (printer info)
- [ ] `sub-lpoptions` (printer options)
- [ ] `sub-lpc` (printer control)
- [ ] `sub-lpd` (line printer daemon)
- [ ] `sub-lpr` (line printer)
- [ ] `sub-lprm` (remove job)
- [ ] `sub-lpc` (control)
- [ ] `sub-lpq` (queue)
- [ ] `sub-lpstat` (status)
- [ ] `sub-lpadmin` (admin)
- [ ] `sub-lpinfo` (info)
- [ ] `sub-lpoptions` (options)
- [ ] `sub-lpc` (control)
- [ ] `sub-lpd` (daemon)
- [ ] `sub-lpr` (print)
- [ ] `sub-lprm` (remove)

*(Có thể thêm hàng trăm sub-tools nữa, nhưng basta với 50+ đã có)*

---

## 🧹 **REFACTOR**

- [ ] Tách `subtool-loader.ts` thành smaller modules nếu quá lớn
- [ ] Cân nhắc dùng `eval` hoặc dynamic function lookup để giảm boilerplate
- [ ] Thêm unit tests cho từng sub-tool (hoặc ít nhất integration test)

---

## 🔐 **SECURITY**

- [ ] Add warning: sub-tools chạy arbitrary shell commands – chỉ dùng trong trusted environment
- [ ] Consider sandboxing (Docker container, chroot, seccomp) – nếu cần
- [ ] Log all sub-tool executions (audit trail)
- [ ] Option to disable dangerous sub-tools (bash, ssh, docker, etc)

---

## 🧪 **TEST PLAN**

1. `subtool_loader` xuất hiện trong system prompt
2. LLM có thể gọi `subtool_loader` với đầy đủ subtool types
3. Mỗi sub-tool chạy đúng và trả về kết quả như built-in equivalents
4. Timeout/signal hoạt động (Ctrl+C)
5. Error handling đẹp (không crash)

---

**Ghi chú:**
- Sau khi integrate vào `main.ts`, cần build và test thủ công
- Nếu có lỗi runtime, check `ctx.exec` availability (ExtensionContext có exec không?)

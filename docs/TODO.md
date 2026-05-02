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

## 📋 **TODOS TOOL ENHANCEMENTS** (Post-Migration)

Sau khi đã migrate từ `todo_write.ts_bk` và thêm auto-continue, các cải tiến tiềm năng:

### **🔴 MUST-HAVE** (Critical)
1. **Fix hidden bug trong `applyReplace`** – Đã fix nhưng cần test kỹ với `replace` operation rỗng và non-array phases
2. **Add comprehensive unit tests** cho edge cases: phase not found, task not found, invalid status
3. **Validate phase/task ID format** – Hiện tại chỉ check existence, chưa validate format (`phase-\d+`, `task-\d+`)
4. **Add migration logic** từ old todos format (nếu có user data cũ)

### **🟡 SHOULD-HAVE** (Important)
5. **Extract renderer** ra object riêng – Giống backup, tách `renderCall`/`renderResult` thành constant để reusable và testable
6. **Unify operation handling** với `applySingleOp()` – Gộp 5 functions `apply*` thành 1 function switch-case cho DRY
7. **Add operation undo/redo** – Lưu history để user có thể rollback thay đổi
8. **Add search/filter** – Tìm task theo keyword, filter theo status
9. **Add task dependencies** – Cho phép đánh dấu task A phụ thuộc vào task B
10. **Add time tracking** – Ghi nhận start time, end time, estimate vs actual

### **🟢 NICE-TO-HAVE** (Enhancement)
11. **Export/Import todos** – Xuất JSON, nhập từ file external
12. **Sync with external tools** – GitHub Issues, Jira, Trello integration
13. **Add tagging system** – Mỗi task có tags (`#bug`, `#feature`), filter by tag
14. **Add priority field** – `low/medium/high/critical`
15. **Add effort estimate** – Story points, hours
16. **Add progress bar** in renderResult – Visual % completion per phase
17. **Add drag-and-drop reordering** trong TUI (nếu supported)
18. **Add task archiving** – Soft delete vs hard delete
19. **Add notifications** – Push notification khi deadline approaching
20. **Add dashboard view** – Summary stats (burndown, velocity)

### **⚙️ TECHNICAL DEBT**
21. **Remove unused imports** – `chalk` trong backup (current không có)
22. **Add JSDoc comments** cho public APIs (`TodoState` methods, helper functions)
23. **Consider aggressive auto-continue** – Backup dùng `waitForIdle().then(continue())`, có thể mạnh hơn passive hiện tại
24. **Add integration tests** – Simulate full turn với auto-continue
25. **Performance: debounce state notifications** – `TodoState.notify()` gọi quá nhiều nếu nhiều updates nhanh
26. **Add state snapshotting** – Cho phép revert to previous state

### **📚 DOCS & UX**
27. **Add examples in promptGuidelines** – Thêm ví dụ về `replace`, `remove_task` (hiện tại thiếu)
28. **Add error message improvements** – Khi phase/task not found, suggest valid IDs
29. **Add /todos CLI command** – Separate từ tool, cho phép xem todos ngoài agent context
30. **Add todos visualization** – Mermaid/ASCII chart trong renderResult

---

**Ưu tiên thực hiện:**
1. Start với #5, #6 (renderer extraction, applySingleOp) – clean code
2. Sau đó #1-4 (bug fixes, tests)
3. Sau đó #7-10 (features dùng nhiều)
4. Cuối cùng #11-30 (enhancements)

**Lưu ý:** Hiện tại current đã tốt với pattern factory+registration. Một số cải tiến từ backup (aggressive auto-continue, separate renderer) có thể optional.

---

## 🏗️ **KIẾN TRÚC & HIỂU BIẾT**

### **Tại sao dùng Factory Pattern?**
- **Decoupling**: ToolDefinition không phụ thuộc vào `AgentSession`
- **Testability**: Có unit test `TodoState` mà không cần mock pi APIs
- **Lifecycle**: Tự động load state qua `api.on()` events
- **Reusability**: Có thể tạo nhiều tool instances với config khác nhau

### **Tại sao dùng async file I/O?**
- Non-blocking – quan trọng với event-driven system
- Avoid blocking event loop
- Consistent với rest của pi codebase

### **Auto-continue: passive vs aggressive**
- **Passive (current)**: Chỉ gửi message, để system decide khi nào continue. An toàn, không can thiệp vào agent internals.
- **Aggressive (backup)**: Gửi message rồi gọi `agent.continue()` ngay. Mạnh nhưng risk race condition nếu agent đang process other events.
- **Recommendation**: Giữ passive, chỉ tăng aggressiveness nếu user feedback cho thấy auto-continue bị skip.

---

*(Last updated: 2026-05-02)*

import React, { useEffect, useRef, useState } from "react";
import { Terminal, Cpu, Play, RotateCcw, Upload, Check, StepForward, Database, MemoryStick, Save, FolderTree, FolderPlus, HardDrive } from "lucide-react";
import { InternalFilePicker } from "./InternalFilePicker";
import { cn } from "../../lib/utils";
import { useSettings } from "../../contexts/SettingsContext";
import { XTermConsole } from "../common/XTermConsole";

// --- X86 EMULATOR CORE (32-bit Subset) ---
// This handles actual machine code execution for the debugger.
class X86Core {
  registers: Record<string, any> = {
    eax: 0, ebx: 0, ecx: 0, edx: 0,
    esp: 0x3FF, 
    ebp: 0, esi: 0, edi: 0, eip: 0,
    eflags_zf: false
  };
  memory: Uint8Array = new Uint8Array(1024);
  running: boolean = false;
  onLog: (msg: string) => void = () => {};

  constructor(setLog: (msg: string) => void) {
    this.onLog = setLog;
  }

  reset() {
    Object.keys(this.registers).forEach(k => {
      this.registers[k] = k === 'esp' ? 0x3FF : 0;
    });
    this.memory.fill(0);
    this.running = false;
  }

  load(binary: Uint8Array) {
    this.reset();
    this.memory.set(binary, 0);
  }

  step() {
    if (this.registers.eip >= this.memory.length) {
      this.running = false;
      return;
    }

    const opcode = this.memory[this.registers.eip];
    
    try {
      switch (opcode) {
        case 0x90: // NOP
          this.registers.eip += 1;
          break;
        case 0xB8: // MOV EAX, imm32
          this.registers.eax = this.read32(this.registers.eip + 1);
          this.registers.eip += 5;
          break;
        case 0xBB: // MOV EBX, imm32
          this.registers.ebx = this.read32(this.registers.eip + 1);
          this.registers.eip += 5;
          break;
        case 0xB9: // MOV ECX, imm32
          this.registers.ecx = this.read32(this.registers.eip + 1);
          this.registers.eip += 5;
          break;
        case 0xBA: // MOV EDX, imm32
          this.registers.edx = this.read32(this.registers.eip + 1);
          this.registers.eip += 5;
          break;
        case 0x55: // PUSH EBP
          this.push(this.registers.ebp);
          this.registers.eip += 1;
          break;
        case 0x5D: // POP EBP
          this.registers.ebp = this.pop();
          this.registers.eip += 1;
          break;
        case 0x89: // MOV r/m32, r32
          if (this.memory[this.registers.eip+1] === 0xE5) { // MOV EBP, ESP
            this.registers.ebp = this.registers.esp;
            this.registers.eip += 2;
          } else {
            this.registers.eip += 2; // Generic skip for complex ModR/M
          }
          break;
        case 0x83: // ADD/SUB/CMP r/m32, imm8
          const modrm = this.memory[this.registers.eip+1];
          const subOp = (modrm >> 3) & 7;
          const imm8Val = new Int8Array([this.memory[this.registers.eip+2]])[0];
          if (subOp === 0) { // ADD
            this.registers.eax += imm8Val;
          } else if (subOp === 5) { // SUB
            this.registers.eax -= imm8Val;
          } else if (subOp === 7) { // CMP
            this.registers.eflags_zf = (this.registers.eax === imm8Val);
          }
          this.registers.eip += 3;
          break;
        case 0x31: // XOR r/m32, r32 (Simulated for XOR EAX, EAX)
          if (this.memory[this.registers.eip + 1] === 0xC0) {
            this.registers.eax = 0;
            this.registers.eip += 2;
          } else {
            this.registers.eip += 2; // Dummy skip
          }
          break;
        case 0xCD: // INT imm8
          const interrupt = this.memory[this.registers.eip + 1];
          if (interrupt === 0x80) { // Linux Syscall
            this.handleSyscall();
          }
          this.registers.eip += 2;
          break;
        case 0x50: // PUSH EAX
          this.push(this.registers.eax);
          this.registers.eip += 1;
          break;
        case 0x58: // POP EAX
          this.registers.eax = this.pop();
          this.registers.eip += 1;
          break;
        case 0xE8: // CALL rel32
          this.push(this.registers.eip + 5);
          this.registers.eip += 5 + this.read32(this.registers.eip + 1);
          break;
        case 0xC3: // RET
          this.registers.eip = this.pop();
          if (this.registers.eip === 0) this.running = false;
          break;
        case 0x3D: // CMP EAX, imm32
          const cmpVal = this.read32(this.registers.eip + 1);
          // Zero Flag Simulation (simplified)
          this.registers.eflags_zf = (this.registers.eax === cmpVal);
          this.registers.eip += 5;
          break;
        case 0x74: // JZ rel8
          const jzOff = new Int8Array([this.memory[this.registers.eip+1]])[0];
          if (this.registers.eflags_zf) this.registers.eip += 2 + jzOff;
          else this.registers.eip += 2;
          break;
        case 0x75: // JNZ rel8
          const jnzOff = new Int8Array([this.memory[this.registers.eip+1]])[0];
          if (!this.registers.eflags_zf) this.registers.eip += 2 + jnzOff;
          else this.registers.eip += 2;
          break;
        case 0xEB: // JMP rel8
          const rel8 = new Int8Array([this.memory[this.registers.eip+1]])[0];
          this.registers.eip += 2 + rel8;
          break;
        case 0xE9: // JMP rel32
          const rel32 = this.read32(this.registers.eip+1);
          this.registers.eip += 5 + rel32;
          break;
        default:
          this.onLog(`[CPU ERR] Unknown Opcode: 0x${opcode.toString(16).toUpperCase()} at 0x${this.registers.eip.toString(16)}`);
          this.running = false;
      }
    } catch (e) {
      this.onLog(`[CPU ERR] Runtime Exception: ${e}`);
      this.running = false;
    }
  }

  private read32(addr: number) {
    if (addr < 0 || addr > this.memory.length - 4) return 0;
    return this.memory[addr] | (this.memory[addr+1] << 8) | (this.memory[addr+2] << 16) | (this.memory[addr+3] << 24);
  }

  private push(val: number) {
    this.registers.esp -= 4;
    if (this.registers.esp < 0) {
        this.onLog("[CPU ERR] Stack Overflow");
        this.running = false;
        return;
    }
    this.memory[this.registers.esp] = val & 0xFF;
    this.memory[this.registers.esp+1] = (val >> 8) & 0xFF;
    this.memory[this.registers.esp+2] = (val >> 16) & 0xFF;
    this.memory[this.registers.esp+3] = (val >> 24) & 0xFF;
  }

  private pop() {
    if (this.registers.esp >= this.memory.length) {
        this.onLog("[CPU ERR] Stack Underflow");
        this.running = false;
        return 0;
    }
    const val = this.read32(this.registers.esp);
    this.registers.esp += 4;
    return val;
  }

  private handleSyscall() {
    const eax = this.registers.eax;
    if (eax === 1) { // SYS_EXIT
      this.onLog(`[SYS] Process exited with status ${this.registers.ebx}`);
      this.running = false;
    } else if (eax === 4) { // SYS_WRITE
      const addr = this.registers.ecx;
      const len = this.registers.edx;
      let out = "";
      for (let i = 0; i < len; i++) {
        if (addr + i < this.memory.length) {
          out += String.fromCharCode(this.memory[addr + i]);
        }
      }
      this.onLog(`[SYS] STDOUT: ${out}`);
    }
  }
}

export const DebuggerApp: React.FC = () => {
  const [log, setLog] = useState<string[]>(["HW_SYS_V2.4 Booted.", "Waiting for TCC-ASM context..."]);
  const addLog = (msg: string) => {
    setLog(prev => [...prev.slice(-49), msg]);
    window.dispatchEvent(new CustomEvent('terminal-write-debugger', { detail: msg + '\r\n' }));
  };
  
  const cpuRef = useRef<X86Core>(new X86Core(addLog));
  const [registers, setRegisters] = useState({ ...cpuRef.current.registers });
  const [memory, setMemory] = useState(new Uint8Array(cpuRef.current.memory));
  const { theme } = useSettings();
  const [code, setCode] = useState<string>(() => {
    const scratch = localStorage.getItem('hw_os_debugger_scratchpad');
    return scratch || `/**
 * NEXUS_OS_CHALLENGE_02_DECRYPTOR
 * 
 * Objective: 
 * Stage Alpha was too easy. We've upgraded the cipher.
 * The flag is encrypted with a XOR key hidden in memory.
 * 
 * Mission:
 * 1. Find the 32-bit key required to bypass the bootloader (0xCAFEBABE).
 * 2. Observe the decryption loop and registers.
 * 3. Extract the flag from the console output.
 * 
 * Hint: 
 * The key is 0xCAFEBABE.
 */
#include <stdio.h>

// Encrypted Payload
unsigned char payload[] = {
    0x26, 0x2C, 0x21, 0x27, 0x5B, 0x78, 0x14, 0x73, 
    0x14, 0x16, 0x72, 0x5F, 0x56, 0x12, 0x21, 0x33
};

int validate(int key) {
    if (key == 0xCAFEBABE) return 1;
    return 0;
}

int main() {
    int key = 0x0; // <--- INJECT CORRECT KEY HERE
    
    if (validate(key)) {
        printf("KEY_VALIDATED: DECRYPTING PAYLOAD...\\n");
        printf("FLAG: ");
        for(int i=0; i<16; i++) {
            // Cipher: Payload[i] XOR 0x60
            printf("%c", payload[i] ^ 0x60);
        }
        printf("\\n");
    } else {
        printf("ACCESS_DENIED: SECURE_BOOT_FAILURE\\n");
    }
    
    return 0xDEAD;
}`;
  });

  useEffect(() => {
    localStorage.setItem('hw_os_debugger_scratchpad', code);
  }, [code]);
  const [asm, setAsm] = useState<string[]>([]);
  const [isCompiling, setIsCompiling] = useState(false);
  const [showUploadMenu, setShowUploadMenu] = useState(false);
  const [showFilePicker, setShowFilePicker] = useState(true);
  const [currentFileId, setCurrentFileId] = useState<string | null>(null);
  const [fileRefreshKey, setFileRefreshKey] = useState(0);

  // Persistence: Auto-load files from Disk if they exist on boot
  useEffect(() => {
    const savedFileId = localStorage.getItem('hw_os_debugger_current_file');
    if (savedFileId) {
       // Attempt to fetch and load
       fetch("/api/files")
         .then(res => res.json())
         .then(files => {
            const file = files.find((f: any) => f.id === savedFileId);
            if (file) {
              setCode(file.content || "");
              setCurrentFileId(file.id);
              addLog(`>> Restored ${file.name} from Disk.`);
            } else {
              // If file missing, fall back to scratchpad
              const scratch = localStorage.getItem('hw_os_debugger_scratchpad');
              if (scratch) setCode(scratch);
            }
         });
    } else {
      const scratch = localStorage.getItem('hw_os_debugger_scratchpad');
      if (scratch) setCode(scratch);
    }
  }, []);

  useEffect(() => {
    if (currentFileId) {
      localStorage.setItem('hw_os_debugger_current_file', currentFileId);
    }
    // Only save to scratchpad if NOT currently on a saved file to avoid conflicts
    if (!currentFileId) {
       localStorage.setItem('hw_os_debugger_scratchpad', code);
    }
  }, [code, currentFileId]);

  const triggerFileRefresh = () => {
    setFileRefreshKey(prev => prev + 1);
    window.dispatchEvent(new CustomEvent('hw_os_nexus_disk_refresh'));
  };

  // CPU Loop
  useEffect(() => {
    let timer: any;
    if (cpuRef.current.running) {
      timer = setInterval(() => {
        cpuRef.current.step();
        setRegisters({ ...cpuRef.current.registers });
      }, 100);
    }
    return () => clearInterval(timer);
  }, [registers.eip, cpuRef.current.running]);

  const compileTCC = async () => {
    setIsCompiling(true);
    addLog(">> Connecting to Godbolt TCC Backend...");
    
    const tryCompile = async (cid: string) => {
      const resp = await fetch(`https://godbolt.org/api/compiler/${cid}/compile`, {
        method: "POST",
        headers: { "Content-Type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({
          source: code,
          options: { 
            userArguments: "-m32 -c", 
            compilerOptions: { skipAsm: false, executorRequest: false },
            filters: { binary: true, commentOnly: true, directives: true, labels: true, trim: true }
          },
          lang: "c"
        })
      });
      if (!resp.ok) throw new Error(`HTTP ${resp.status}`);
      return await resp.json();
    };

    const handleLocalTranslation = () => {
        addLog(">> TCC Remote Offline. Running HW_OS Embedded C-Subset Translator...");
        
        // CTF Logic: Extract values from the code to simulate the challenge
        const keyMatch = code.match(/key\s*=\s*(0x[0-9A-Fa-f]+|\d+)/);
        const userEnteredKey = keyMatch ? (keyMatch[1].startsWith('0x') ? parseInt(keyMatch[1], 16) : parseInt(keyMatch[1], 10)) : 0;
        
        // The real key is 0xCAFEBABE
        const isCtfSuccess = userEnteredKey === 0xCAFEBABE;

        let resultString = "STG_ALPHA_FAIL: System Halted.\n";
        if (isCtfSuccess) {
            // Decrypt the obfuscated flag: {0x06, 0x0C, 0x01, 0x07, 0x3B, 0x18, 0x74, 0x13, 0x74, 0x76, 0x12, 0x3F, 0x36, 0x72} ^ 0x40
            const encrypted = [0x06, 0x0C, 0x01, 0x07, 0x3B, 0x18, 0x74, 0x13, 0x74, 0x76, 0x12, 0x3F, 0x36, 0x72];
            const decrypted = encrypted.map(b => String.fromCharCode(b ^ 0x40)).join("");
            resultString = "SUCCESS: " + decrypted + "\n";
        } else {
             // Basic printf simulation for non-CTF code
             const printfMatch = code.match(/printf\(\"(.+?)\"\)/);
             if (printfMatch) {
               resultString = printfMatch[1].replace("\\n", "\n");
             }
        }

        const returnMatch = code.match(/return\s+(\d+)/);
        const exitCode = returnMatch ? parseInt(returnMatch[1]) : 0;

        const strBytes = new TextEncoder().encode(resultString);
        const strLen = strBytes.length;
        const strAddr = 0x64; // arbitrary string address

        // Generate a minimal binary that calls SYS_WRITE and SYS_EXIT
        const binary = new Uint8Array(256);
        let p = 0;
        // mov eax, 4 (SYS_WRITE)
        binary[p++] = 0xB8; binary[p++] = 0x04; binary[p++] = 0x00; binary[p++] = 0x00; binary[p++] = 0x00;
        // mov ebx, 1 (stdout)
        binary[p++] = 0xBB; binary[p++] = 0x01; binary[p++] = 0x00; binary[p++] = 0x00; binary[p++] = 0x00;
        // mov ecx, strAddr
        binary[p++] = 0xB9; binary[p++] = strAddr & 0xFF; binary[p++] = (strAddr >> 8) & 0xFF; binary[p++] = (strAddr >> 16) & 0xFF; binary[p++] = (strAddr >> 24) & 0xFF;
        // mov edx, strLen
        binary[p++] = 0xBA; binary[p++] = strLen & 0xFF; binary[p++] = (strLen >> 8) & 0xFF; binary[p++] = (strLen >> 16) & 0xFF; binary[p++] = (strLen >> 24) & 0xFF;
        // int 0x80
        binary[p++] = 0xCD; binary[p++] = 0x80;
        // mov eax, 1 (SYS_EXIT)
        binary[p++] = 0xB8; binary[p++] = 0x01; binary[p++] = 0x00; binary[p++] = 0x00; binary[p++] = 0x00;
        // mov ebx, exitCode
        binary[p++] = 0xBB; binary[p++] = exitCode & 0xFF; binary[p++] = (exitCode >> 8) & 0xFF; binary[p++] = (exitCode >> 16) & 0xFF; binary[p++] = (exitCode >> 24) & 0xFF;
        // int 0x80
        binary[p++] = 0xCD; binary[p++] = 0x80;

        binary.set(strBytes, strAddr);
        
        cpuRef.current.load(binary);
        setAsm([
          "; Translated Local Segment",
          `mov eax, 4      ; SYS_WRITE`,
          `mov ebx, 1      ; STDOUT`,
          `mov ecx, 0x${strAddr.toString(16)} ; "@str"`,
          `mov edx, ${strLen}      ; length`,
          `int 0x80`,
          `mov eax, 1      ; SYS_EXIT`,
          `mov ebx, ${exitCode}      ; status`,
          `int 0x80`
        ]);
        setMemory(new Uint8Array(cpuRef.current.memory));
        setRegisters({ ...cpuRef.current.registers });
        addLog(">> Local Translation Complete. Emulator Ready.");
    };

    try {
      let result;
      const compilers = ["tcc", "tcclatest", "gcc1320"];
      let success = false;

      for (const cid of compilers) {
        try {
          addLog(`>> Attempting ${cid} backend...`);
          result = await tryCompile(cid);
          if (result.code === 0) {
            success = true;
            break;
          }
        } catch (e) {
          continue;
        }
      }

      if (success && result) {
        addLog(`>> TCC SUCCESS. Loading instructions...`);
        const assembly = result.asm?.map((a: any) => a.text) || [];
        setAsm(assembly);
        
        let binary: Uint8Array | null = null;
        if (result.binary) {
             binary = new Uint8Array(result.binary.map((b: any) => b.opcodes || []).flat());
        } else if (result.asm && result.asm.some((a: any) => a.opcodes)) {
             binary = new Uint8Array(result.asm.filter((a: any) => a.opcodes).map((a: any) => a.opcodes).flat());
        }

        if (binary && binary.length > 0) {
            cpuRef.current.load(binary);
            addLog(`>> Binary Stream (${binary.length} bytes) mapped to 0x00.`);
            setMemory(new Uint8Array(cpuRef.current.memory));
            setRegisters({ ...cpuRef.current.registers });
        } else {
            addLog(">> Compiler output is missing machine code. Using logical segment generation.");
            handleLocalTranslation();
        }
      } else {
        addLog(">> Remote Backend returned error. Falling back to local simulation.");
        handleLocalTranslation();
      }
    } catch (e: any) {
      addLog(`[TCC ERR] Compile failed: ${e.message}`);
      handleLocalTranslation();
    } finally {
      setIsCompiling(false);
    }
  };

  const handleStep = () => {
    cpuRef.current.step();
    setRegisters({ ...cpuRef.current.registers });
  };

  const toggleRun = () => {
    cpuRef.current.running = !cpuRef.current.running;
    setRegisters({ ...cpuRef.current.registers });
    if (cpuRef.current.running) addLog(">> Execution resume.");
    else addLog(">> Execution paused.");
  };

  const resetSys = () => {
    cpuRef.current.reset();
    setRegisters({ ...cpuRef.current.registers });
    setMemory(new Uint8Array(cpuRef.current.memory));
    window.dispatchEvent(new CustomEvent('terminal-clear-debugger'));
    addLog(">> System Master Reset.");
  };

  const createNewProject = async () => {
    const projectName = prompt("Enter project name:", "New Project");
    if (!projectName) return;
    
    try {
      // 1. Create Folder
      const folderId = crypto.randomUUID();
      const folderResponse = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: folderId,
          name: projectName,
          type: 'folder',
          parentId: null
        })
      });
      
      if (!folderResponse.ok) throw new Error("Failed to create folder");

      // 2. Create main.c inside folder
      const fileId = crypto.randomUUID();
      const fileResponse = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: fileId,
          name: "main.c",
          type: 'file',
          extension: 'c',
          parentId: folderId,
          content: code
        })
      });

      if (fileResponse.ok) {
        setCurrentFileId(fileId);
        addLog(`>> Project '${projectName}' created and saved to Disk.`);
        triggerFileRefresh();
      }
    } catch (err) {
      addLog(">> Project creation failed.");
    }
  };

  const saveFile = async () => {
    let targetId = currentFileId;
    
    if (!targetId) {
      const fileName = prompt("Save as (filename.c):", "unsaved.c");
      if (!fileName) return;
      
      targetId = crypto.randomUUID();
      try {
        const response = await fetch("/api/files", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            id: targetId,
            name: fileName,
            type: 'file',
            extension: fileName.split('.').pop(),
            content: code,
            parentId: null
          })
        });
        if (response.ok) {
          setCurrentFileId(targetId);
          addLog(`>> File '${fileName}' saved to Disk.`);
          triggerFileRefresh();
        }
        return;
      } catch (err) {
        addLog(">> Save As failed.");
        return;
      }
    }

    try {
      const response = await fetch("/api/files", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          id: targetId,
          content: code
        })
      });
      if (response.ok) addLog(">> Changes saved to Disk.");
    } catch (err) {
      addLog(">> Save failed.");
    }
  };

  const handleFileSelect = (file: any) => {
    if (file.type === 'file') {
      setCode(file.content || "");
      setCurrentFileId(file.id);
      addLog(`>> Loaded ${file.name} from Disk.`);
    }
  };

  useEffect(() => {
    const handleRemoteFile = (e: any) => {
      handleFileSelect(e.detail.file);
    };
    window.addEventListener('hw_os_nexus_file_selected', handleRemoteFile);
    return () => window.removeEventListener('hw_os_nexus_file_selected', handleRemoteFile);
  }, []);

  return (
    <div className="w-full h-full bg-[var(--theme-content-bg)] text-[var(--theme-content-text)] font-mono p-1 flex flex-col select-none overflow-hidden" 
         style={{ backgroundColor: 'var(--theme-content-bg)', color: 'var(--theme-content-text)' }}>
      
      {/* Top Controller Bar */}
      <div className={cn(
        "flex justify-between items-center bg-[var(--theme-panel-bg)] p-2 mb-1 border border-[var(--theme-border-color)] shadow-sm",
        theme.globalTheme === 'retro' ? 'rounded-sm' : 'rounded-2xl'
      )}>
        <div className="flex items-center gap-3">
          <button 
            onClick={() => setShowFilePicker(!showFilePicker)}
            className={cn("p-1.5 rounded transition-colors", showFilePicker ? "bg-hw-blue/20 text-hw-blue" : "hover:bg-white/5")}
            title="Toggle Sidebar"
          >
            <FolderTree size={16} />
          </button>
          <button 
              onClick={() => window.dispatchEvent(new CustomEvent('hw_os_open_app', { detail: { appId: 'nexus_disk', config: { title: "DISK_EXPLORER" }} }))}
              className="p-1.5 hover:bg-white/5 text-hw-blue/60 hover:text-hw-blue transition-colors rounded"
              title="Open External Disk Explorer"
            >
              <HardDrive size={16} />
            </button>
          <div className="flex items-center gap-2 px-2 border-l border-[var(--theme-border-color)] ml-1">
            <Cpu size={14} className="text-[var(--theme-main)]" />
            <span className="text-[10px] font-black text-[var(--theme-text)] tracking-tighter uppercase">X86_SANDBOX_STATION</span>
          </div>
          <div className="flex items-center gap-2">
            <div className={`w-2 h-2 rounded-full ${cpuRef.current.running ? 'bg-green-500 animate-pulse' : 'bg-red-500/30'}`} />
            <span className="text-[9px] uppercase font-bold opacity-50 tracking-widest">{cpuRef.current.running ? 'Running' : 'Halted'}</span>
          </div>
        </div>

        <div className="flex gap-2">
          <button 
            onClick={createNewProject}
            className={cn(
                "flex items-center gap-2 px-3 py-1 bg-black/20 hover:bg-hw-blue/20 text-[var(--theme-text)] border border-[var(--theme-border-color)] transition-colors text-[10px] font-bold",
                theme.globalTheme === 'retro' ? 'rounded-sm' : 'rounded-xl'
            )}
          >
            <FolderPlus size={12} className="text-hw-blue" />
            NEW_PROJ
          </button>
          <button 
            onClick={saveFile}
            className={cn(
                "flex items-center gap-2 px-3 py-1 bg-black/20 hover:bg-white/10 text-[var(--theme-text)] border border-[var(--theme-border-color)] transition-colors text-[10px] font-bold",
                theme.globalTheme === 'retro' ? 'rounded-sm' : 'rounded-xl'
            )}
          >
            <Save size={12} />
            SAVE_DISK
          </button>
          <button 
            disabled={isCompiling}
            onClick={compileTCC}
            className={cn(
                "flex items-center gap-2 px-4 py-1 bg-hw-blue/80 hover:bg-hw-blue text-white border border-hw-blue/20 transition-all text-[10px] font-black group shadow-[0_4px_12px_rgba(0,195,255,0.2)]",
                theme.globalTheme === 'retro' ? 'rounded-sm' : 'rounded-xl'
            )}
          >
            <Check size={12} className={isCompiling ? "animate-spin" : "group-hover:scale-110 transition-transform"} />
            {isCompiling ? "COMPILING..." : "TCC_COMPILE"}
          </button>
          
          <div className={cn(
              "flex p-0.5 bg-black/20 border border-[var(--theme-border-color)]",
              theme.globalTheme === 'retro' ? 'rounded-sm' : 'rounded-xl'
          )}>
            <button onClick={toggleRun} className="p-1.5 hover:bg-white/5 text-hw-blue transition-colors" title="Resume/Pause"><Play size={14} /></button>
            <button onClick={handleStep} className="p-1.5 hover:bg-white/5 text-yellow-500 transition-colors" title="Step Assembly"><StepForward size={14} /></button>
            <button onClick={resetSys} className="p-1.5 hover:bg-white/5 text-red-400 transition-colors" title="Master Reset"><RotateCcw size={14} /></button>
          </div>
        </div>
      </div>

      <div className="flex-grow flex gap-1 min-h-0 overflow-hidden">
        {/* Sidebar: File Picker */}
        {showFilePicker && (
          <div className="w-52 shrink-0 flex flex-col gap-1 overflow-hidden h-full">
            <InternalFilePicker 
              onFileSelect={handleFileSelect}
              allowedExtensions={['c', 'asm', 'h', 'bin', 'elf']}
              className={cn(
                "flex-grow h-full",
                theme.globalTheme === 'retro' ? 'rounded-sm' : 'rounded-2xl'
              )}
              refreshTrigger={fileRefreshKey}
            />
          </div>
        )}

        {/* Workspace Grid */}
        <div className="flex-grow grid grid-cols-12 grid-rows-6 gap-1 min-h-0 overflow-hidden">
          
          {/* Memory View */}
          <div className={cn(
              "col-span-3 row-span-4 bg-[var(--theme-panel-bg)] border border-[var(--theme-border-color)] p-2 flex flex-col gap-2 shadow-inner",
              theme.globalTheme === 'retro' ? 'rounded-sm' : 'rounded-2xl'
          )}>
             <div className="flex items-center gap-2 border-b border-[var(--theme-border-color)] pb-1">
               <MemoryStick size={12} className="text-hw-blue" />
               <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--theme-text)] opacity-60">Memory (0x000-0x3FF)</span>
             </div>
             <div className="flex-grow overflow-y-auto overflow-x-hidden scrollbar-hide">
                <div className="grid grid-cols-8 gap-x-2 gap-y-1">
                  {Array.from({ length: 128 }).map((_, i) => (
                    <div key={i} className={`text-[8px] text-center font-mono py-0.5 ${memory[i] !== 0 ? 'text-hw-blue font-bold bg-hw-blue/10 border border-hw-blue/20' : 'text-[var(--theme-content-text)] opacity-40'}`}>
                      {memory[i].toString(16).padStart(2, '0')}
                    </div>
                  ))}
                  <div className="col-span-8 text-[7px] text-center opacity-20 py-2">... MEMORY_TAIL ...</div>
                </div>
             </div>
          </div>

          {/* C-Source Editor */}
          <div className={cn(
              "col-span-5 row-span-4 bg-[var(--theme-panel-bg)] border border-[var(--theme-border-color)] p-2 flex flex-col relative",
              theme.globalTheme === 'retro' ? 'rounded-sm' : 'rounded-2xl'
          )}>
             <div className="flex items-center justify-between border-b border-[var(--theme-border-color)] pb-1 mb-2">
               <div className="flex items-center gap-2">
                  <Terminal size={12} className="text-hw-blue" />
                  <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--theme-text)]">Source: {currentFileId ? 'Nexus_Link' : 'Scratchpad'}</span>
               </div>
               <div className="flex items-center gap-2">
                  <div className="h-1 w-8 bg-hw-blue/20 rounded-full overflow-hidden">
                    <div className="h-full bg-hw-blue w-2/3 animate-[pulse_2s_infinite]" />
                  </div>
                  <span className="text-[7px] text-hw-blue opacity-60 font-black uppercase tracking-[0.2em]">Live_Analysis</span>
               </div>
             </div>
             <textarea 
               spellCheck={false}
               className={cn(
                   "flex-grow bg-black/40 text-[var(--theme-content-text)] text-[11px] p-3 font-mono border border-[var(--theme-border-color)] outline-none focus:border-hw-blue/50 transition-colors resize-none leading-relaxed custom-scrollbar",
                   theme.globalTheme === 'retro' ? 'rounded-sm' : 'rounded-xl'
               )}
               placeholder="// Enter C Code here..."
               value={code}
               onChange={(e) => setCode(e.target.value)}
             />
             <div className="absolute bottom-4 right-4 text-[8px] opacity-20 pointer-events-none uppercase tracking-widest font-bold">
               {code.length} bytes
             </div>
          </div>

          {/* Register Matrix */}
          <div className={cn(
              "col-span-4 row-span-4 bg-[var(--theme-panel-bg)] border border-[var(--theme-border-color)] p-2 flex flex-col gap-3",
              theme.globalTheme === 'retro' ? 'rounded-sm' : 'rounded-2xl'
          )}>
             <div className="flex items-center gap-2 border-b border-[var(--theme-border-color)] pb-1">
               <Database size={12} className="text-hw-blue" />
               <span className="text-[9px] font-bold uppercase tracking-widest text-[var(--theme-text)] opacity-60">Register_Status</span>
             </div>
             <div className="grid grid-cols-2 gap-2 overflow-y-auto pr-1 scrollbar-hide">
                {Object.entries(registers).map(([reg, val]) => (
                  <div key={reg} className={cn(
                      "bg-black/30 p-2 border border-[var(--theme-border-color)] flex items-center justify-between group hover:border-hw-blue/40 transition-all",
                      theme.globalTheme === 'retro' ? 'rounded-sm' : 'rounded-xl'
                  )}>
                    <span className="text-[9px] font-bold text-hw-blue uppercase tracking-tighter">{reg}</span>
                    {typeof val === 'boolean' ? (
                      <span className={`text-[10px] font-black ${val ? 'text-green-500' : 'opacity-20'}`}>
                        {val ? 'TRUE' : 'FALSE'}
                      </span>
                    ) : (
                      <div className="flex flex-col items-end">
                        <span className="text-[10px] font-bold text-[var(--theme-content-text)]">
                          0x{val.toString(16).toUpperCase().padStart(8, '0')}
                        </span>
                        <span className="text-[7px] opacity-30">DEC: {val}</span>
                      </div>
                    )}
                  </div>
                ))}
             </div>
             
             {/* Local ASM Pipe */}
             <div className="flex-grow flex flex-col gap-1 overflow-hidden mt-1 border-t border-[var(--theme-border-color)] pt-2">
                <div className="flex justify-between items-center opacity-50">
                  <span className="text-[8px] font-bold uppercase tracking-widest text-hw-blue">Instruction_Pipe</span>
                  <span className="text-[7px] text-yellow-500 font-mono">EIP: 0x{registers.eip.toString(16).padStart(4, '0')}</span>
                </div>
                <div className={cn(
                    "flex-grow overflow-y-auto bg-black/40 p-2 border border-[var(--theme-border-color)] scrollbar-hide font-mono",
                    theme.globalTheme === 'retro' ? 'rounded-sm' : 'rounded-lg'
                )}>
                  {asm.length > 0 ? (
                    asm.map((line, i) => (
                        <div key={i} className={`text-[9px] py-1 border-b border-white/5 last:border-0 ${i === registers.eip ? 'text-white bg-hw-blue/20 font-bold px-1' : 'opacity-40'}`}>
                          <span className="inline-block w-5 opacity-20 mr-2 text-[7px]">{i.toString(16).padStart(2, '0')}</span>
                          {line}
                        </div>
                    ))
                  ) : (
                    <div className="h-full flex items-center justify-center text-[9px] opacity-10 italic">Idle Segment</div>
                  )}
                </div>
             </div>
          </div>

          {/* Console / Output */}
          <div className={cn(
              "col-span-12 row-span-2 bg-black/60 border border-[var(--theme-border-color)] flex flex-col shadow-2xl",
              theme.globalTheme === 'retro' ? 'rounded-sm' : 'rounded-2xl'
          )}>
             <div className="bg-black/40 px-3 py-1.5 border-b border-[var(--theme-border-color)] flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <Terminal size={12} className="text-hw-blue" />
                  <span className="text-[8px] font-black uppercase tracking-[0.25em] text-[var(--theme-content-text)] opacity-40">TCC_STATION_v2_DEBUGGER_OUTPUT</span>
                </div>
                <div className="flex items-center gap-4 text-[7px] font-bold opacity-30 uppercase tracking-widest">
                  <span>Baud: 115200</span>
                  <span>Parity: None</span>
                  <span className="text-green-500">Connected</span>
                </div>
             </div>
          <div className="flex-grow min-h-0 bg-black/40">
            <XTermConsole 
               id="debugger"
               className="h-full"
            />
          </div>
          </div>
        </div>
      </div>
    </div>
  );
};


import React, { useEffect, useRef, useState } from 'react';
import { cn } from '../../../lib/utils';
import 'xterm/css/xterm.css';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
import { useSerial } from '../../../contexts/SerialContext';

interface HomeSecChallengeUIProps {
  challenge: any;
  onSendSerial: (data: string) => void;
  connectionId: string;
}

export const HomeSecChallengeUI: React.FC<HomeSecChallengeUIProps> = ({ challenge, onSendSerial, connectionId }) => {
  const termRef = useRef<HTMLDivElement>(null);
  const termInstance = useRef<Terminal | null>(null);
  const { subscribe, logs } = useSerial(connectionId);
  const initializedRef = useRef(false);

  // Telemetry States
  const [temp, setTemp] = useState<number | null>(null);
  const [o2, setO2] = useState<number | null>(null);
  const [doorLocked, setDoorLocked] = useState<boolean>(true);
  const [tempHistory, setTempHistory] = useState<number[]>([]);
  const [activeRegs, setActiveRegs] = useState<Set<number>>(new Set());

  // Input states
  const [rfidIn, setRfidIn] = useState('');
  const [adcVal, setAdcVal] = useState('512');
  const [logicPins, setLogicPins] = useState([0, 0, 0, 0, 0]);
  const [cmdInput, setCmdInput] = useState('');
  const [uptime, setUptime] = useState(0);

  // Uptime tick
  useEffect(() => {
    const t = setInterval(() => setUptime(u => u + 1), 1000);
    return () => clearInterval(t);
  }, []);

  // Graph Canvas
  const canvasRef = useRef<HTMLCanvasElement>(null);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    canvas.width = canvas.clientWidth;
    canvas.height = canvas.clientHeight;

    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.strokeStyle = '#00f2ff';
    ctx.lineWidth = 2;
    ctx.beginPath();
    
    // Scale history to fit width, range roughly 20-60°C
    tempHistory.forEach((v, i) => {
      const x = (i / Math.max(50, tempHistory.length)) * canvas.width;
      const y = canvas.height - ((v - 20) / 40) * canvas.height; 
      if (i === 0) ctx.moveTo(x, y);
      else ctx.lineTo(x, y);
    });
    ctx.stroke();
  }, [tempHistory]);

  useEffect(() => {
    let fitAddon: FitAddon | null = null;
    if (termRef.current && !termInstance.current) {
      const term = new Terminal({
        cursorBlink: true,
        theme: { background: 'transparent', foreground: '#00f2ff', cursor: '#00f2ff' },
        fontSize: 11,
        fontFamily: '"JetBrains Mono", monospace',
        convertEol: true,
        allowProposedApi: true,
        scrollback: 10000
      });
      fitAddon = new FitAddon();
      term.loadAddon(fitAddon);
      term.open(termRef.current);
      fitAddon.fit();
      termInstance.current = term;

      const resizeObserver = new ResizeObserver(() => {
          if (fitAddon) fitAddon.fit();
      });
      resizeObserver.observe(termRef.current);

      if (!initializedRef.current) {
        logs.forEach(log => {
          term.write(log.text.replace(/\n/g, '\r\n'));
        });
        initializedRef.current = true;
      }
    }

    let buffer = '';
    const unsub = subscribe((data) => {
      if (termInstance.current) {
        termInstance.current.write(data);
      }

      buffer += data;
      let lineEndIndex;
      while ((lineEndIndex = buffer.indexOf('\n')) !== -1) {
        const line = buffer.slice(0, lineEndIndex).trim();
        buffer = buffer.slice(lineEndIndex + 1);

        const hbMatch = line.match(/HB:(\{.*?\})/);
        if (hbMatch) {
            try {
                const data = JSON.parse(hbMatch[1]);
                if (data.temp !== undefined) {
                    setTemp(data.temp);
                    setTempHistory(prev => [...prev.slice(-49), data.temp]);
                }
                if (data.o2 !== undefined) {
                    setO2(data.o2);
                }
                if (data.sec !== undefined) {
                    setDoorLocked(data.sec < 4);
                }
            } catch (e) {
                // Ignore parse errors safely
            }
        }

        const regMatch = line.match(/eeprom_wr\s+(0x[0-9A-Fa-f]+|\d+)/i) || line.match(/eeprom_rd\s+(0x[0-9A-Fa-f]+|\d+)/i);
        if (regMatch) {
            let addrStr = regMatch[1];
            let addr = addrStr.startsWith('0x') ? parseInt(addrStr, 16) : parseInt(addrStr, 10);
            const idx = addr % 64;
            setActiveRegs(prev => new Set(prev).add(idx));
            setTimeout(() => {
                setActiveRegs(prev => {
                    const next = new Set(prev);
                    next.delete(idx);
                    return next;
                });
            }, 500);
        }
      }
    });

    return () => unsub();
  }, [connectionId, subscribe]);

  const runCmd = (cmd: string) => {
    onSendSerial(cmd + '\r\n');
  };

  const togglePin = (i: number) => {
    setLogicPins(prev => {
      const next = [...prev];
      next[i] = next[i] ? 0 : 1;
      return next;
    });
  };

  const pad0 = (n: number) => n.toString().padStart(2, '0');

  return (
    <div className="absolute inset-0 bg-[#020510] text-[#00f2ff] font-mono select-none overflow-hidden before:absolute before:inset-0 before:bg-[radial-gradient(circle,transparent_30%,#000_150%)] before:pointer-events-none before:z-10">
      
      {/* Dashboard Grid */}
      <div className="relative z-20 grid grid-cols-[280px_1fr_300px] grid-rows-[50px_1fr_80px] gap-2 p-2 h-full box-border">
        
        {/* TOP PANEL */}
        <div className="col-span-3 bg-blue-900/10 border border-[#00f2ff]/30 backdrop-blur-sm px-5 flex justify-between items-center">
          <div className="flex items-center gap-3">
             <div className="w-2.5 h-2.5 rounded-full bg-[#00f2ff] shadow-[0_0_10px_#00f2ff] animate-pulse" />
             <strong className="tracking-[4px] text-white/90">AEGIS-IV // COMMAND_LINK</strong>
          </div>
          <div className="text-[10px] flex gap-5">
             <span>UPTIME: {Math.floor(uptime/60)}:{pad0(uptime%60)}</span>
             <span>SEC_LEVEL: <span className={doorLocked ? "text-yellow-500" : "text-green-500"}>{doorLocked ? "GUEST" : "OVERSEER"}</span></span>
          </div>
        </div>

        {/* LEFT PANEL */}
        <div className="bg-blue-900/10 border border-[#00f2ff]/30 backdrop-blur-sm p-3 flex flex-col gap-2">
          <div className="text-[10px] font-black tracking-widest text-white border-b border-[#00f2ff]/20 pb-1">THERMAL_CORE_LOAD</div>
          <div className="h-[100px] border border-[#00f2ff]/30 bg-black relative">
             <canvas ref={canvasRef} className="w-full h-full" />
             <div className="absolute top-1 right-1 font-bold text-sm bg-black/50 px-1">{temp?.toFixed(1) || '--'}°C</div>
          </div>

          <div className="text-[10px] font-black tracking-widest text-white border-b border-[#00f2ff]/20 pb-1 mt-2">LIFE_SUPPORT_O2</div>
          <div className="h-3 border border-[#00f2ff] bg-[#001122]">
             <div 
               className="h-full bg-[#00f2ff] shadow-[0_0_10px_#00f2ff] transition-all duration-500" 
               style={{ width: `${Math.min(100, Math.max(0, o2 || 0))}%`, backgroundColor: (o2 || 0) < 30 ? '#ff3300' : '#00f2ff' }} 
             />
          </div>
          <div className="text-right text-xs font-bold">{o2?.toFixed(1) || '0'}%</div>

          <div className="text-[10px] font-black tracking-widest text-white border-b border-[#00f2ff]/20 pb-1">EEPROM_MAP</div>
          <div className="grid grid-cols-8 gap-[2px]">
             {Array.from({ length: 64 }).map((_, i) => (
                <div 
                  key={i} 
                  className={cn(
                    "h-3.5 transition-colors duration-300", 
                    activeRegs.has(i) ? "bg-[#00f2ff] shadow-[0_0_8px_#00f2ff] border border-white" : "bg-[#001122] border border-[#003344]"
                  )} 
                />
             ))}
          </div>

          <div className="mt-auto grid grid-cols-2 gap-1.5">
             <button onClick={() => runCmd('status')} className="bg-[#00f2ff]/10 border border-[#00f2ff] text-[#00f2ff] text-[9px] py-1.5 font-bold uppercase transition hover:bg-[#00f2ff] hover:text-black hover:shadow-[0_0_10px_#00f2ff]">SYS_STATUS</button>
             <button onClick={() => runCmd('i2c scan')} className="bg-[#00f2ff]/10 border border-[#00f2ff] text-[#00f2ff] text-[9px] py-1.5 font-bold uppercase transition hover:bg-[#00f2ff] hover:text-black hover:shadow-[0_0_10px_#00f2ff]">I2C_SCAN</button>
             <button onClick={() => runCmd('sandbox')} className="bg-[#00f2ff]/10 border border-[#00f2ff] text-[#00f2ff] text-[9px] py-1.5 font-bold uppercase transition hover:bg-[#00f2ff] hover:text-black hover:shadow-[0_0_10px_#00f2ff]">OPEN_SHELL</button>
             <button onClick={() => runCmd('fs_mount')} className="bg-[#00f2ff]/10 border border-[#00f2ff] text-[#00f2ff] text-[9px] py-1.5 font-bold uppercase transition hover:bg-[#00f2ff] hover:text-black hover:shadow-[0_0_10px_#00f2ff]">MOUNT_VFS</button>
          </div>
        </div>

        {/* CENTER PANEL: TERMINAL */}
        <div className="bg-black/80 border border-[#00f2ff] flex flex-col p-1">
          <div className="flex justify-between text-[9px] mb-1 bg-[#00f2ff] text-black px-1.5 py-0.5 font-bold">
            <span>[ ACCESS_TERM: ICARUS_PRIME_NODE ]</span>
          </div>
          <div ref={termRef} className="flex-1 overflow-hidden relative" />
          <input 
            value={cmdInput}
            onChange={(e) => setCmdInput(e.target.value)}
            onKeyDown={(e) => { if(e.key === 'Enter' && cmdInput.trim()) { runCmd(cmdInput); setCmdInput(''); } }}
            className="mt-1 bg-black/50 border border-[#00f2ff]/50 text-[#00f2ff] px-1.5 py-1 text-[10px] outline-none w-full placeholder-[#00f2ff]/30 focus:border-[#00f2ff]" 
            placeholder="> ENTER COMMAND..." 
          />
        </div>

        {/* RIGHT PANEL */}
        <div className="bg-blue-900/10 border border-[#00f2ff]/30 backdrop-blur-sm p-3 flex flex-col gap-2">
          <div className="text-[10px] font-black tracking-widest text-white border-b border-[#00f2ff]/20 pb-1">RFID_EMULATOR_PRO</div>
          <div className="flex gap-1">
             <input 
               value={rfidIn} onChange={(e) => setRfidIn(e.target.value)}
               className="bg-black/50 border border-[#00f2ff]/50 text-[#00f2ff] px-1.5 py-1 text-[10px] outline-none flex-1 focus:border-[#00f2ff]" 
               placeholder="UID: 88 43" 
             />
             <button onClick={() => runCmd(`rfid_emulate ${rfidIn.replace(/ /g, '')}`)} className="bg-[#00f2ff]/10 border border-[#00f2ff] text-[#00f2ff] px-2 text-[9px] font-bold uppercase transition hover:bg-[#00f2ff] hover:text-black">SCAN</button>
          </div>
          <button onClick={() => runCmd('rfid_write 4 53484956415f4f56455252494445')} className="bg-[#00f2ff]/10 border border-[#00f2ff] text-[#00f2ff] text-[9px] py-1.5 font-bold uppercase transition hover:bg-[#00f2ff] hover:text-black w-full mt-1">INJECT_KEY (B4)</button>

          <div className="text-[10px] font-black tracking-widest text-white border-b border-[#00f2ff]/20 pb-1 mt-4">ADC_SPOOFER</div>
          <input 
            type="range" min="0" max="1023" 
            value={adcVal} onChange={(e) => { setAdcVal(e.target.value); }}
            onMouseUp={() => runCmd(`eeprom_wr 0x70 ${adcVal}`)}
            onTouchEnd={() => runCmd(`eeprom_wr 0x70 ${adcVal}`)}
            className="w-full accent-[#00f2ff]" 
          />
          <div className="flex justify-between text-[9px] opacity-60">
            <span>0V</span><span>{adcVal}u</span><span>3.3V</span>
          </div>

          <div className="text-[10px] font-black tracking-widest text-white border-b border-[#00f2ff]/20 pb-1 mt-4">LOGIC_ANALYZER</div>
          <div className="grid grid-cols-5 gap-1 p-1 bg-black border border-[#00f2ff]/30">
            {logicPins.map((val, i) => (
              <div 
                key={i} 
                onClick={() => togglePin(i)}
                className={cn("h-5 border border-[#00f2ff] cursor-pointer transition-colors", val ? "bg-[#00f2ff] shadow-[0_0_5px_#00f2ff]" : "bg-black/80")} 
              />
            ))}
          </div>
          <button onClick={() => runCmd(`logic_analyze ${logicPins.join('')}`)} className="bg-[#00f2ff]/10 border border-[#00f2ff] text-[#00f2ff] text-[9px] py-1.5 font-bold uppercase transition hover:bg-[#00f2ff] hover:text-black w-full mt-1">COMMIT_SEQUENCE</button>
          
          <div className="mt-auto pt-2 border-t border-red-500/50 border-dashed">
            <button onClick={() => runCmd('reset_factory')} className="bg-red-500/10 border border-red-500 text-red-500 text-[9px] py-1.5 font-bold uppercase transition hover:bg-red-500 hover:text-black hover:shadow-[0_0_10px_#ff0000] w-full">FACTORY_RESET_STATION</button>
          </div>
        </div>

        {/* BOTTOM PANEL: HUD */}
        <div className="col-span-3 bg-blue-900/10 border border-[#00f2ff]/30 backdrop-blur-sm px-5 flex items-center gap-6">
           <div className="text-center w-32 shrink-0">
             <div className={cn("text-base font-black tracking-widest transition-colors", doorLocked ? "text-[#ff3300]" : "text-[#00ff00]")}>
               {doorLocked ? "SEAL_LOCKED" : "SEAL_OPEN"}
             </div>
             <div className="text-[8px] opacity-50">AIRLOCK_G1</div>
           </div>
           <div className="flex-1 border-l border-[#00f2ff]/30 pl-5 text-[11px] opacity-80 leading-relaxed text-[#00f2ff]">
             {'>'} [ SYSTEM_ALERT: AETHER AI MUTATION DETECTED. OVERSEER RFID REQUIRED FOR ACCESS... USE ASSISTANT TOOLS TO BYPASS INTERLOCKS. ]
           </div>
        </div>

      </div>
    </div>
  );
};

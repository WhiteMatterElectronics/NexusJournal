import React, { useState, useEffect, useRef, useMemo } from 'react';
import { Flag, Terminal, CheckCircle, Lock, Play, Code, ChevronRight, ChevronDown, Send, Cpu, Zap } from 'lucide-react';

/**
 * AEGIS-IV CTF CHALLENGE APP - FULLY DEVELOPED
 * Features:
 * 1. Robust Iframe-to-Host Handshake (Guarantees no dropped packets)
 * 2. Full Cyberpunk Dashboard Integration
 * 3. Real-time Telemetry Parsing (O2, Temp, EEPROM)
 */

// Mock hooks for preview. In your real app, replace these with your actual imports:
// import { useCtf } from '../../contexts/CtfContext';
// import { useSerial } from '../../contexts/SerialContext';
// import { useInventory } from '../../contexts/InventoryContext';

const useCtf = () => ({
  challenges: [{
    id: 'ctf-homesec-01',
    title: 'AEGIS-IV | USN ICARUS: The Dead Space',
    status: 'locked',
    description: 'The USN Icarus is drifting. SHIVA has mutated. Reconnect the core.',
    difficulty: 'extreme',
    points: 7500,
    category: 'hardware',
    flags: [{ id: 'f01', title: 'Neural Handshake', points: 200 }],
    serialTriggers: [{ matchRegex: 'CTF\\{.*\\}', action: 'unlock_hint' }]
  }],
  updateChallenge: (id, updates) => console.log('Update Challenge', id, updates)
});

const useSerial = (id) => {
  const [logs, setLogs] = useState([{ text: "SYSTEM_BOOT_SEQUENCE_INIT...\n" }]);
  
  // Simulate incoming serial data for testing the UI
  useEffect(() => {
    let tick = 0;
    const interval = setInterval(() => {
      tick++;
      const temp = 20 + Math.sin(tick / 5) * 10;
      const o2 = Math.max(0, 100 - (tick * 0.5));
      setLogs(prev => [...prev, { text: `HB:{"o2":${o2.toFixed(1)},"temp":${temp.toFixed(1)},"sec":2}\r\n` }]);
      
      if (tick % 5 === 0) setLogs(prev => [...prev, { text: `[SYS] Processing cycle ${tick}...\r\n` }]);
      if (tick === 10) setLogs(prev => [...prev, { text: `REG:0x0A=0xFF\r\n` }]); // Simulate EEPROM read
    }, 2000);
    return () => clearInterval(interval);
  }, []);

  return {
    connected: true,
    writeToSerial: (msg) => {
      console.log('HOST SENT TO SERIAL:', msg);
      // Echo it back to logs so it shows up in terminal
      setLogs(prev => [...prev, { text: `> ${msg}` }]);
    },
    logs
  };
};

const useInventory = () => ({ items: [] });

export default function App() {
  return <CtfChallengeApp challengeId="ctf-homesec-01" />;
}

export const CtfChallengeApp = ({ challengeId, onStartApp }) => {
  const [selectedConnId, setSelectedConnId] = useState('shared');
  const { challenges, updateChallenge } = useCtf();
  const { connected, writeToSerial, logs } = useSerial(selectedConnId);
  
  const challenge = challenges.find(c => c.id === challengeId);
  const [activeTab, setActiveTab] = useState('custom_ui');
  const [isIframeReady, setIsIframeReady] = useState(false);
  
  const iframeRef = useRef(null);
  const lastSentIndexRef = useRef(0);

  // 1. HANDSHAKE & INCOMING MESSAGE HANDLER (From Iframe -> React)
  useEffect(() => {
    const handleMessage = (e) => {
      if (!e.data || typeof e.data !== 'object') return;

      switch (e.data.type) {
        case 'IFRAME_READY':
          console.log("[REACT] Iframe is ready and listening.");
          setIsIframeReady(true);
          lastSentIndexRef.current = 0; // Reset buffer so iframe gets full history
          break;
        case 'SEND_SERIAL':
          console.log("[REACT] Iframe requested serial write:", e.data.data);
          writeToSerial(e.data.data);
          break;
        case 'COMPLETE_CHALLENGE':
          updateChallenge(challengeId, { status: 'solved' });
          break;
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [challengeId, updateChallenge, writeToSerial]);

  // 2. OUTGOING LOG SYNCHRONIZER (From React -> Iframe)
  useEffect(() => {
    if (!isIframeReady || !iframeRef.current) return;

    const iframeWin = iframeRef.current.contentWindow;
    const unsent = logs.slice(lastSentIndexRef.current);
    
    if (unsent.length > 0) {
      unsent.forEach(log => {
        iframeWin.postMessage({ type: 'SERIAL_DATA', data: log.text }, '*');
      });
      lastSentIndexRef.current = logs.length;
    }
  }, [logs, isIframeReady]);

  // 3. FULLY DEVELOPED IFRAME SOURCE (The Dashboard)
  const iframeSrcDoc = useMemo(() => `
    <!DOCTYPE html>
    <html>
    <head>
      <meta charset="UTF-8">
      <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/xterm@5.3.0/css/xterm.css" />
      <script src="https://cdn.jsdelivr.net/npm/xterm@5.3.0/lib/xterm.js"></script>
      <script src="https://cdn.jsdelivr.net/npm/xterm-addon-fit@0.8.0/lib/xterm-addon-fit.js"></script>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=JetBrains+Mono:wght@400;700;900&display=swap');
        
        body, html { 
          margin: 0; padding: 0; height: 100%; 
          background: #020510; color: #00f2ff; 
          font-family: 'JetBrains Mono', monospace; 
          overflow: hidden; user-select: none;
        }

        /* Dashboard Grid Layout */
        #dashboard {
          display: grid;
          grid-template-columns: 280px 1fr 300px;
          grid-template-rows: 50px 1fr 80px;
          gap: 8px; padding: 8px; height: 100vh; box-sizing: border-box;
          position: relative; z-index: 10;
        }

        /* Aesthetic Panels */
        .panel {
          background: rgba(0, 30, 80, 0.2);
          border: 1px solid rgba(0, 242, 255, 0.3);
          backdrop-filter: blur(4px);
          padding: 12px; display: flex; flex-direction: column; gap: 10px;
        }
        
        .panel-header {
          font-size: 10px; font-weight: 900; letter-spacing: 2px; 
          color: #fff; margin-bottom: 5px; border-bottom: 1px solid rgba(0,242,255,0.2); padding-bottom: 4px;
        }

        /* Background Effects */
        #rpgCanvas { position: absolute; inset: 0; width: 100%; height: 100%; z-index: 1; opacity: 0.3; }
        .vignette { position: absolute; inset: 0; background: radial-gradient(circle, transparent 30%, #000 120%); z-index: 2; pointer-events: none; }

        /* UI Components */
        button.cmd-btn {
          background: rgba(0, 242, 255, 0.1); border: 1px solid #00f2ff; color: #00f2ff;
          font-size: 9px; padding: 6px; cursor: pointer; text-transform: uppercase; font-family: inherit; font-weight: bold;
          transition: all 0.2s;
        }
        button.cmd-btn:hover { background: #00f2ff; color: #000; box-shadow: 0 0 10px #00f2ff; }
        button.danger-btn { border-color: #ff3300; color: #ff3300; background: rgba(255,50,0,0.1); }
        button.danger-btn:hover { background: #ff3300; color: #000; box-shadow: 0 0 10px #ff3300; }
        
        input.hw-input {
          background: rgba(0,0,0,0.5); border: 1px solid rgba(0,242,255,0.5); color: #00f2ff;
          padding: 6px; font-size: 10px; font-family: inherit; outline: none; width: 100%; box-sizing: border-box;
        }

        /* Custom Widgets */
        .reg-cell { background: #001122; border: 1px solid #003344; height: 14px; transition: 0.3s; }
        .reg-active { background: #00f2ff; box-shadow: 0 0 8px #00f2ff; border-color: #fff; }
        
        .logic-pin { height: 20px; border: 1px solid #00f2ff; cursor: pointer; background: rgba(0,0,0,0.8); transition: 0.1s;}
        .logic-pin.active { background: #00f2ff; box-shadow: 0 0 5px #00f2ff; }

        #terminal-wrapper { flex: 1; min-height: 0; background: rgba(0,0,0,0.8); border: 1px solid #00f2ff; padding: 5px; display: flex; flex-direction: column; }
        
        ::-webkit-scrollbar { width: 6px; }
        ::-webkit-scrollbar-thumb { background: #00f2ff; }
      </style>
    </head>
    <body>
      <canvas id="rpgCanvas"></canvas>
      <div class="vignette"></div>

      <div id="dashboard">
        <!-- TOP NAVIGATION -->
        <div class="panel" style="grid-column: 1 / span 3; flex-direction: row; justify-content: space-between; align-items: center; padding: 0 20px;">
          <div style="display: flex; items-center; gap: 10px;">
             <div id="heartbeat-led" style="width: 10px; height: 10px; border-radius: 50%; background: #00f2ff; box-shadow: 0 0 10px #00f2ff; transition: 0.1s;"></div>
             <strong style="letter-spacing: 4px; color: #fff;">AEGIS-IV // COMMAND_LINK</strong>
          </div>
          <div style="font-size: 10px; display: flex; gap: 20px;">
             <span>UPTIME: <span id="uptime">00:00</span></span>
             <span>SEC_LEVEL: <span id="seclvl">UNKNOWN</span></span>
          </div>
        </div>

        <!-- LEFT PANEL: TELEMETRY -->
        <div class="panel">
          <div class="panel-header">THERMAL_CORE_LOAD</div>
          <div style="height: 100px; border: 1px solid rgba(0,242,255,0.3); background: #000; position: relative;">
             <canvas id="tempGraph" style="width: 100%; height: 100%;"></canvas>
             <div id="tempVal" style="position: absolute; top: 5px; right: 5px; font-weight: bold; font-size: 16px;">--°C</div>
          </div>

          <div class="panel-header" style="margin-top: 10px;">LIFE_SUPPORT_O2</div>
          <div style="height: 12px; border: 1px solid #00f2ff; background: #001122; position: relative;">
             <div id="o2-bar" style="height: 100%; width: 100%; background: #00f2ff; box-shadow: 0 0 10px #00f2ff; transition: width 0.5s;"></div>
          </div>
          <div id="o2-val" style="text-align: right; font-size: 12px; font-weight: bold; margin-bottom: 10px;">100%</div>

          <div class="panel-header">EEPROM_MAP</div>
          <div id="regGrid" style="display: grid; grid-template-columns: repeat(8, 1fr); gap: 2px;"></div>

          <div style="margin-top: auto; display: grid; grid-template-columns: 1fr 1fr; gap: 6px;">
             <button class="cmd-btn" onclick="sendCmd('status')">SYS_STATUS</button>
             <button class="cmd-btn" onclick="sendCmd('i2c scan')">I2C_SCAN</button>
             <button class="cmd-btn" onclick="sendCmd('sandbox')">OPEN_SHELL</button>
             <button class="cmd-btn" onclick="sendCmd('fs_mount')">MOUNT_VFS</button>
          </div>
        </div>

        <!-- CENTER PANEL: TERMINAL -->
        <div id="terminal-wrapper">
          <div style="display: flex; justify-content: space-between; font-size: 9px; margin-bottom: 5px; background: #00f2ff; color: #000; padding: 2px 5px; font-weight: bold;">
            <span>[ ACCESS_TERM: ICARUS_PRIME_NODE ]</span>
          </div>
          <div id="terminal" style="flex: 1; min-height: 0;"></div>
          <input type="text" id="cmdInput" class="hw-input" style="margin-top: 5px;" placeholder="> ENTER COMMAND..." />
        </div>

        <!-- RIGHT PANEL: HARDWARE TOOLS -->
        <div class="panel">
          <div class="panel-header">RFID_EMULATOR_PRO</div>
          <div style="display: flex; gap: 4px;">
             <input type="text" id="rfidIn" class="hw-input" placeholder="UID: 88 43" style="flex: 1;" />
             <button class="cmd-btn" onclick="sendCmd('rfid_emulate ' + document.getElementById('rfidIn').value.replace(/ /g, ''))">SCAN</button>
          </div>
          <button class="cmd-btn" style="margin-top: 4px;" onclick="sendCmd('rfid_write 4 SHIVA_OVERRIDE')">INJECT_KEY (B4)</button>

          <div class="panel-header" style="margin-top: 20px;">ADC_SPOOFER</div>
          <input type="range" min="0" max="1023" value="512" style="width: 100%; accent-color: #00f2ff;" oninput="updateADC(this.value)" />
          <div style="display: flex; justify-content: space-between; font-size: 9px; opacity: 0.6;">
            <span>0V</span><span id="adcU">512u</span><span>3.3V</span>
          </div>

          <div class="panel-header" style="margin-top: 20px;">LOGIC_ANALYZER</div>
          <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; padding: 5px; background: #000; border: 1px solid rgba(0,242,255,0.3);">
            <div class="logic-pin" id="lp-0" onclick="togglePin(0)"></div>
            <div class="logic-pin" id="lp-1" onclick="togglePin(1)"></div>
            <div class="logic-pin" id="lp-2" onclick="togglePin(2)"></div>
            <div class="logic-pin" id="lp-3" onclick="togglePin(3)"></div>
            <div class="logic-pin" id="lp-4" onclick="togglePin(4)"></div>
          </div>
          <button class="cmd-btn" style="margin-top: 4px;" onclick="commitLogic()">COMMIT_SEQUENCE</button>

          <div style="margin-top: auto; padding-top: 10px; border-top: 1px dashed #ff3300;">
             <button class="cmd-btn danger-btn" style="width: 100%;" onclick="sendCmd('reset_factory')">FACTORY_RESET_STATION</button>
          </div>
        </div>

        <!-- BOTTOM PANEL: HUD -->
        <div class="panel" style="grid-column: 1 / span 3; flex-direction: row; align-items: center; justify-content: flex-start; gap: 30px; padding: 0 20px;">
           <div style="text-align: center;">
             <div id="door-stat" style="font-size: 16px; font-weight: 900; color: #ff3300;">SEAL_LOCKED</div>
             <div style="font-size: 8px; opacity: 0.5;">AIRLOCK_G1</div>
           </div>
           <div style="flex: 1; border-left: 1px solid rgba(0,242,255,0.3); padding-left: 20px; font-size: 11px; opacity: 0.8;">
             > [ SYSTEM ALERT: AETHER AI MUTATION DETECTED. OVERSEER RFID REQUIRED FOR ACCESS. ]
           </div>
        </div>
      </div>

      <script>
        // --- BRIDGE API ---
        // This replaces window.hwAPI. We now use pure postMessage.
        function sendCmd(cmd) {
          window.parent.postMessage({ type: 'SEND_SERIAL', data: cmd + '\\r\\n' }, '*');
        }

        // --- HARDWARE STATE ---
        let term, fit;
        let pinS = [0,0,0,0,0];
        const history = { temp: [] };
        
        // Setup EEPROM Grid
        const regGrid = document.getElementById('regGrid');
        for(let i=0; i<64; i++) {
          const d = document.createElement('div');
          d.className = 'reg-cell'; d.id = 'reg-' + i;
          regGrid.appendChild(d);
        }

        // Tool Functions
        function togglePin(i) {
          pinS[i] = pinS[i] ? 0 : 1;
          document.getElementById('lp-'+i).classList.toggle('active');
        }
        function commitLogic() { sendCmd('logic_analyze ' + pinS.join('')); }
        function updateADC(v) { document.getElementById('adcU').innerText = v + 'u'; sendCmd('eeprom_wr 0x70 ' + v); }

        // Graphical Functions
        const tCanvas = document.getElementById('tempGraph');
        const tCtx = tCanvas.getContext('2d');
        function drawGraph() {
          tCanvas.width = tCanvas.clientWidth; tCanvas.height = tCanvas.clientHeight;
          tCtx.strokeStyle = '#00f2ff'; tCtx.lineWidth = 2; tCtx.beginPath();
          history.temp.forEach((v, i) => {
            const x = (i / 50) * tCanvas.width;
            const y = tCanvas.height - ((v-20) / 40) * tCanvas.height; // scale based on expected temp range
            if(i === 0) tCtx.moveTo(x, y); else tCtx.lineTo(x, y);
          });
          tCtx.stroke();
        }

        // Background Canvas Draw
        const bgCanvas = document.getElementById('rpgCanvas');
        const bgCtx = bgCanvas.getContext('2d');
        function drawRpg() {
          bgCanvas.width = window.innerWidth; bgCanvas.height = window.innerHeight;
          bgCtx.clearRect(0,0,bgCanvas.width,bgCanvas.height);
          
          // Draw some decorative nodes
          bgCtx.strokeStyle = 'rgba(0, 242, 255, 0.1)';
          bgCtx.lineWidth = 1;
          [ {x:300, y:200}, {x:800, y:500}, {x:1200, y:300} ].forEach(n => {
            bgCtx.beginPath(); bgCtx.arc(n.x, n.y, 40, 0, Math.PI*2); bgCtx.stroke();
            bgCtx.beginPath(); bgCtx.arc(n.x, n.y, 2, 0, Math.PI*2); bgCtx.fill();
            bgCtx.moveTo(bgCanvas.width/2, bgCanvas.height/2); bgCtx.lineTo(n.x, n.y); bgCtx.stroke();
          });
          requestAnimationFrame(drawRpg);
        }
        drawRpg();

        // Uptime Tracker
        let startT = Date.now();
        setInterval(() => {
          const s = Math.floor((Date.now() - startT)/1000);
          document.getElementById('uptime').innerText = Math.floor(s/60) + ':' + (s%60).toString().padStart(2,'0');
        }, 1000);

        // --- XTERM & BRIDGE INITIALIZATION ---
        async function init() {
          while(!window.Terminal || !window.FitAddon) { await new Promise(r => setTimeout(r, 50)); }

          term = new Terminal({
            theme: { background: 'transparent', foreground: '#00f2ff', cursor: '#00f2ff' },
            fontSize: 12, fontFamily: '"JetBrains Mono", monospace',
            cursorBlink: true, convertEol: true
          });
          
          fit = new window.FitAddon.FitAddon();
          term.loadAddon(fit);
          term.open(document.getElementById('terminal'));
          fit.fit();
          window.addEventListener('resize', () => fit.fit());

          // Input handling
          document.getElementById('cmdInput').onkeydown = (e) => {
            if(e.key === 'Enter') {
              sendCmd(e.target.value);
              e.target.value = '';
            }
          };

          // Message Listener from Host React App
          window.addEventListener('message', (e) => {
            if(e.data.type === 'SERIAL_DATA') {
              const raw = e.data.data;
              
              // 1. Process for UI Dashboard
              if(raw.includes('HB:{')) {
                try {
                  const match = raw.match(/HB:(\\{.*?\\})/);
                  if(match) {
                    const data = JSON.parse(match[1]);
                    
                    // Update UI Elements
                    if(data.o2 !== undefined) {
                      document.getElementById('o2-bar').style.width = data.o2 + '%';
                      document.getElementById('o2-val').innerText = data.o2.toFixed(1) + '%';
                      if(data.o2 < 30) document.getElementById('o2-bar').style.background = '#ff3300';
                      else document.getElementById('o2-bar').style.background = '#00f2ff';
                    }
                    if(data.temp !== undefined) {
                      document.getElementById('tempVal').innerText = data.temp.toFixed(1) + '°C';
                      history.temp.push(data.temp);
                      if(history.temp.length > 50) history.temp.shift();
                      drawGraph();
                    }
                    if(data.sec !== undefined) {
                      const levels = ['GUEST', 'CREW', 'ENGINEER', 'ADMIN', 'OVERSEER'];
                      document.getElementById('seclvl').innerText = levels[data.sec] || 'UNKNOWN';
                      if(data.sec >= 4) {
                         const door = document.getElementById('door-stat');
                         door.innerText = 'SEAL_UNLOCKED'; door.style.color = '#00ff00';
                      }
                    }

                    // Blink LED
                    const led = document.getElementById('heartbeat-led');
                    led.style.background = '#fff'; led.style.boxShadow = '0 0 20px #fff';
                    setTimeout(() => { led.style.background = '#00f2ff'; led.style.boxShadow = '0 0 10px #00f2ff'; }, 100);
                  }
                } catch(err) { console.error("HB Parse Error"); }
              }

              if(raw.includes('REG:')) {
                 const match = raw.match(/REG:0x([0-9A-F]+)=/i);
                 if(match) {
                   const idx = parseInt(match[1], 16) % 64;
                   const el = document.getElementById('reg-' + idx);
                   if(el) { 
                     el.classList.add('reg-active'); 
                     setTimeout(() => el.classList.remove('reg-active'), 500); 
                   }
                 }
              }

              // 2. Write to Terminal (Format correctly for display)
              const termSafeString = raw.replace(/HB:/g, '\\r\\nHB:'); // Ensure JSON doesn't pile up on one line
              term.write(termSafeString.replace(/\\r\\n/g, '\\n').replace(/\\r/g, '\\n'));
            }
          });

          // Tell React we are ready for data!
          window.parent.postMessage({ type: 'IFRAME_READY' }, '*');
        }

        init();
      </script>
    </body>
    </html>
  `, []);

  if (!challenge) return <div className="p-10 text-red-500">Challenge Missing</div>;

  return (
    <div className="flex flex-col h-screen bg-slate-950 text-cyan-400 font-mono">
      {/* React UI Header */}
      <div className="flex items-center justify-between px-6 py-4 border-b border-cyan-900/50 bg-slate-900/50">
        <div className="flex items-center gap-4">
          <div className="p-2 bg-cyan-500/10 rounded border border-cyan-500/20">
            <Cpu className="w-5 h-5 text-cyan-400" />
          </div>
          <div>
            <h1 className="text-sm font-bold tracking-tighter uppercase text-white">{challenge.title}</h1>
            <div className="flex gap-2 items-center text-[10px] opacity-60">
              <span className="px-1 bg-cyan-500/20 rounded">HARDWARE</span>
              <span>•</span>
              <span className="text-red-400 font-bold">EXTREME</span>
            </div>
          </div>
        </div>
        
        <div className="flex gap-1 bg-black/40 p-1 rounded-lg border border-white/5">
          <button 
            onClick={() => setActiveTab('briefing')}
            className={`px-4 py-1.5 text-[10px] tracking-widest rounded transition-all ${activeTab === 'briefing' ? 'bg-cyan-500 text-black font-bold' : 'hover:bg-white/5 text-cyan-500/50'}`}
          >
            BRIEFING
          </button>
          <button 
            onClick={() => setActiveTab('custom_ui')}
            className={`px-4 py-1.5 text-[10px] tracking-widest rounded transition-all ${activeTab === 'custom_ui' ? 'bg-cyan-500 text-black font-bold' : 'hover:bg-white/5 text-cyan-500/50'}`}
          >
            INTERFACE
          </button>
        </div>
      </div>

      {/* Main Area */}
      <div className="flex-1 relative overflow-hidden bg-black">
        {activeTab === 'briefing' ? (
          <div className="p-8 max-w-4xl mx-auto space-y-6 overflow-y-auto h-full">
             <div className="p-6 bg-cyan-950/20 border border-cyan-500/20 rounded-xl">
               <h2 className="text-lg font-bold mb-4 flex items-center gap-2 text-white">
                 <Zap className="w-4 h-4 text-yellow-400" /> MISSION_ORDERS
               </h2>
               <p className="text-sm leading-relaxed opacity-80 whitespace-pre-wrap">{challenge.description}</p>
             </div>
             
             <div className="grid gap-4 pb-10">
                <h3 className="text-xs opacity-50 tracking-widest mt-4">OBJECTIVE FLAGS</h3>
                {challenge.flags.map(f => (
                  <div key={f.id} className="p-4 border border-white/10 rounded-lg flex justify-between items-center bg-white/5 hover:bg-white/10 transition-colors">
                    <span className="text-xs font-bold tracking-wider">{f.title}</span>
                    <div className="flex gap-2">
                      <input className="bg-black border border-cyan-900 rounded px-3 py-1 text-xs text-cyan-400 outline-none focus:border-cyan-400" placeholder="Enter captured flag..." />
                      <button className="bg-cyan-500/20 hover:bg-cyan-500 text-cyan-400 hover:text-black border border-cyan-500 text-[10px] px-4 py-1 font-bold rounded transition-all">SUBMIT</button>
                    </div>
                  </div>
                ))}
             </div>
          </div>
        ) : (
          <div className="h-full w-full">
            <iframe 
              ref={iframeRef}
              srcDoc={iframeSrcDoc}
              className="w-full h-full border-none"
              sandbox="allow-scripts allow-same-origin"
              title="AEGIS-IV Interface"
            />
          </div>
        )}
      </div>
    </div>
  );
};
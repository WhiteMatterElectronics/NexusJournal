import React, { createContext, useContext, useState, useEffect } from 'react';
import { CtfChallenge } from '../types/ctf';

interface CtfContextType {
  challenges: CtfChallenge[];
  addChallenge: (challenge: CtfChallenge) => void;
  updateChallenge: (id: string, updates: Partial<CtfChallenge>) => void;
  deleteChallenge: (id: string) => void;
}

const CtfContext = createContext<CtfContextType | undefined>(undefined);

export const CtfProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [challenges, setChallenges] = useState<CtfChallenge[]>(() => {
    const saved = localStorage.getItem('hw_ctf_challenges');
    let loadedChallenges: CtfChallenge[] = [];
    if (saved) {
      try {
        loadedChallenges = JSON.parse(saved);
      } catch (e) {
        console.error("Failed to parse CTF challenges", e);
      }
    }

    // Default HomeSec Challenge Template (No flags stored here)
    const homeSecChallenge: CtfChallenge = {
      id: 'ctf-homesec-01',
      title: 'AEGIS-IV | USN ICARUS: The Dead Space',
      description: 'The USN Icarus is drifting. AETHER AI has mutated into SHIVA, a hostile entity that has seized the core. Life support is critical. You are the last surviving Engineer.\n\nUsing your neural interface and the **ESP32-C3 Assistant Board**, you must reconnect the severed hardware modules. Unplug the MFRC522, hijack the I2C bus, and spoof ADC telemetry to convince SHIVA that systems are normal while you purge its malicious code.\n\n**Mission Objectives:**\n1. Establish a neural handshake with the command link.\n2. Map the reactor\'s memory registers (EEPROM).\n3. Use the Logic Analyzer to sniff decrypted bypass sequences.\n4. Clone the Overseer identity via cloned RFID UID (88 99).\n5. Breach the SHIVA core via an emergency purge protocol.',
      difficulty: 'extreme',
      points: 7500,
      category: 'hardware',
      status: 'locked',
      inventoryItems: ['hs-01', 'esp-asst'],
      tutorials: [],
      notes: [],
      flags: [
        { id: 'f01', title: 'Neural Handshake', value: 'HIDDEN_IN_FIRMWARE', points: 200 },
        { id: 'f02', title: 'AVR Core Telemetry', value: 'HIDDEN_IN_FIRMWARE', points: 300 },
        { id: 'f03', title: 'VFS Manifest Breach', value: 'HIDDEN_IN_FIRMWARE', points: 400 },
        { id: 'f04', title: 'I2C Deep Bus Scan', value: 'HIDDEN_IN_FIRMWARE', points: 400 },
        { id: 'f05', title: 'Overseer Identity Clone', value: 'HIDDEN_IN_FIRMWARE', points: 500 },
        { id: 'f06', title: 'SHIVA Block-4 Injection', value: 'HIDDEN_IN_FIRMWARE', points: 500 },
        { id: 'f07', title: 'ADC Boot Protocol Bypass', value: 'HIDDEN_IN_FIRMWARE', points: 600 },
        { id: 'f08', title: 'Logic Signal Sequence', value: 'HIDDEN_IN_FIRMWARE', points: 500 },
        { id: 'f09', title: 'Root Partition Escape', value: 'HIDDEN_IN_FIRMWARE', points: 700 },
        { id: 'f10', title: 'Beacon SOS Decryption', value: 'HIDDEN_IN_FIRMWARE', points: 300 },
        { id: 'f11', title: 'EEPROM Registry Key', value: 'HIDDEN_IN_FIRMWARE', points: 600 },
        { id: 'f12', title: 'I2C Consistency Patch', value: 'HIDDEN_IN_FIRMWARE', points: 500 },
        { id: 'f13', title: 'Event Horizon Logs', value: 'HIDDEN_IN_FIRMWARE', points: 600 },
        { id: 'f14', title: 'Watchdog Recovery Key', value: 'HIDDEN_IN_FIRMWARE', points: 600 },
        { id: 'f15', title: 'Singularity Core Breach', value: 'HIDDEN_IN_FIRMWARE', points: 1000 }
      ],
      serialTriggers: [
        { id: 't1', matchRegex: 'CTF\\{.*\\}', action: 'unlock_hint' }
      ],
      customCode: `
          <div id="aegis-root" style="background: #020510; height: 100vh; width: 100%; overflow: hidden; position: relative; font-family: 'JetBrains Mono', monospace; color: #00f2ff; display: grid; grid-template-columns: 280px 1fr 320px; grid-template-rows: 60px 1fr 240px; gap: 4px; padding: 4px; box-sizing: border-box; user-select: none;">
            <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/xterm@5.1.0/css/xterm.css" />
            <script src="https://cdn.jsdelivr.net/npm/xterm@5.1.0/lib/xterm.js"></script>
            <script src="https://cdn.jsdelivr.net/npm/xterm-addon-fit@0.7.0/lib/xterm-addon-fit.js"></script>

            <!-- BACKGROUND CANVAS -->
            <canvas id="rpgCanvas" style="position: absolute; inset: 0; width: 100%; height: 100%; image-rendering: pixelated; z-index: 1;"></canvas>
            
            <div style="position: absolute; inset: 0; background: radial-gradient(circle, transparent 20%, rgba(0,2,20,0.8) 150%); pointer-events: none; z-index: 10;"></div>
            <div id="glitch-overlay" style="position: absolute; inset: 0; background: rgba(0, 242, 255, 0.02); opacity: 0; pointer-events: none; z-index: 11; mix-blend-mode: overlay;"></div>

            <!-- TOPBAR -->
            <div style="grid-column: 1 / span 3; background: rgba(0, 100, 255, 0.05); border: 1px solid rgba(0, 242, 255, 0.3); display: flex; align-items: center; justify-content: space-between; padding: 0 20px; z-index: 20; backdrop-filter: blur(5px);">
               <div style="display: flex; align-items: center; gap: 15px;">
                  <div style="width: 12px; height: 12px; background: #00f2ff; box-shadow: 0 0 10px #00f2ff; border-radius: 50%;" id="heartbeat"></div>
                  <div style="font-size: 16px; font-weight: 900; letter-spacing: 5px; color: #fff; text-shadow: 0 0 5px #00f2ff;">AEGIS-IV // ICARUS COMMAND</div>
               </div>
               <div style="display: flex; align-items: center; gap: 8px; background: rgba(0,242,255,0.05); border: 1px solid rgba(0,242,255,0.1); padding: 5px 15px; border-radius: 4px;">
                  <div id="morse-beacon" style="width: 8px; height: 8px; border-radius: 50%; background: #00f2ff; box-shadow: 0 0 8px #00f2ff; opacity: 0.2; transition: all 0.1s;"></div>
                  <div style="font-size: 8px; opacity: 0.6; letter-spacing: 2px;">BEACON_ACTIVE</div>
               </div>
               <div style="display: flex; gap: 40px; font-size: 10px; opacity: 0.8; font-weight: 800;">
                  <div>[ UP_TIME: <span id="uptime">0:00</span> ]</div>
                  <div>[ SEC_LVL: <span id="seclvl">GUEST</span> ]</div>
                  <div>[ CORE_STAB: <span id="stabText">94%</span> ]</div>
               </div>
            </div>

            <!-- LEFT: TELEMETRY & REACTOR -->
            <div style="background: rgba(0, 50, 255, 0.03); border: 1px solid rgba(0, 242, 255, 0.2); padding: 15px; display: flex; flex-direction: column; gap: 15px; z-index: 20; backdrop-filter: blur(2px);">
               <div>
                  <div style="font-size: 9px; font-weight: bold; margin-bottom: 8px; color: #fff; letter-spacing: 1px;">THERMAL_CORE_LOAD</div>
                  <div style="height: 100px; width: 100%; position: relative; border: 1px solid rgba(0, 242, 255, 0.2); background: rgba(0,0,0,0.4);">
                     <canvas id="tempGraph" style="width: 100%; height: 100%;"></canvas>
                     <div id="tempVal" style="position: absolute; top: 5px; right: 5px; font-size: 20px; font-weight: 900; color: #00f2ff;">32°C</div>
                  </div>
               </div>

               <div>
                  <div style="font-size: 9px; font-weight: bold; margin-bottom: 10px; color: #fff; letter-spacing: 1px;">LIFE_SUPPORT_O2</div>
                  <div style="height: 10px; background: #001122; border: 1px solid #00f2ff; position: relative;">
                     <div id="o2-fill" style="width: 50%; height: 100%; background: #00f2ff; box-shadow: 0 0 10px #00f2ff;"></div>
                  </div>
                  <div id="o2-text" style="text-align: right; font-size: 14px; font-weight: 900;">50%</div>
               </div>

               <div style="border-top:1px solid rgba(0,242,255,0.2); padding-top: 10px;">
                  <div style="font-size: 9px; font-weight: bold; margin-bottom: 8px; color: #fff;">SYSTEM_REG_MAP (EEPROM)</div>
                  <div id="regGrid" style="display: grid; grid-template-columns: repeat(8, 1fr); gap: 2px;">
                     <!-- Generated Slots -->
                  </div>
               </div>

               <div style="margin-top: auto; display: grid; grid-template-columns: 1fr 1fr; gap: 4px;">
                  <button onclick="window.hwAPI.sendSerial('status\r\n')" style="background: rgba(0,242,255,0.1); border: 1px solid #00f2ff; color: #00f2ff; font-size: 8px; padding: 4px; cursor: pointer;">SYS_STATUS</button>
                  <button onclick="window.hwAPI.sendSerial('i2c scan\r\n')" style="background: rgba(0,242,255,0.1); border: 1px solid #00f2ff; color: #00f2ff; font-size: 8px; padding: 4px; cursor: pointer;">I2C_SCAN</button>
                  <button onclick="window.hwAPI.sendSerial('sandbox\r\n')" style="background: rgba(0,242,255,0.1); border: 1px solid #00f2ff; color: #00f2ff; font-size: 8px; padding: 4px; cursor: pointer;">OPEN_SHELL</button>
                  <button onclick="window.hwAPI.sendSerial('fs_mount\r\n')" style="background: rgba(0,242,255,0.1); border: 1px solid #00f2ff; color: #00f2ff; font-size: 8px; padding: 4px; cursor: pointer;">MOUNT_VFS</button>
               </div>
            </div>

             <!-- CENTER: MISSION TACTICAL & AIRLOCK CONSOLE -->
             <div id="bridge-center-grid" style="display: grid; grid-template-columns: 1fr; grid-template-rows: 1fr auto; gap: 10px; background: rgba(0, 10, 30, 0.4); border-left: 1px solid rgba(0,242,255,0.1); border-right: 1px solid rgba(0,242,255,0.1); padding: 10px;">
               
               <!-- INTEGRATED HARDWARE TERMINAL (MAIN VIEW) -->
               <div id="term-module" style="background: rgba(0,5,15,0.98); position: relative; z-index: 30; padding: 5px; box-sizing: border-box; display: flex; flex-direction: column; min-height: 0; border: 1px solid #00f2ff;">
                  <div style="display: flex; justify-content: space-between; align-items: center; padding: 2px 10px; background: #00f2ff; color: #000; font-size: 9px; font-weight: 900; letter-spacing: 1px; margin-bottom: 5px;">
                     <span>[ ACCESS_TERM: ICARUS_PRIME_NODE ]</span>
                     <button onclick="toggleExpand('term-module')" style="background: none; border: none; font-weight: 900; cursor: pointer;">[ ]</button>
                  </div>
                  <div id="term-box" style="flex: 1; min-height: 0; cursor: text;"></div>
                  <input type="text" id="serial-cmd" style="background:#000; border:1px solid #00f2ff; color:#00f2ff; width:100%; font-family:monospace; padding:5px; margin-top:5px; box-sizing:border-box;" placeholder="> ENTER_CMD..." onkeydown="if(event.key==='Enter'){event.preventDefault(); window.hwAPI.sendSerial(this.value + '\r\n'); this.value='';}">
               </div>

               <!-- AIRLOCK STATUS (COMPACT SIDEBAR MODULE) -->
               <div id="airlock-module" style="height: 120px; pointer-events: auto; position: relative; border: 1px solid rgba(0,242,255,0.2); display: flex; align-items: center; justify-content: space-around; padding: 10px;">
                  <div style="display: flex; flex-direction: column; align-items: center;">
                    <div style="font-size: 10px; font-weight: 900; letter-spacing: 1px;">AIRLOCK</div>
                    <div id="door-stat" style="font-size: 10px; opacity: 0.8; color: #ff3300;">SEAL_ENGAGED</div>
                  </div>
                  
                  <!-- Compact Door -->
                  <div style="width: 60px; height: 40px; border: 1px solid rgba(0,242,255,0.2); background: #000; overflow: hidden; position: relative;">
                    <div id="door-left" style="position: absolute; left: 0; width: 50%; height: 100%; background: #002233; transition: transform 0.5s;"></div>
                    <div id="door-right" style="position: absolute; right: 0; width: 50%; height: 100%; background: #002233; transition: transform 0.5s;"></div>
                  </div>
                  
                  <div style="text-align: right;">
                    <div style="font-size: 8px; opacity: 0.5;">ATMOS_PSI</div>
                    <div id="pressure-val" style="font-size: 12px; font-weight: 900; color: #00f2ff;">0.01</div>
                    <button onclick="toggleExpand('airlock-module')" style="background: none; border: 1px solid #00f2ff; font-size: 8px; padding: 2px;">EXPAND</button>
                  </div>
               </div>
            </div>

            <!-- RIGHT: HARDWARE TOOLS -->
            <div style="background: rgba(0, 100, 255, 0.05); border: 1px solid rgba(0, 242, 255, 0.2); padding: 15px; z-index: 20; backdrop-filter: blur(2px); display: flex; flex-direction: column; gap: 12px;">
               <div>
                  <div style="font-size: 9px; font-weight: bold; color: #fff; margin-bottom: 6px;">RFID_EMULATOR_PRO</div>
                  <div style="display: flex; gap: 4px;">
                     <input id="rfidIn" type="text" placeholder="UID: 88 43" style="flex: 1; background: #000; border: 1px solid #00f2ff; color: #00f2ff; padding: 4px; font-size: 10px; font-family: inherit;"/>
                     <button onclick="emulateRFID()" style="background: #00f2ff; color: #000; border: none; font-size: 10px; font-weight: 900; padding: 0 10px; cursor: pointer;">SCAN</button>
                  </div>
                  <button onclick="writeRFID()" style="width: 100%; margin-top: 4px; background: transparent; border: 1px solid rgba(0,242,255,0.4); color: #00f2ff; font-size: 8px; padding: 2px; cursor: pointer;">INJECT_SHIVA_KEY (B4)</button>
               </div>

               <div>
                  <div style="font-size: 9px; font-weight: bold; color: #fff; margin-bottom: 6px;">ADC_VOLT_CONTROL</div>
                  <input type="range" id="adcSlid" min="0" max="1023" value="512" style="width: 100%; accent-color: #00f2ff;" oninput="updateADC(this.value)" />
                  <div style="display: flex; justify-content: space-between; font-size: 9px; opacity: 0.6;">
                    <span>0V</span>
                    <span id="adcU">512u</span>
                    <span>3.3V</span>
                  </div>
               </div>

               <div>
                   <div style="font-size: 9px; font-weight: bold; color: #fff; margin-bottom: 6px;">LOGIC_ANALYZER_SEQ</div>
                   <div style="display: grid; grid-template-columns: repeat(5, 1fr); gap: 4px; background: #000; padding: 8px; border: 1px solid rgba(0,242,255,0.2);">
                      <div class="logic-pin" id="lp-0" onclick="togglePin(0)" style="height: 15px; border: 1px solid #00f2ff; cursor: pointer;"></div>
                      <div class="logic-pin" id="lp-1" onclick="togglePin(1)" style="height: 15px; border: 1px solid #00f2ff; cursor: pointer;"></div>
                      <div class="logic-pin" id="lp-2" onclick="togglePin(2)" style="height: 15px; border: 1px solid #00f2ff; cursor: pointer;"></div>
                      <div class="logic-pin" id="lp-3" onclick="togglePin(3)" style="height: 15px; border: 1px solid #00f2ff; cursor: pointer;"></div>
                      <div class="logic-pin" id="lp-4" onclick="togglePin(4)" style="height: 15px; border: 1px solid #00f2ff; cursor: pointer;"></div>
                   </div>
                   <button onclick="commitLogic()" style="width: 100%; margin-top: 4px; background: #002233; border: 1px solid #00f2ff; color: #00f2ff; font-size: 8px; padding: 4px; cursor: pointer;">COMMIT_LOGIC_SEQUENCE</button>
               </div>

               <div style="margin-top: auto; border: 1px solid rgba(0,242,255,0.3); padding: 8px; background: rgba(0,0,0,0.4);">
                  <div style="font-size: 8px; margin-bottom: 4px; opacity: 0.5;">DANGER_ZONE</div>
                  <button onclick="window.hwAPI.sendSerial('reset_factory')" style="width: 100%; background: #330000; color: #ff5500; border: 1px solid #ff5500; font-size: 9px; cursor: pointer; padding: 6px; font-weight: 900;">FACTORY_RESET_STATION</button>
               </div>
            </div>

            <!-- HUD STATUS -->
            <div style="grid-column: 1 / span 3; background: #000; border-top: 2px solid #00f2ff; padding: 12px; display: flex; gap: 30px;">
               <div style="width: 100px; display: flex; flex-direction: column; align-items: center; border: 1px solid #004455; background: rgba(0,100,255,0.05);">
                  <div id="door-stat" style="font-size: 16px; font-weight: 900; color: #00f2ff;">LOCKED</div>
                  <div style="font-size: 8px; opacity: 0.5;">DECK_LOCK_G1</div>
               </div>
               <div id="hint-panel" style="flex: 1; border-left: 1px solid #002233; padding-left: 20px; font-size: 11px; color: #00f2ff; text-transform: uppercase; overflow-y: auto;">
                  [ INTEL: SYSTEM STABILIZED. PROCEED TO VFS_MOUNT FOR PROTOCOL ANALYSIS. ]
               </div>
            </div>

            <style>
               @keyframes glitch { 0% { transform: translate(0); } 10% { transform: translate(-2px, 2px); } 20% { transform: translate(2px, -2px); } 100% { transform: translate(0); } }
               .glitch { animation: glitch 0.2s infinite; }
               .stab-blink { animation: blink 0.5s infinite; }
               @keyframes blink { 0%, 100% { opacity: 1; } 50% { opacity: 0.3; } }
               .reg-cell { background: #001122; border: 1px solid #002233; height: 12px; }
               .reg-active { background: #00f2ff; box-shadow: 0 0 5px #00f2ff; }
               ::-webkit-scrollbar { width: 4px; }
               ::-webkit-scrollbar-thumb { background: #00f2ff; }
            </style>

            <script>
              const canvas = document.getElementById('rpgCanvas');
              const ctx = canvas.getContext('2d');
              const termBox = document.getElementById('term-box');
              let pinS = [0,0,0,0,0];
              const history = { temp: [] };

              // XTERM INIT (Mirroring robust XTermConsole.tsx method)
              async function initTerminal() {
                let attempts = 0;
                // Wait for XTerm *and* hwAPI!
                while ((!window.Terminal || !window.FitAddon || !window.hwAPI) && attempts < 20) {
                  console.log("Waiting for dependencies... Term: " + !!window.Terminal + ", Fit: " + !!window.FitAddon + ", API: " + !!window.hwAPI);
                  await new Promise(r => setTimeout(r, 100));
                  attempts++;
                }

                const TerminalConstructor = window.Terminal;
                const FitAddonConstructor = window.FitAddon ? window.FitAddon.FitAddon : null;

                if (!TerminalConstructor || !FitAddonConstructor || !window.hwAPI) {
                  console.error("XTerm, FitAddon, or hwAPI not loaded");
                  if (termBox) termBox.innerHTML = "<div style='color:red; padding:20px; font-size:10px;'>[ ERR: TERMINAL_CORE_LOAD_FAILED ] CHECK_COMMS_LINK</div>";
                  return;
                }
                
                const term = new TerminalConstructor({
                  cursorBlink: true,
                  theme: { background: 'transparent', foreground: '#00f2ff', cursor: '#00f2ff', selection: '#004455' },
                  fontSize: 13,
                  fontFamily: '"JetBrains Mono", monospace',
                  convertEol: true,
                  allowProposedApi: true,
                  scrollback: 10000
                });
                
                const fit = new FitAddonConstructor();
                term.loadAddon(fit);
                term.open(termBox);
                window.termInstance = term; // Assign to global for the bridge
                term.write('DEBUG: TERMINAL & API INITIALIZED\r\n');
                
                // Initial fit
                setTimeout(() => fit.fit(), 200);

                // Signal parent and drain buffered logs
                window.hwBridgeReady = true;
                window.parent.postMessage({ type: 'HW_BRIDGE_READY' }, '*');
                if (window.pendingLogs) {
                    window.pendingLogs.forEach(log => window.injectSerialData(log));
                    window.pendingLogs = [];
                }
                
                // Robust Resize Handling
                const ro = new ResizeObserver(() => fit.fit());
                ro.observe(termBox);

                // Serial Sync
                term.onData(d => window.hwAPI.sendSerial(d));
                window.addEventListener('serial-data-stream', (e) => {
                  const d = (e as CustomEvent).detail;
                  
                  // PARSE HEARTBEAT
                  if(d.includes('HB:{')) {
                    try {
                      // More robust matching: Look for the JSON object
                      const jsonMatch = d.match(/\{.*\}/);
                      if(jsonMatch) {
                        const data = JSON.parse(jsonMatch[0]);
                        document.getElementById('o2-fill').style.width = data.o2 + '%';
                        document.getElementById('o2-text').innerText = data.o2.toFixed(1) + '%';
                        document.getElementById('tempVal').innerText = data.temp.toFixed(1) + '°C';
                        const levels = ['GUEST', 'CREW', 'ENGINEER', 'ADMIN', 'OVERSEER'];
                        document.getElementById('seclvl').innerText = levels[data.sec] || 'UNKNOWN';
                        
                        history.temp.push(data.temp);
                        if(history.temp.length > 50) history.temp.shift();
                        drawGraph();
                        
                        // Pulse heartbeat indicator
                        const hb = document.getElementById('heartbeat');
                        hb.style.opacity = '1';
                        setTimeout(() => hb.style.opacity = '0.3', 200);

                        // Narrative updates
                        if (data.o2 < 20) document.getElementById('door-stat').style.color = '#ff0000';
                        else document.getElementById('door-stat').style.color = '#00f2ff';
                        
                        const press = (data.o2 / 100) * 14.7;
                        document.getElementById('pressure-val').innerText = press.toFixed(2) + ' PSI';
                      }
                    } catch(e) { console.error('Heartbeat parse error', e); }
                  }
                  
                  // Mission Milestone Detectors
                  if(d.includes('ADMIN BIOMETRICS ACCEPTED')) {
                     document.getElementById('door-stat').innerText = 'STATUS: UNLOCKED';
                     document.getElementById('door-stat').style.color = '#0f0';
                     document.getElementById('door-left').style.transform = 'translateX(-100%)';
                     document.getElementById('door-right').style.transform = 'translateX(100%)';
                  }

                  // Force line breaks for heartbeat packets to render correctly in terminal
                  const terminalOutput = d.replace(/HB:/g, '\r\nHB:');
                  term.write(terminalOutput.replace(/\r\n/g, '\n').replace(/\r/g, '\n'));
                  if(d.includes('REG:')) {
                     const match = d.match(/REG:0x([0-9A-F]+)=0x([0-9A-F]+)/);
                     if(match) {
                       const idx = parseInt(match[1], 16) % 64;
                       const el = document.getElementById('reg-' + idx);
                       if(el) { 
                         el.classList.add('reg-active'); 
                         setTimeout(() => el.classList.remove('reg-active'), 500); 
                       }
                     }
                  }
                });

                window.addEventListener('resize', () => fit.fit());
              }

              window.addEventListener('load', () => { setTimeout(initTerminal, 500); });

              // Modular UI Expand/Collapse
              window.toggleExpand = function(id) {
                const el = document.getElementById(id);
                if(!el) return;
                
                el.classList.toggle('full-expanded');
                if(el.classList.contains('full-expanded')) {
                   el.style.position = 'fixed';
                   el.style.inset = '0';
                   el.style.zIndex = '2000';
                   el.style.background = '#000';
                } else {
                   el.style.position = 'relative';
                   el.style.inset = 'auto';
                   el.style.zIndex = 'auto';
                   el.style.background = '';
                }
              };

              // TOOLS
              // MORSE LOGIC (CTF{MORSE_AEGIS_SOS_SIGNAL_UI})
              const morseSeq = ".- . --. .. ... / ... --- ...";
              let morseIdx = 0;
              function playMorse() {
                const beaconEl = document.getElementById('morse-beacon');
                if(!beaconEl) return;
                const char = morseSeq[morseIdx];
                let delay = 300;
                if (char === '.') { blinkMorse(beaconEl, 100); delay = 400; }
                else if (char === '-') { blinkMorse(beaconEl, 400); delay = 700; }
                else if (char === ' ') { delay = 300; }
                else if (char === '/') { delay = 1000; }
                morseIdx = (morseIdx + 1) % morseSeq.length;
                setTimeout(playMorse, delay);
              }
              function blinkMorse(el, ms) {
                el.style.opacity = '1';
                el.style.boxShadow = '0 0 15px #00f2ff';
                setTimeout(() => {
                  el.style.opacity = '0.2';
                  el.style.boxShadow = '0 0 5px #00f2ff';
                }, ms);
              }
              playMorse();

              function togglePin(i) {
                pinS[i] = pinS[i] ? 0 : 1;
                document.getElementById('lp-'+i).style.background = pinS[i] ? '#00f2ff' : 'transparent';
              }
              function commitLogic() { window.hwAPI.sendSerial('logic_analyze ' + pinS.join('')); }
              function emulateRFID() { window.hwAPI.sendSerial('rfid_emulate ' + document.getElementById('rfidIn').value.replace(/ /g, '')); }
              function writeRFID() { window.hwAPI.sendSerial('rfid_write 4 53484956410000000000000000000000'); }
              function updateADC(v) { document.getElementById('adcU').innerText = v + 'u'; window.hwAPI.sendSerial('eeprom_wr 0x70 ' + v); }

              // EEPROM GRID
              const regGrid = document.getElementById('regGrid');
              for(let i=0; i<64; i++) {
                const d = document.createElement('div');
                d.className = 'reg-cell';
                d.id = 'reg-' + i;
                regGrid.appendChild(d);
              }

              // RPG LAYER
              let player = { x: 750, y: 500 };
              const nodes = [
                { id: 'b', x: 750, y: 200, label: 'BRIDGE' },
                { id: 'r', x: 300, y: 450, label: 'REACTOR' },
                { id: 'e', x: 1200, y: 450, label: 'EEPROM' }
              ];
              function draw() {
                canvas.width = window.innerWidth; canvas.height = window.innerHeight;
                ctx.clearRect(0,0,canvas.width,canvas.height);
                nodes.forEach(n => {
                   const dist = Math.hypot(player.x - n.x, player.y - n.y);
                   ctx.strokeStyle = dist < 50 ? '#00f2ff' : 'rgba(0, 242, 255, 0.1)';
                   ctx.lineWidth = dist < 50 ? 3 : 1;
                   ctx.strokeRect(n.x-40, n.y-40, 80, 80);
                   ctx.fillStyle = '#00f2ff'; ctx.fillText(n.label, n.x-20, n.y-50);
                });
                ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(player.x, player.y, 8, 0, 7); ctx.fill();
                requestAnimationFrame(draw);
              }
              draw();

              // UPTIME
              let startT = Date.now();
              setInterval(() => {
                const s = Math.floor((Date.now() - startT)/1000);
                document.getElementById('uptime').innerText = Math.floor(s/60) + ':' + (s%60).toString().padStart(2,'0');
              }, 1000);

              const tCanvas = document.getElementById('tempGraph');
              const tCtx = tCanvas.getContext('2d');
              function drawGraph() {
                tCanvas.width = tCanvas.clientWidth; tCanvas.height = tCanvas.clientHeight;
                tCtx.strokeStyle = '#00f2ff'; tCtx.lineWidth = 2; tCtx.beginPath();
                history.temp.forEach((v, i) => {
                  const x = (i / 50) * tCanvas.width;
                  const y = tCanvas.height - (v / 80) * tCanvas.height;
                  if(i === 0) tCtx.moveTo(x, y); else tCtx.lineTo(x, y);
                });
                tCtx.stroke();
              }

              window.addEventListener('resize', () => fit.fit());
              setInterval(() => fit.fit(), 5000);
            </script>
          </div>
        `
    };

    // Merge logic: ensure HomeSec challenge is present and updated
    const otherChallenges = loadedChallenges.filter(c => c.id !== homeSecChallenge.id);
    return [homeSecChallenge, ...otherChallenges];
  });

  useEffect(() => {
    localStorage.setItem('hw_ctf_challenges', JSON.stringify(challenges));
  }, [challenges]);

  const addChallenge = (challenge: CtfChallenge) => {
    setChallenges(prev => [...prev, challenge]);
  };

  const updateChallenge = (id: string, updates: Partial<CtfChallenge>) => {
    setChallenges(prev => prev.map(c => c.id === id ? { ...c, ...updates } : c));
  };

  const deleteChallenge = (id: string) => {
    setChallenges(prev => prev.filter(c => c.id !== id));
  };

  return (
    <CtfContext.Provider value={{ challenges, addChallenge, updateChallenge, deleteChallenge }}>
      {children}
    </CtfContext.Provider>
  );
};

export const useCtf = () => {
  const context = useContext(CtfContext);
  if (context === undefined) {
    throw new Error('useCtf must be used within a CtfProvider');
  }
  return context;
};

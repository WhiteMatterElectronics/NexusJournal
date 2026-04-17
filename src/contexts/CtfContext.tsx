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
      title: 'HomeSec Vault: The Infiltration',
      description: 'You are an operative sent to recover classified data slabs from the HomeSec Vault. Use your ESP32 Assistant to bridge connections, sniff the SPI bus, and dump the I2C EEPROMs. \n\n**Mission Objectives:**\n1. Establish Serial connection.\n2. Bypass the Guardian security loop.\n3. Extract all data slabs from external and internal storage.',
      difficulty: 'hard',
      points: 1500,
      category: 'hardware',
      status: 'locked',
      inventoryItems: ['hs-01', 'esp-asst'],
      tutorials: [],
      notes: [],
      flags: [
        { id: 'f1', title: 'System Welcome', value: 'HIDDEN_IN_FIRMWARE', points: 50 },
        { id: 'f2', title: 'Caesar Leak', value: 'HIDDEN_IN_FIRMWARE', points: 100 },
        { id: 'f3', title: 'Vigenere Slab', value: 'HIDDEN_IN_FIRMWARE', points: 100 },
        { id: 'f4', title: 'Internal Memory', value: 'HIDDEN_IN_FIRMWARE', points: 150 },
        { id: 'f5', title: 'Secret Combo', value: 'HIDDEN_IN_FIRMWARE', points: 200 },
        { id: 'f6', title: 'Voltage Threshold', value: 'HIDDEN_IN_FIRMWARE', points: 100 },
        { id: 'f7', title: 'Signal Frequency', value: 'HIDDEN_IN_FIRMWARE', points: 100 },
        { id: 'f8', title: 'Guardian Defused', value: 'HIDDEN_IN_FIRMWARE', points: 250 },
        { id: 'f9', title: 'Hidden Auth', value: 'HIDDEN_IN_FIRMWARE', points: 150 },
        { id: 'f10', title: 'Core Vault', value: 'HIDDEN_IN_FIRMWARE', points: 500 },
        { id: 'f11', title: 'RFID Identity', value: 'HIDDEN_IN_FIRMWARE', points: 100 },
        { id: 'f12', title: 'RFID Packet', value: 'HIDDEN_IN_FIRMWARE', points: 100 },
        { id: 'f13', title: 'SPI Handshake', value: 'HIDDEN_IN_FIRMWARE', points: 200 },
        { id: 'f14', title: 'EEPROM Data #1', value: 'HIDDEN_IN_FIRMWARE', points: 80 },
        { id: 'f15', title: 'EEPROM Data #2', value: 'HIDDEN_IN_FIRMWARE', points: 80 },
        { id: 'f16', title: 'EEPROM Data #3', value: 'HIDDEN_IN_FIRMWARE', points: 80 },
        { id: 'f17', title: 'EEPROM Data #4', value: 'HIDDEN_IN_FIRMWARE', points: 80 },
        { id: 'f18', title: 'EEPROM Data #5', value: 'HIDDEN_IN_FIRMWARE', points: 80 }
      ],
      serialTriggers: [
        { id: 't1', matchRegex: 'CTF\\{.*\\}', action: 'unlock_hint' }
      ],
      customCode: `
          <div style="background: #020202; border: 2px solid #00f2ff; height: 100vh; overflow: hidden; position: relative; font-family: 'JetBrains Mono', monospace;">
            <canvas id="rpgCanvas" style="width: 100%; height: 100%; image-rendering: pixelated;"></canvas>
            
            <!-- Scanlines overlay -->
            <div style="position: absolute; inset: 0; background: linear-gradient(rgba(18, 16, 16, 0) 50%, rgba(0, 0, 0, 0.25) 50%), linear-gradient(90deg, rgba(255, 0, 0, 0.06), rgba(0, 255, 0, 0.02), rgba(0, 0, 255, 0.06)); z-index: 10; background-size: 100% 2px, 3px 100%; pointer-events: none;"></div>

            <div id="overlay" style="position: absolute; top: 20px; left: 20px; pointer-events: none; color: #00f2ff; text-shadow: 0 0 10px #00f2ff; z-index: 20;">
               <div style="font-size: 18px; font-weight: 800; letter-spacing: 2px; border-left: 4px solid #00f2ff; padding-left: 10px; margin-bottom: 10px;">HOMESEC OPERATION: DARK_SILENCE</div>
               <div id="status" style="font-size: 12px; margin-left: 14px;">SIGNAL: NOMINAL</div>
               <div id="pos" style="font-size: 10px; margin-left: 14px; opacity: 0.7;">COORDS: [0, 0]</div>
               
               <div id="inventoryUI" style="margin-top: 20px; font-size: 10px; background: rgba(0, 242, 255, 0.1); padding: 10px; border: 1px solid rgba(0, 242, 255, 0.3);">
                  <div style="border-bottom: 1px solid rgba(0, 242, 255, 0.3); margin-bottom: 5px; font-weight: bold;">BRIDGE_TOOLS</div>
                  • SERIAL_PUMP v1.2<br/>
                  • RFID_INJECTOR [MFRC522]<br/>
                  • I2C_BUS_WALKER
               </div>
            </div>

            <div id="controlsUI" style="position: absolute; bottom: 20px; right: 20px; display: flex; flex-direction: column; gap: 8px; z-index: 20;">
               <div style="font-size: 10px; color: #00f2ff; text-align: right; margin-bottom: 5px; opacity: 0.6; font-weight: bold;">SYS_COMMANDS</div>
               <button onclick="window.hwAPI.sendSerial('hint')" style="background: rgba(0,242,255,0.1); border: 1px solid #00f2ff; color: #00f2ff; padding: 8px 15px; font-family: 'JetBrains Mono', monospace; cursor: pointer; text-transform: uppercase; font-size: 11px; text-align: left; transition: all 0.2s;" onmouseover="this.style.background='rgba(0,242,255,0.3)'" onmouseout="this.style.background='rgba(0,242,255,0.1)'">> REQUEST HINT</button>
               <button onclick="window.hwAPI.sendSerial('sidequest')" style="background: rgba(255,255,0,0.1); border: 1px solid #ffff00; color: #ffff00; padding: 8px 15px; font-family: 'JetBrains Mono', monospace; cursor: pointer; text-transform: uppercase; font-size: 11px; text-align: left; transition: all 0.2s;" onmouseover="this.style.background='rgba(255,255,0,0.3)'" onmouseout="this.style.background='rgba(255,255,0,0.1)'">> START SIDEQUEST</button>
               <button onclick="window.hwAPI.sendSerial('reset_contest')" style="background: rgba(255,0,0,0.1); border: 1px solid #ff0000; color: #ff0000; padding: 8px 15px; font-family: 'JetBrains Mono', monospace; cursor: pointer; text-transform: uppercase; font-size: 11px; text-align: left; margin-top: 10px; transition: all 0.2s;" onmouseover="this.style.background='rgba(255,0,0,0.3)'" onmouseout="this.style.background='rgba(255,0,0,0.1)'">> [DANGER] RESET VAULT</button>
            </div>

            <div id="terminal-hint" style="position: absolute; bottom: 30px; left: 50%; transform: translateX(-50%); background: rgba(0,242,255,0.05); border: 1px solid #00f2ff; padding: 15px; font-size: 12px; display: none; z-index: 100; backdrop-filter: blur(5px); box-shadow: 0 0 20px rgba(0,242,255,0.2); width: 80%; max-width: 600px;">
               <div style="color: #00f2ff; font-weight: bold; margin-bottom: 5px; font-size: 10px; opacity: 0.6;">NETWORK_INTERCEPT</div>
               <span id="hint-text" style="color: #fff;"></span>
            </div>

            <script>
              const canvas = document.getElementById('rpgCanvas');
              const ctx = canvas.getContext('2d');
              const statusEl = document.getElementById('status');
              const posEl = document.getElementById('pos');
              const hintEl = document.getElementById('terminal-hint');
              const hintText = document.getElementById('hint-text');

              // RPG State
              const player = { x: 400, y: 400, size: 20, color: '#00f2ff', history: [] };
              const nodes = [
                { id: 'vault', x: 200, y: 300, label: 'CENTRAL VAULT', type: 'hardware', color: '#ff00ff' },
                { id: 'mfrc', x: 900, y: 300, label: 'RFID INTERFACE', type: 'sensor', color: '#00f2ff' },
                { id: 'eeprom', x: 200, y: 700, label: 'SECURE_STORAGE [I2C]', type: 'storage', color: '#00ff00' },
                { id: 'tiny', x: 900, y: 700, label: 'CO-PROCESSOR [SPI]', type: 'mcu', color: '#ffff00' },
                { id: 'buttons', x: 550, y: 150, label: 'CTRL_PANEL [Konami]', type: 'input', color: '#ffffff' }
              ];

              function resize() {
                canvas.width = window.innerWidth;
                canvas.height = window.innerHeight;
              }
              window.addEventListener('resize', resize);
              resize();

              // Controls
              const keys = {};
              window.addEventListener('keydown', e => keys[e.key] = true);
              window.addEventListener('keyup', e => keys[e.key] = false);

              function draw() {
                ctx.fillStyle = '#020202';
                ctx.fillRect(0, 0, canvas.width, canvas.height);

                // Draw Grid (Iso-ish perspective)
                ctx.strokeStyle = '#00f2ff08';
                ctx.lineWidth = 1;
                for(let i=-2000; i<3000; i+=60) {
                  ctx.beginPath(); 
                  ctx.moveTo(i, 0); ctx.lineTo(i + 500, canvas.height); 
                  ctx.stroke();
                  ctx.beginPath();
                  ctx.moveTo(i, canvas.height); ctx.lineTo(i + 500, 0);
                  ctx.stroke();
                }

                // Trails
                player.history.push({x: player.x, y: player.y});
                if(player.history.length > 20) player.history.shift();
                
                player.history.forEach((h, i) => {
                  ctx.fillStyle = \`rgba(0, 242, 255, \${i/40})\`;
                  ctx.beginPath();
                  ctx.arc(h.x, h.y, 4, 0, Math.PI * 2);
                  ctx.fill();
                });

                // Draw Nodes
                nodes.forEach(node => {
                  const dist = Math.hypot(player.x - node.x, player.y - node.y);
                  const isNear = dist < 80;
                  
                  // Glow
                  const gradient = ctx.createRadialGradient(node.x, node.y, 5, node.x, node.y, 100);
                  gradient.addColorStop(0, \`\${node.color}22\`);
                  gradient.addColorStop(1, 'transparent');
                  ctx.fillStyle = gradient;
                  ctx.fillRect(node.x - 100, node.y - 100, 200, 200);

                  ctx.strokeStyle = isNear ? node.color : \`\${node.color}44\`;
                  ctx.fillStyle = isNear ? \`\${node.color}22\` : 'transparent';
                  ctx.lineWidth = isNear ? 3 : 1;
                  
                  // Shape
                  ctx.beginPath();
                  ctx.moveTo(node.x, node.y - 20);
                  ctx.lineTo(node.x + 20, node.y);
                  ctx.lineTo(node.x, node.y + 20);
                  ctx.lineTo(node.x - 20, node.y);
                  ctx.closePath();
                  ctx.fill();
                  ctx.stroke();

                  ctx.fillStyle = isNear ? node.color : '#00f2ff55';
                  ctx.font = '800 12px monospace';
                  ctx.fillText(node.label, node.x - 40, node.y - 35);
                  
                  if (isNear) {
                    ctx.fillStyle = '#fff';
                    ctx.font = '10px monospace';
                    ctx.fillText('[SPACE] ACCESS_NODE', node.x - 45, node.y + 40);
                    if (keys[' ']) {
                      window.hwAPI.sendSerial(\`HELP \${node.id}\`);
                      hintEl.style.display = 'block';
                      hintText.innerText = \`ESTABLISHING HANDSHAKE WITH \${node.label}...\`;
                      statusEl.innerText = \`SIGNAL: INTERACTING[\${node.id.toUpperCase()}]\`;
                      statusEl.style.color = node.color;
                    }
                  }
                });

                // Draw Player
                ctx.fillStyle = '#fff';
                ctx.save();
                ctx.shadowBlur = 15;
                ctx.shadowColor = '#00f2ff';
                ctx.beginPath();
                ctx.arc(player.x, player.y, 8, 0, Math.PI * 2);
                ctx.fill();
                ctx.strokeStyle = '#00f2ff';
                ctx.lineWidth = 2;
                ctx.stroke();
                ctx.restore();

                // Movement
                let dx = 0, dy = 0;
                if (keys['ArrowUp'] || keys['w']) dy -= 4;
                if (keys['ArrowDown'] || keys['s']) dy += 4;
                if (keys['ArrowLeft'] || keys['a']) dx -= 4;
                if (keys['ArrowRight'] || keys['d']) dx += 4;
                
                player.x += dx;
                player.y += dy;
                
                // Bounds
                player.x = Math.max(50, Math.min(canvas.width - 50, player.x));
                player.y = Math.max(50, Math.min(canvas.height - 50, player.y));

                posEl.innerText = \`COORDS: [\${Math.floor(player.x)}, \${Math.floor(player.y)}]\`;

                requestAnimationFrame(draw);
              }

              window.hwAPI.onSerialData((data) => {
                 if (data.includes('CTF{')) {
                    hintEl.style.display = 'block';
                    hintText.innerHTML = \`<span style="color:#00f2ff;">[!] SLAB_INTERCEPTED:</span> <span style="background:#00f2ff;color:#000;padding:0 4px;">\${data.match(/CTF\\{.*?\\}/)[0]}</span>\`;
                    setTimeout(() => { hintEl.style.display = 'none'; }, 8000);
                 }
              });

              draw();
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

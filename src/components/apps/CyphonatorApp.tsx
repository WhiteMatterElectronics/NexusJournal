import React, { useState } from "react";
import { Lock, Unlock, ArrowRight, ArrowDownToLine, Trash2, Info, X } from "lucide-react";
import { motion, AnimatePresence } from "motion/react";

type CipherType = 
  | "rot13" | "caesar" | "vigenere" | "ascii85" | "base64" 
  | "hex" | "binary" | "morse" | "atbash" | "affine" 
  | "baconian" | "url" | "base32" | "sha1" | "sha256" 
  | "sha384" | "sha512" | "xor" | "railfence" | "a1z26" 
  | "octal" | "reverse" | "rot47";

const MORSE_CODE: Record<string, string> = {
  "A": ".-", "B": "-...", "C": "-.-.", "D": "-..", "E": ".", "F": "..-.",
  "G": "--.", "H": "....", "I": "..", "J": ".---", "K": "-.-", "L": ".-..",
  "M": "--", "N": "-.", "O": "---", "P": ".--.", "Q": "--.-", "R": ".-.",
  "S": "...", "T": "-", "U": "..-", "V": "...-", "W": ".--", "X": "-..-",
  "Y": "-.--", "Z": "--..", "1": ".----", "2": "..---", "3": "...--",
  "4": "....-", "5": ".....", "6": "-....", "7": "--...", "8": "---..",
  "9": "----.", "0": "-----", " ": "/"
};

const REVERSE_MORSE = Object.fromEntries(Object.entries(MORSE_CODE).map(([k, v]) => [v, k]));
const BASE32_ALPHABET = "ABCDEFGHIJKLMNOPQRSTUVWXYZ234567";

const CIPHER_INFO: Record<CipherType, { name: string; history: string; usage: string }> = {
  base64: { name: "Base64", history: "Originated in the 1980s for MIME email formatting to safely transport binary data across text-based protocols.", usage: "Used to encode binary data (like images or tokens) into printable ASCII characters." },
  hex: { name: "Hexadecimal", history: "Used since the early days of computing (1950s/60s) as a human-friendly representation of binary values.", usage: "Commonly used in programming, memory dumps, and color codes." },
  binary: { name: "Binary", history: "The fundamental language of modern computers, conceptualized by Gottfried Leibniz in 1689 and applied to logic by George Boole.", usage: "Represents data as 0s and 1s. Used for low-level machine code and data transmission." },
  url: { name: "URL Encoding", history: "Defined in RFC 3986 to ensure that special characters in URLs are safely transmitted over HTTP.", usage: "Used to encode query parameters and form data in web requests." },
  rot13: { name: "ROT13", history: "Developed in the early 1980s on the Usenet network to hide spoilers, punchlines, and offensive jokes.", usage: "A simple substitution cipher that replaces a letter with the 13th letter after it. Self-reciprocal (encoding and decoding use the same algorithm)." },
  caesar: { name: "Caesar Cipher", history: "Named after Julius Caesar, who used it around 58 BC to protect messages of military significance.", usage: "Shifts each letter in the plaintext by a fixed number of positions down the alphabet." },
  vigenere: { name: "Vigenère Cipher", history: "Described by Giovan Battista Bellaso in 1553, but misattributed to Blaise de Vigenère. It was considered 'le chiffre indéchiffrable' (the indecipherable cipher) for 300 years.", usage: "Uses a keyword to apply a series of interwoven Caesar ciphers based on the letters of the keyword." },
  atbash: { name: "Atbash Cipher", history: "An ancient Hebrew cipher originally used to encrypt the Hebrew alphabet. Found in the Book of Jeremiah.", usage: "Maps the alphabet to its reverse (A->Z, B->Y, etc.)." },
  affine: { name: "Affine Cipher", history: "A classic substitution cipher that uses modular arithmetic. It combines multiplication and addition.", usage: "Requires two keys (A and B). 'A' must be coprime to the alphabet size (26)." },
  baconian: { name: "Baconian Cipher", history: "Invented by Sir Francis Bacon in 1605. It was designed to hide a secret message within a plain text by using two different typefaces.", usage: "Replaces each letter with a 5-character sequence of 'A' and 'B' (essentially a 5-bit binary encoding)." },
  morse: { name: "Morse Code", history: "Invented by Samuel Morse and Alfred Vail in the 1830s for the electrical telegraph system.", usage: "Encodes text characters as standardized sequences of two different signal durations, called dots and dashes." },
  base32: { name: "Base32", history: "Designed to be human-readable and avoid ambiguous characters (like 1/I/l and 0/O).", usage: "Often used for TOTP secret keys (like Google Authenticator) and in systems where data might be spoken or manually typed." },
  ascii85: { name: "ASCII85 (Base85)", history: "Developed by Paul Rutter for the btoa utility and later adopted by Adobe for PostScript and PDF.", usage: "More efficient than Base64, encoding 4 bytes of binary data into 5 ASCII characters." },
  sha1: { name: "SHA-1", history: "Designed by the NSA and published in 1995. Now considered cryptographically broken against well-funded attackers.", usage: "A one-way hash function producing a 160-bit hash. Used historically in SSL/TLS and Git." },
  sha256: { name: "SHA-256", history: "Part of the SHA-2 family designed by the NSA in 2001 to address the weaknesses of SHA-1.", usage: "A secure one-way hash function producing a 256-bit hash. Widely used in modern cryptography, TLS, and Bitcoin." },
  sha384: { name: "SHA-384", history: "Part of the SHA-2 family, providing a truncated version of SHA-512.", usage: "Produces a 384-bit hash. Used in environments requiring higher security than SHA-256." },
  sha512: { name: "SHA-512", history: "Part of the SHA-2 family, optimized for 64-bit processors.", usage: "Produces a 512-bit hash. Used for high-security hashing and digital signatures." },
  xor: { name: "XOR Cipher", history: "A fundamental operation in digital logic and cryptography. When used with a truly random key of the same length as the message, it becomes the unbreakable One-Time Pad.", usage: "Applies the bitwise XOR operation between the text and a repeating key. Output is represented in Hexadecimal." },
  railfence: { name: "Rail Fence Cipher", history: "A classic transposition cipher used in ancient times, including the Greek scytale.", usage: "Writes the message downwards and diagonally on successive 'rails' of an imaginary fence, then reads off each row." },
  a1z26: { name: "A1Z26", history: "A simple substitution cipher often used in puzzles and geocaching.", usage: "Converts each letter to its corresponding number in the alphabet (A=1, B=2, ..., Z=26)." },
  octal: { name: "Octal", history: "Widely used in early computing systems (like 12-bit, 24-bit, and 36-bit architectures) because it easily maps to 3-bit binary groups.", usage: "Represents text characters as base-8 numbers." },
  reverse: { name: "Reverse Text", history: "A trivial transposition cipher. Leonardo da Vinci famously used mirror writing in his notebooks.", usage: "Simply reverses the order of the characters in the string." },
  rot47: { name: "ROT47", history: "A derivative of ROT13 that includes numbers and symbols, making the obfuscated text look more complex.", usage: "Shifts all printable ASCII characters (from 33 '!' to 126 '~') by 47 positions." }
};

export const CyphonatorApp: React.FC = () => {
  const [input, setInput] = useState("");
  const [output, setOutput] = useState("");
  const [cipher, setCipher] = useState<CipherType>("base64");
  const [mode, setMode] = useState<"encode" | "decode">("encode");
  const [showInfo, setShowInfo] = useState(false);
  
  // Parameters
  const [caesarShift, setCaesarShift] = useState(3);
  const [vigenereKey, setVigenereKey] = useState("KEY");
  const [affineA, setAffineA] = useState(5);
  const [affineB, setAffineB] = useState(8);
  const [xorKey, setXorKey] = useState("KEY");
  const [railFenceRails, setRailFenceRails] = useState(3);

  const processText = async () => {
    try {
      let result = "";
      const text = input;

      if (cipher === "base64") {
        result = mode === "encode" ? btoa(text) : atob(text);
      } else if (cipher === "hex") {
        if (mode === "encode") {
          result = Array.from(text).map(c => c.charCodeAt(0).toString(16).padStart(2, "0")).join(" ");
        } else {
          result = text.split(/\s+/).map(h => String.fromCharCode(parseInt(h, 16))).join("");
        }
      } else if (cipher === "binary") {
        if (mode === "encode") {
          result = Array.from(text).map(c => c.charCodeAt(0).toString(2).padStart(8, "0")).join(" ");
        } else {
          result = text.split(/\s+/).map(b => String.fromCharCode(parseInt(b, 2))).join("");
        }
      } else if (cipher === "octal") {
        if (mode === "encode") {
          result = Array.from(text).map(c => c.charCodeAt(0).toString(8).padStart(3, "0")).join(" ");
        } else {
          result = text.split(/\s+/).map(o => String.fromCharCode(parseInt(o, 8))).join("");
        }
      } else if (cipher === "url") {
        result = mode === "encode" ? encodeURIComponent(text) : decodeURIComponent(text);
      } else if (cipher === "rot13") {
        result = text.replace(/[a-zA-Z]/g, c => {
          const base = c <= "Z" ? 65 : 97;
          return String.fromCharCode(((c.charCodeAt(0) - base + 13) % 26) + base);
        });
      } else if (cipher === "rot47") {
        result = text.replace(/[\x21-\x7E]/g, c => {
          let code = c.charCodeAt(0) + 47;
          if (code > 126) code -= 94;
          return String.fromCharCode(code);
        });
      } else if (cipher === "reverse") {
        result = text.split('').reverse().join('');
      } else if (cipher === "a1z26") {
        if (mode === "encode") {
          let words = text.toUpperCase().split(' ');
          result = words.map(w => Array.from(w).filter(c => c >= 'A' && c <= 'Z').map(c => c.charCodeAt(0) - 64).join('-')).join(' ');
        } else {
          let words = text.split(' ');
          result = words.map(w => w.split('-').map(n => {
            const num = parseInt(n);
            return (!isNaN(num) && num >= 1 && num <= 26) ? String.fromCharCode(num + 64) : n;
          }).join('')).join(' ');
        }
      } else if (cipher === "caesar") {
        const shift = mode === "encode" ? caesarShift : (26 - (caesarShift % 26));
        result = text.replace(/[a-zA-Z]/g, c => {
          const base = c <= "Z" ? 65 : 97;
          return String.fromCharCode(((c.charCodeAt(0) - base + shift) % 26) + base);
        });
      } else if (cipher === "atbash") {
        result = text.replace(/[a-zA-Z]/g, c => {
          const base = c <= "Z" ? 65 : 97;
          return String.fromCharCode(base + 25 - (c.charCodeAt(0) - base));
        });
      } else if (cipher === "morse") {
        if (mode === "encode") {
          result = text.toUpperCase().split("").map(c => MORSE_CODE[c] || c).join(" ");
        } else {
          result = text.split(" ").map(c => REVERSE_MORSE[c] || c).join("");
        }
      } else if (cipher === "vigenere") {
        const key = vigenereKey.toUpperCase().replace(/[^A-Z]/g, "");
        if (!key) throw new Error("Invalid Vigenere key");
        let keyIdx = 0;
        result = text.replace(/[a-zA-Z]/g, c => {
          const base = c <= "Z" ? 65 : 97;
          const shift = key.charCodeAt(keyIdx % key.length) - 65;
          keyIdx++;
          const finalShift = mode === "encode" ? shift : (26 - shift);
          return String.fromCharCode(((c.charCodeAt(0) - base + finalShift) % 26) + base);
        });
      } else if (cipher === "xor") {
        const key = xorKey || "KEY";
        if (mode === "encode") {
          result = Array.from(text).map((c, i) => (c.charCodeAt(0) ^ key.charCodeAt(i % key.length)).toString(16).padStart(2, '0')).join('');
        } else {
          let chars = text.replace(/\s/g, '').match(/.{1,2}/g) || [];
          result = chars.map((hex, i) => String.fromCharCode(parseInt(hex, 16) ^ key.charCodeAt(i % key.length))).join('');
        }
      } else if (cipher === "railfence") {
        const numRails = Math.max(2, railFenceRails);
        if (mode === "encode") {
          let rails = Array.from({length: numRails}, () => "");
          let dir = 1, row = 0;
          for (let char of text) {
            rails[row] += char;
            if (row === 0) dir = 1;
            else if (row === numRails - 1) dir = -1;
            row += dir;
          }
          result = rails.join('');
        } else {
          let cycle = 2 * numRails - 2;
          let lengths = Array(numRails).fill(0);
          for(let i=0; i<text.length; i++) {
            let pos = i % cycle;
            let row = pos < numRails ? pos : cycle - pos;
            lengths[row]++;
          }
          let rails: string[][] = [];
          let idx = 0;
          for(let i=0; i<numRails; i++) {
            rails.push(text.slice(idx, idx + lengths[i]).split(''));
            idx += lengths[i];
          }
          let row = 0, dir = 1;
          for(let i=0; i<text.length; i++) {
            result += rails[row].shift() || "";
            if (row === 0) dir = 1;
            else if (row === numRails - 1) dir = -1;
            row += dir;
          }
        }
      } else if (cipher === "affine") {
        const a = affineA;
        const b = affineB;
        let aInv = 0;
        for (let i = 0; i < 26; i++) {
          if ((a * i) % 26 === 1) aInv = i;
        }
        if (aInv === 0) throw new Error("'a' must be coprime to 26");

        result = text.replace(/[a-zA-Z]/g, c => {
          const base = c <= "Z" ? 65 : 97;
          const x = c.charCodeAt(0) - base;
          if (mode === "encode") {
            return String.fromCharCode(((a * x + b) % 26) + base);
          } else {
            return String.fromCharCode(((aInv * (x - b + 26)) % 26) + base);
          }
        });
      } else if (cipher === "baconian") {
        if (mode === "encode") {
          result = text.toLowerCase().replace(/[a-z]/g, c => {
            const val = c.charCodeAt(0) - 97;
            return val.toString(2).padStart(5, "0").replace(/0/g, "A").replace(/1/g, "B");
          });
        } else {
          const chunks = text.replace(/[^ABab]/g, "").toUpperCase().match(/.{1,5}/g) || [];
          result = chunks.map(chunk => {
            if (chunk.length !== 5) return "";
            const val = parseInt(chunk.replace(/A/g, "0").replace(/B/g, "1"), 2);
            return String.fromCharCode(val + 97);
          }).join("");
        }
      } else if (cipher === "base32") {
        if (mode === "encode") {
          let bits = "";
          for (let i = 0; i < text.length; i++) {
            bits += text.charCodeAt(i).toString(2).padStart(8, "0");
          }
          while (bits.length % 5 !== 0) bits += "0";
          for (let i = 0; i < bits.length; i += 5) {
            result += BASE32_ALPHABET[parseInt(bits.slice(i, i + 5), 2)];
          }
          const padding = (8 - (result.length % 8)) % 8;
          result += "=".repeat(padding);
        } else {
          let bits = "";
          const cleanText = text.replace(/=+$/, "").toUpperCase();
          for (let i = 0; i < cleanText.length; i++) {
            const val = BASE32_ALPHABET.indexOf(cleanText[i]);
            if (val === -1) continue;
            bits += val.toString(2).padStart(5, "0");
          }
          for (let i = 0; i + 8 <= bits.length; i += 8) {
            result += String.fromCharCode(parseInt(bits.slice(i, i + 8), 2));
          }
        }
      } else if (cipher === "ascii85") {
        if (mode === "encode") {
          let padding = (4 - (text.length % 4)) % 4;
          let paddedText = text + "\0".repeat(padding);
          for (let i = 0; i < paddedText.length; i += 4) {
            let num = (paddedText.charCodeAt(i) << 24) + (paddedText.charCodeAt(i+1) << 16) + (paddedText.charCodeAt(i+2) << 8) + paddedText.charCodeAt(i+3);
            if (num === 0) {
              result += "z";
            } else {
              let chunk = "";
              for (let j = 0; j < 5; j++) {
                chunk = String.fromCharCode((num % 85) + 33) + chunk;
                num = Math.floor(num / 85);
              }
              result += chunk;
            }
          }
          if (padding > 0) result = result.slice(0, -padding);
          result = "<~" + result + "~>";
        } else {
          let cleanText = text.replace(/^<~/, "").replace(/~>$/, "").replace(/\s/g, "");
          let decoded = "";
          for (let i = 0; i < cleanText.length; ) {
            if (cleanText[i] === "z") {
              decoded += "\0\0\0\0";
              i++;
              continue;
            }
            let chunk = cleanText.slice(i, i + 5);
            if (chunk.length < 5) {
              chunk += "u".repeat(5 - chunk.length);
            }
            let num = 0;
            for (let j = 0; j < 5; j++) {
              num = num * 85 + (chunk.charCodeAt(j) - 33);
            }
            decoded += String.fromCharCode((num >> 24) & 255, (num >> 16) & 255, (num >> 8) & 255, num & 255);
            i += 5;
          }
          let padding = 5 - (cleanText.length % 5);
          if (padding !== 5) decoded = decoded.slice(0, -padding);
          result = decoded;
        }
      } else if (cipher.startsWith("sha")) {
        if (mode === "decode") {
          throw new Error("Cryptographic hashes are one-way functions and cannot be decoded.");
        }
        const algo = cipher === "sha1" ? "SHA-1" : cipher === "sha256" ? "SHA-256" : cipher === "sha384" ? "SHA-384" : "SHA-512";
        const hashBuffer = await crypto.subtle.digest(algo, new TextEncoder().encode(text));
        result = Array.from(new Uint8Array(hashBuffer)).map(b => b.toString(16).padStart(2, "0")).join("");
      }

      setOutput(result);
    } catch (err: any) {
      setOutput(`Error: ${err.message || "Invalid input for this cipher"}`);
    }
  };

  return (
    <div className="flex flex-col h-full bg-black/60 relative">
      
      {/* Info Modal */}
      <AnimatePresence>
        {showInfo && (
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            exit={{ opacity: 0, scale: 0.95 }}
            transition={{ duration: 0.15 }}
            className="absolute inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          >
            <div className="bg-hw-black border border-hw-blue/40 shadow-[0_0_30px_rgba(0,242,255,0.15)] max-w-md w-full p-6 flex flex-col gap-4 relative">
              <button onClick={() => setShowInfo(false)} className="absolute top-4 right-4 text-hw-blue/60 hover:text-hw-blue">
                <X className="w-4 h-4" />
              </button>
              <div className="flex items-center gap-3 border-b border-hw-blue/20 pb-3">
                <Info className="w-6 h-6 text-hw-blue" />
                <h2 className="text-lg font-bold text-hw-blue uppercase tracking-widest">{CIPHER_INFO[cipher].name}</h2>
              </div>
              <div className="flex flex-col gap-2">
                <h3 className="text-[10px] font-bold text-hw-blue/80 uppercase tracking-widest">History</h3>
                <p className="text-xs text-hw-blue/70 leading-relaxed font-mono">{CIPHER_INFO[cipher].history}</p>
              </div>
              <div className="flex flex-col gap-2 mt-2">
                <h3 className="text-[10px] font-bold text-hw-blue/80 uppercase tracking-widest">Usage</h3>
                <p className="text-xs text-hw-blue/70 leading-relaxed font-mono">{CIPHER_INFO[cipher].usage}</p>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="hw-panel-header shrink-0 flex justify-between items-center border-b border-hw-blue/20">
        <div className="flex items-center gap-4">
          <span>CYPHONATOR_TOOL</span>
        </div>
      </div>

      <div className="flex-1 overflow-y-auto p-4 custom-scrollbar flex flex-col gap-4">
        
        {/* Controls */}
        <div className="flex flex-wrap gap-4 items-end bg-hw-blue/5 p-4 border border-hw-blue/20">
          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-widest text-hw-blue/60">Algorithm</label>
            <div className="flex items-center gap-2">
              <select 
                value={cipher} 
                onChange={(e) => setCipher(e.target.value as CipherType)}
                className="bg-black/40 border border-hw-blue/20 px-2 py-1 text-xs font-mono text-hw-blue outline-none focus:border-hw-blue"
              >
                <optgroup label="Encodings">
                  <option value="base64">Base64</option>
                  <option value="hex">Hexadecimal</option>
                  <option value="binary">Binary</option>
                  <option value="octal">Octal</option>
                  <option value="url">URL Encoding</option>
                  <option value="base32">Base32</option>
                  <option value="ascii85">ASCII85</option>
                </optgroup>
                <optgroup label="Ciphers">
                  <option value="rot13">ROT13</option>
                  <option value="rot47">ROT47</option>
                  <option value="caesar">Caesar Cipher</option>
                  <option value="vigenere">Vigenère Cipher</option>
                  <option value="atbash">Atbash Cipher</option>
                  <option value="affine">Affine Cipher</option>
                  <option value="baconian">Baconian Cipher</option>
                  <option value="xor">XOR Cipher</option>
                  <option value="railfence">Rail Fence Cipher</option>
                  <option value="a1z26">A1Z26</option>
                  <option value="reverse">Reverse Text</option>
                </optgroup>
                <optgroup label="Formats">
                  <option value="morse">Morse Code</option>
                </optgroup>
                <optgroup label="Hashing (One-Way)">
                  <option value="sha1">SHA-1</option>
                  <option value="sha256">SHA-256</option>
                  <option value="sha384">SHA-384</option>
                  <option value="sha512">SHA-512</option>
                </optgroup>
              </select>
              <button 
                onClick={() => setShowInfo(true)}
                className="p-1 text-hw-blue/60 hover:text-hw-blue hover:bg-hw-blue/10 rounded transition-colors"
                title="Algorithm Info"
              >
                <Info className="w-4 h-4" />
              </button>
            </div>
          </div>

          <div className="flex flex-col gap-1">
            <label className="text-[10px] uppercase tracking-widest text-hw-blue/60">Mode</label>
            <div className="flex bg-black/40 border border-hw-blue/20">
              <button 
                onClick={() => setMode("encode")}
                className={`px-3 py-1 text-xs font-mono uppercase ${mode === "encode" ? "bg-hw-blue/20 text-hw-blue" : "text-hw-blue/40 hover:text-hw-blue/80"}`}
              >
                Encode
              </button>
              <button 
                onClick={() => setMode("decode")}
                disabled={cipher.startsWith("sha")}
                className={`px-3 py-1 text-xs font-mono uppercase ${mode === "decode" ? "bg-hw-blue/20 text-hw-blue" : "text-hw-blue/40 hover:text-hw-blue/80"} ${cipher.startsWith("sha") ? "opacity-50 cursor-not-allowed" : ""}`}
              >
                Decode
              </button>
            </div>
          </div>

          {cipher === "caesar" && (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-widest text-hw-blue/60">Shift</label>
              <input 
                type="number" 
                value={caesarShift} 
                onChange={(e) => setCaesarShift(parseInt(e.target.value) || 0)}
                className="bg-black/40 border border-hw-blue/20 px-2 py-1 text-xs font-mono text-hw-blue outline-none focus:border-hw-blue w-20"
              />
            </div>
          )}

          {cipher === "vigenere" && (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-widest text-hw-blue/60">Key</label>
              <input 
                type="text" 
                value={vigenereKey} 
                onChange={(e) => setVigenereKey(e.target.value)}
                className="bg-black/40 border border-hw-blue/20 px-2 py-1 text-xs font-mono text-hw-blue outline-none focus:border-hw-blue w-32 uppercase"
              />
            </div>
          )}

          {cipher === "xor" && (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-widest text-hw-blue/60">Key (String)</label>
              <input 
                type="text" 
                value={xorKey} 
                onChange={(e) => setXorKey(e.target.value)}
                className="bg-black/40 border border-hw-blue/20 px-2 py-1 text-xs font-mono text-hw-blue outline-none focus:border-hw-blue w-32"
              />
            </div>
          )}

          {cipher === "railfence" && (
            <div className="flex flex-col gap-1">
              <label className="text-[10px] uppercase tracking-widest text-hw-blue/60">Rails</label>
              <input 
                type="number" 
                min="2"
                value={railFenceRails} 
                onChange={(e) => setRailFenceRails(parseInt(e.target.value) || 2)}
                className="bg-black/40 border border-hw-blue/20 px-2 py-1 text-xs font-mono text-hw-blue outline-none focus:border-hw-blue w-20"
              />
            </div>
          )}

          {cipher === "affine" && (
            <>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-widest text-hw-blue/60">A (Coprime to 26)</label>
                <input 
                  type="number" 
                  value={affineA} 
                  onChange={(e) => setAffineA(parseInt(e.target.value) || 0)}
                  className="bg-black/40 border border-hw-blue/20 px-2 py-1 text-xs font-mono text-hw-blue outline-none focus:border-hw-blue w-20"
                />
              </div>
              <div className="flex flex-col gap-1">
                <label className="text-[10px] uppercase tracking-widest text-hw-blue/60">B (Shift)</label>
                <input 
                  type="number" 
                  value={affineB} 
                  onChange={(e) => setAffineB(parseInt(e.target.value) || 0)}
                  className="bg-black/40 border border-hw-blue/20 px-2 py-1 text-xs font-mono text-hw-blue outline-none focus:border-hw-blue w-20"
                />
              </div>
            </>
          )}

          <button 
            onClick={processText}
            className="hw-button flex items-center gap-2 px-4 py-1 ml-auto"
          >
            {mode === "encode" ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
            {mode === "encode" ? "ENCODE" : "DECODE"}
          </button>
        </div>

        {/* I/O Areas */}
        <div className="flex flex-col lg:flex-row gap-4 flex-1 min-h-[300px]">
          <div className="flex-1 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] uppercase tracking-widest text-hw-blue/60">Input</label>
              <button onClick={() => setInput("")} className="text-hw-blue/40 hover:text-red-500">
                <Trash2 className="w-3 h-3" />
              </button>
            </div>
            <textarea
              value={input}
              onChange={(e) => setInput(e.target.value)}
              className="flex-1 bg-black/40 border border-hw-blue/20 p-3 text-xs font-mono text-hw-blue outline-none focus:border-hw-blue resize-none custom-scrollbar"
              placeholder="Enter text here..."
            />
          </div>

          <div className="flex items-center justify-center lg:flex-col">
            <ArrowRight className="w-6 h-6 text-hw-blue/40 hidden lg:block" />
            <ArrowDownToLine className="w-6 h-6 text-hw-blue/40 lg:hidden" />
          </div>

          <div className="flex-1 flex flex-col gap-2">
            <div className="flex justify-between items-center">
              <label className="text-[10px] uppercase tracking-widest text-hw-blue/60">Output</label>
              <button 
                onClick={() => {
                  navigator.clipboard.writeText(output);
                }} 
                className="text-[9px] uppercase tracking-widest text-hw-blue/40 hover:text-hw-blue"
              >
                COPY
              </button>
            </div>
            <textarea
              value={output}
              readOnly
              className="flex-1 bg-hw-blue/5 border border-hw-blue/20 p-3 text-xs font-mono text-hw-blue outline-none resize-none custom-scrollbar"
              placeholder="Result will appear here..."
            />
          </div>
        </div>

      </div>
    </div>
  );
};

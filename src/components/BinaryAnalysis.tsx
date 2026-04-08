import React, { useState } from "react";
import { Upload, FileCode, Layers, Type, Hash, Terminal } from "lucide-react";
import { parseIntelHex } from "../lib/intelHex";
import { open as parseElf } from "elfinfo";
import { cn } from "../lib/utils";

interface Section {
  name: string;
  type: string;
  address: number;
  size: number;
  offset: number;
  data?: Uint8Array;
}

interface SymbolInfo {
  name: string;
  type: string;
  value: number;
  size: number;
  section: string;
}

interface BinaryInfo {
  type: "hex" | "elf";
  size: number;
  sections: Section[];
  strings: string[];
  symbols: SymbolInfo[];
  rawData: Uint8Array;
}

export const BinaryAnalysis: React.FC = () => {
  const [binaryInfo, setBinaryInfo] = useState<BinaryInfo | null>(null);
  const [activeView, setActiveView] = useState<
    "sections" | "strings" | "hex" | "symbols" | "disassembly"
  >("sections");
  const [disassembly, setDisassembly] = useState<string | null>(null);
  const [isDisassembling, setIsDisassembling] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleFileUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setError(null);
    setDisassembly(null);
    try {
      if (file.name.endsWith(".hex")) {
        const text = await file.text();
        const rawData = parseIntelHex(text);

        // Extract strings (basic ASCII extraction)
        const strings: string[] = [];
        let currentString = "";
        for (let i = 0; i < rawData.length; i++) {
          const b = rawData[i];
          if (b >= 32 && b <= 126) {
            currentString += String.fromCharCode(b);
          } else {
            if (currentString.length >= 4) strings.push(currentString);
            currentString = "";
          }
        }
        if (currentString.length >= 4) strings.push(currentString);

        setBinaryInfo({
          type: "hex",
          size: rawData.length,
          sections: [
            {
              name: ".data",
              type: "PROGBITS",
              address: 0,
              size: rawData.length,
              offset: 0,
              data: rawData,
            },
          ],
          strings,
          symbols: [],
          rawData,
        });
      } else if (file.name.endsWith(".elf") || file.name.endsWith(".o")) {
        const buffer = await file.arrayBuffer();
        const result = await parseElf(buffer);

        if (!result.success || !result.elf) {
          throw new Error(result.errors?.join(", ") || "Failed to parse ELF");
        }

        const sections: Section[] = [];
        const strings: string[] = [];
        const symbols: SymbolInfo[] = [];

        for (const sec of result.elf.sections) {
          sections.push({
            name: sec.name,
            type: sec.typeDescription || sec.type.toString(),
            address: typeof sec.addr === "bigint" ? Number(sec.addr) : sec.addr,
            size: typeof sec.size === "bigint" ? Number(sec.size) : sec.size,
            offset:
              typeof sec.offset === "bigint" ? Number(sec.offset) : sec.offset,
          });

          if ("symbols" in sec && Array.isArray((sec as any).symbols)) {
            for (const sym of (sec as any).symbols) {
              if (sym.name) {
                symbols.push({
                  name: sym.name,
                  type: sym.typeDescription || sym.type.toString(),
                  value:
                    typeof sym.value === "bigint"
                      ? Number(sym.value)
                      : sym.value,
                  size:
                    typeof sym.size === "bigint" ? Number(sym.size) : sym.size,
                  section: sec.name,
                });
              }
            }
          }
        }

        // Extract strings from the entire buffer for simplicity
        const rawData = new Uint8Array(buffer);
        let currentString = "";
        for (let i = 0; i < rawData.length; i++) {
          const b = rawData[i];
          if (b >= 32 && b <= 126) {
            currentString += String.fromCharCode(b);
          } else {
            if (currentString.length >= 4) strings.push(currentString);
            currentString = "";
          }
        }
        if (currentString.length >= 4) strings.push(currentString);

        setBinaryInfo({
          type: "elf",
          size: rawData.length,
          sections,
          strings,
          symbols,
          rawData,
        });
      } else {
        setError("Unsupported file type. Please upload .hex or .elf");
      }
    } catch (err: any) {
      console.error(err);
      setError(`Failed to parse binary: ${err.message}`);
    }
  };

  const handleDisassemble = async () => {
    if (!binaryInfo || disassembly || isDisassembling) return;
    
    setIsDisassembling(true);
    try {
      const { default: loader } = await import('@binutils-wasm/binutils');
      const objdump = await loader('objdump');
      let out = '';
      let err = '';
      
      const args = binaryInfo.type === 'hex' 
        ? ['-D', '-m', 'avr', '-b', 'ihex', 'binary.file'] 
        : ['-d', 'binary.file'];
        
      await objdump({
        print: (text: string) => out += text + '\n',
        printErr: (text: string) => err += text + '\n',
        arguments: args,
        preRun: [(m: any) => {
          m.FS.writeFile('binary.file', binaryInfo.rawData);
        }]
      });
      
      setDisassembly(out || err || 'No disassembly output.');
    } catch (err: any) {
      console.error(err);
      setDisassembly(`Failed to disassemble: ${err.message}`);
    } finally {
      setIsDisassembling(false);
    }
  };

  const getEntropyColor = (b: number) => {
    if (b === 0x00) return "rgba(0, 0, 0, 0.8)";
    if (b === 0xff) return "rgba(255, 255, 255, 0.8)";
    if (b >= 32 && b <= 126) return "rgba(34, 197, 94, 0.8)";
    const hue = 240 - (b / 255) * 240;
    return `hsla(${hue}, 80%, 60%, 0.6)`;
  };

  const renderHexViewer = () => {
    if (!binaryInfo) return null;
    const data = binaryInfo.rawData;

    // Limit to first 16KB to prevent browser freezing
    const displayData = data.slice(0, 16384);

    const rows = [];
    for (let i = 0; i < displayData.length; i += 16) {
      const chunk = displayData.slice(i, i + 16);

      const hexParts = Array.from(chunk).map((b) =>
        b.toString(16).padStart(2, "0").toUpperCase(),
      );
      while (hexParts.length < 16) hexParts.push("  ");
      const hexStr = hexParts.join(" ");

      const asciiStr = Array.from(chunk)
        .map((b) => (b >= 32 && b <= 126 ? String.fromCharCode(b) : "."))
        .join("");
      const addrStr = `0x${i.toString(16).padStart(4, "0").toUpperCase()}`;

      rows.push(
        <div
          key={i}
          className="flex gap-8 hover:bg-hw-blue/10 px-2 py-0.5 w-max items-center"
        >
          <span className="text-hw-blue/50 w-16 shrink-0">{addrStr}</span>
          <span className="text-hw-blue tracking-widest whitespace-pre">
            {hexStr}
          </span>

          <div className="flex items-center gap-0.5 border-x border-hw-blue/20 px-4">
            {Array.from(chunk).map((b, idx) => (
              <div
                key={idx}
                className="w-2.5 h-3.5 rounded-[1px]"
                style={{ backgroundColor: getEntropyColor(b) }}
                title={`0x${b.toString(16).padStart(2, "0").toUpperCase()}`}
              />
            ))}
            {Array.from({ length: 16 - chunk.length }).map((_, idx) => (
              <div key={`pad-${idx}`} className="w-2.5 h-3.5" />
            ))}
          </div>

          <span className="text-hw-blue/90 tracking-widest">{asciiStr}</span>
        </div>,
      );
    }

    if (data.length > 16384) {
      rows.push(
        <div key="more" className="text-hw-blue/50 italic px-2 py-4">
          ... Showing first 16KB of {data.length} bytes ...
        </div>,
      );
    }

    return rows;
  };

  return (
    <div className="flex flex-col h-full gap-4">
      <div className="hw-panel p-4 shrink-0 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <FileCode className="w-5 h-5 text-hw-blue" />
          <div>
            <h3 className="text-[12px] font-bold uppercase tracking-widest text-hw-blue">
              Binary Analysis
            </h3>
            <p className="text-[9px] text-hw-blue/50 uppercase">
              Inspect AVR .hex and .elf files
            </p>
          </div>
        </div>

        <label className="hw-button px-4 py-2 flex items-center gap-2 cursor-pointer">
          <Upload className="w-4 h-4" />
          <span className="text-[10px]">UPLOAD BINARY</span>
          <input
            type="file"
            accept=".hex,.elf,.o"
            className="hidden"
            onChange={handleFileUpload}
          />
        </label>
      </div>

      {error && (
        <div className="bg-red-500/20 border border-red-500/50 text-red-500 p-3 text-[10px] uppercase">
          {error}
        </div>
      )}

      {binaryInfo ? (
        <div className="flex-1 flex flex-col min-h-0 gap-4">
          <div className="flex gap-4 border-b border-hw-blue/20 shrink-0 px-2">
            <button
              onClick={() => setActiveView("sections")}
              className={cn(
                "pb-2 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-colors flex items-center gap-2",
                activeView === "sections"
                  ? "border-hw-blue text-hw-blue"
                  : "border-transparent text-hw-blue/40 hover:text-hw-blue/80",
              )}
            >
              <Layers className="w-3 h-3" /> Sections
            </button>
            <button
              onClick={() => setActiveView("strings")}
              className={cn(
                "pb-2 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-colors flex items-center gap-2",
                activeView === "strings"
                  ? "border-hw-blue text-hw-blue"
                  : "border-transparent text-hw-blue/40 hover:text-hw-blue/80",
              )}
            >
              <Type className="w-3 h-3" /> Strings ({binaryInfo.strings.length})
            </button>
            <button
              onClick={() => setActiveView("symbols")}
              className={cn(
                "pb-2 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-colors flex items-center gap-2",
                activeView === "symbols"
                  ? "border-hw-blue text-hw-blue"
                  : "border-transparent text-hw-blue/40 hover:text-hw-blue/80",
              )}
            >
              <FileCode className="w-3 h-3" /> Symbols (
              {binaryInfo.symbols.length})
            </button>
            <button
              onClick={() => setActiveView("hex")}
              className={cn(
                "pb-2 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-colors flex items-center gap-2",
                activeView === "hex"
                  ? "border-hw-blue text-hw-blue"
                  : "border-transparent text-hw-blue/40 hover:text-hw-blue/80",
              )}
            >
              <Hash className="w-3 h-3" /> Hex Dump
            </button>
            <button
              onClick={() => { setActiveView("disassembly"); handleDisassemble(); }}
              className={cn(
                "pb-2 text-[10px] font-bold uppercase tracking-widest border-b-2 transition-colors flex items-center gap-2",
                activeView === "disassembly"
                  ? "border-hw-blue text-hw-blue"
                  : "border-transparent text-hw-blue/40 hover:text-hw-blue/80",
              )}
            >
              <Terminal className="w-3 h-3" /> Disassembly
            </button>
          </div>

          <div className="hw-panel p-0 flex-1 overflow-hidden flex flex-col">
            <div className="flex-1 bg-black/60 p-4 overflow-y-auto font-mono text-[11px] leading-relaxed text-hw-blue/80 custom-scrollbar">
              {activeView === "sections" && (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-hw-blue/50 border-b border-hw-blue/20">
                      <th className="pb-2 font-normal">Name</th>
                      <th className="pb-2 font-normal">Type</th>
                      <th className="pb-2 font-normal">Address</th>
                      <th className="pb-2 font-normal">Offset</th>
                      <th className="pb-2 font-normal">Size</th>
                    </tr>
                  </thead>
                  <tbody>
                    {binaryInfo.sections.map((sec, i) => (
                      <tr
                        key={i}
                        className="border-b border-hw-blue/10 hover:bg-hw-blue/5"
                      >
                        <td className="py-2 text-hw-blue font-bold">
                          {sec.name || "<unnamed>"}
                        </td>
                        <td className="py-2">{sec.type}</td>
                        <td className="py-2">
                          0x{sec.address.toString(16).padStart(8, "0")}
                        </td>
                        <td className="py-2">
                          0x{sec.offset.toString(16).padStart(8, "0")}
                        </td>
                        <td className="py-2">{sec.size} bytes</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}

              {activeView === "strings" && (
                <div className="flex flex-col gap-1">
                  {binaryInfo.strings.map((str, i) => (
                    <div
                      key={i}
                      className="hover:bg-hw-blue/10 px-2 py-0.5 rounded"
                    >
                      {str}
                    </div>
                  ))}
                </div>
              )}

              {activeView === "symbols" && (
                <table className="w-full text-left border-collapse">
                  <thead>
                    <tr className="text-hw-blue/50 border-b border-hw-blue/20">
                      <th className="pb-2 font-normal">Name</th>
                      <th className="pb-2 font-normal">Type</th>
                      <th className="pb-2 font-normal">Value</th>
                      <th className="pb-2 font-normal">Size</th>
                    </tr>
                  </thead>
                  <tbody>
                    {binaryInfo.symbols.map((sym, i) => (
                      <tr
                        key={i}
                        className="border-b border-hw-blue/10 hover:bg-hw-blue/5"
                      >
                        <td className="py-2 text-hw-blue font-bold">
                          {sym.name}
                        </td>
                        <td className="py-2">{sym.type}</td>
                        <td className="py-2">
                          0x{sym.value.toString(16).padStart(8, "0")}
                        </td>
                        <td className="py-2">{sym.size} bytes</td>
                      </tr>
                    ))}
                    {binaryInfo.symbols.length === 0 && (
                      <tr>
                        <td
                          colSpan={4}
                          className="py-4 text-center text-hw-blue/50 italic"
                        >
                          No symbols found in this binary.
                        </td>
                      </tr>
                    )}
                  </tbody>
                </table>
              )}

              {activeView === "hex" && renderHexViewer()}

              {activeView === "disassembly" && (
                <div className="flex flex-col h-full">
                  {isDisassembling ? (
                    <div className="flex items-center justify-center h-full text-hw-blue/50 animate-pulse">
                      Decompiling binary...
                    </div>
                  ) : (
                    <pre className="whitespace-pre-wrap break-all text-[11px] leading-relaxed text-hw-blue/80">
                      {disassembly}
                    </pre>
                  )}
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="flex-1 hw-panel flex items-center justify-center text-hw-blue/30 uppercase tracking-widest text-[10px]">
          Upload a binary file to begin analysis
        </div>
      )}
    </div>
  );
};

import React, { createContext, useContext, useState, useRef, ReactNode, useCallback, useEffect } from 'react';

export interface LogEntry {
  time: number;
  text: string;
}

interface SerialContextType {
  port: any;
  connected: boolean;
  baudRate: number;
  setBaudRate: (rate: number) => void;
  connect: () => Promise<any>;
  disconnect: () => Promise<void>;
  writeToSerial: (data: string) => Promise<void>;
  subscribe: (callback: (data: string) => void) => () => void;
  
  // Lifted State
  logs: LogEntry[];
  clearLogs: () => void;
}

const SerialContext = createContext<SerialContextType | null>(null);

export const useSerial = () => {
  const context = useContext(SerialContext);
  if (!context) throw new Error('useSerial must be used within SerialProvider');
  return context;
};

export const SerialProvider = ({ children }: { children: ReactNode }) => {
  const [port, setPort] = useState<any>(null);
  const [connected, setConnected] = useState(false);
  const [baudRate, setBaudRate] = useState(115200);
  
  const keepReadingRef = useRef(false);
  const readerRef = useRef<any>(null);
  const closedPromiseRef = useRef<Promise<void> | null>(null);
  const listenersRef = useRef<Set<(data: string) => void>>(new Set());

  // Lifted State
  const [logs, setLogs] = useState<LogEntry[]>([]);
  const serialBufferRef = useRef("");

  const clearLogs = useCallback(() => setLogs([]), []);

  const subscribe = useCallback((callback: (data: string) => void) => {
    listenersRef.current.add(callback);
    return () => {
      listenersRef.current.delete(callback);
    };
  }, []);

  const disconnect = useCallback(async () => {
    keepReadingRef.current = false;

    if (readerRef.current) {
      try {
        await readerRef.current.cancel();
      } catch (e) {
        console.error("Error canceling reader:", e);
      }
    }

    if (closedPromiseRef.current) {
      try {
        await closedPromiseRef.current;
      } catch (e) {
        console.error("Error waiting for stream to close:", e);
      }
    }

    if (port) {
      try {
        await port.close();
      } catch (e) {
        console.error("Error closing port:", e);
      }
    }

    setPort(null);
    setConnected(false);
  }, [port]);

  useEffect(() => {
    const handleShutdown = () => {
      if (connected) {
        disconnect();
      }
    };
    window.addEventListener('electron-os-shutdown', handleShutdown);
    return () => window.removeEventListener('electron-os-shutdown', handleShutdown);
  }, [connected, disconnect]);

  // Central parsing logic
  useEffect(() => {
    const handleSerialData = (value: string) => {
      serialBufferRef.current += value;
      const lines = serialBufferRef.current.split("\n");
      
      if (lines.length > 1) {
        const newLines = lines.slice(0, -1).map((l) => l.replace("\r", ""));
        const now = Date.now();
        
        const newLogEntries = newLines.map((text) => {
          window.dispatchEvent(new CustomEvent('hw_serial_line', { detail: text }));
          return { time: now, text };
        });
        
        setLogs((prev) => {
          const updated = [...prev, ...newLogEntries];
          return updated.slice(-1000);
        });
        
        serialBufferRef.current = lines[lines.length - 1];
      }
    };

    const unsubscribe = subscribe(handleSerialData);
    return unsubscribe;
  }, [subscribe]);

  const readLoop = async (currentPort: any) => {
    try {
      while (currentPort && currentPort.readable && keepReadingRef.current) {
        const textDecoder = new TextDecoderStream();
        closedPromiseRef.current = currentPort.readable.pipeTo(textDecoder.writable);
        readerRef.current = textDecoder.readable.getReader();

        try {
          while (true) {
            const { value, done } = await readerRef.current.read();
            if (done) break;
            if (value) {
              listenersRef.current.forEach(cb => cb(value));
            }
          }
        } catch (error) {
          console.error("Read error:", error);
          break;
        } finally {
          if (readerRef.current) {
            readerRef.current.releaseLock();
            readerRef.current = null;
          }
        }
      }
    } finally {
      if (keepReadingRef.current) {
        disconnect();
      }
    }
  };

  const connect = async () => {
    try {
      let currentPort = port;
      if (!currentPort) {
        currentPort = await (navigator as any).serial.requestPort();
        setPort(currentPort);
      }

      try {
        await currentPort.open({ baudRate });
      } catch (e: any) {
        if (!e.message.includes('already open')) {
          throw e;
        }
      }

      setConnected(true);
      keepReadingRef.current = true;
      readLoop(currentPort);
      return currentPort;
    } catch (err: any) {
      console.error("Connection failed:", err);
      throw err;
    }
  };

  const writeToSerial = async (data: string) => {
    if (!port || !port.writable) return;
    const encoder = new TextEncoder();
    const writer = port.writable.getWriter();
    try {
      await writer.write(encoder.encode(data));
    } catch (err) {
      console.error("Write error:", err);
    } finally {
      writer.releaseLock();
    }
  };

  return (
    <SerialContext.Provider value={{
      port, connected, baudRate, setBaudRate, connect, disconnect, writeToSerial, subscribe,
      logs, clearLogs
    }}>
      {children}
    </SerialContext.Provider>
  );
};

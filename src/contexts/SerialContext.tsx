import React, { createContext, useContext, useState, useRef, ReactNode, useCallback, useEffect } from 'react';

export interface LogEntry {
  time: number;
  text: string;
}

interface ConnectionState {
  id: string;
  name?: string;
  port: any;
  connected: boolean;
  baudRate: number;
  logs: LogEntry[];
  buffer: string;
  listeners: Set<(data: string) => void>;
  reader: any;
  closedPromise: Promise<void> | null;
  keepReading: boolean;
}

interface SerialContextType {
  connections: Record<string, ConnectionState>;
  connect: (id?: string) => Promise<any>;
  disconnect: (id?: string) => Promise<void>;
  writeToSerial: (data: string, id?: string) => Promise<void>;
  subscribe: (callback: (data: string) => void, id?: string) => () => void;
  setBaudRate: (rate: number, id?: string) => void;
  clearLogs: (id?: string) => void;
  renameConnection: (id: string, name: string) => void;
}

const SerialContext = createContext<SerialContextType | null>(null);

export const useSerial = (id: string = 'shared') => {
  const context = useContext(SerialContext);
  if (!context) throw new Error('useSerial must be used within SerialProvider');
  
  const conn = context.connections[id] || {
    id,
    name: '',
    port: null,
    connected: false,
    baudRate: 115200,
    logs: [],
    buffer: "",
    listeners: new Set(),
    reader: null,
    closedPromise: null,
    keepReading: false
  };

  return {
    ...conn,
    connect: () => context.connect(id),
    disconnect: () => context.disconnect(id),
    writeToSerial: (data: string) => context.writeToSerial(data, id),
    subscribe: (callback: (data: string) => void) => context.subscribe(callback, id),
    setBaudRate: (rate: number) => context.setBaudRate(rate, id),
    clearLogs: () => context.clearLogs(id),
    renameConnection: (name: string) => context.renameConnection(id, name),
    // For legacy support or cross-connection access
    allConnections: context.connections
  };
};

export const SerialProvider = ({ children }: { children: ReactNode }) => {
  const [connections, setConnections] = useState<Record<string, ConnectionState>>({
    'shared': {
      id: 'shared',
      port: null,
      connected: false,
      baudRate: 115200,
      logs: [],
      buffer: "",
      listeners: new Set(),
      reader: null,
      closedPromise: null,
      keepReading: false
    }
  });

  const connectionsRef = useRef(connections);
  useEffect(() => {
    connectionsRef.current = connections;
  }, [connections]);

  const disconnect = useCallback(async (id: string = 'shared') => {
    const conn = connectionsRef.current[id];
    if (!conn) return;

    conn.keepReading = false;

    if (conn.reader) {
      try {
        await conn.reader.cancel();
      } catch (e) {
        console.error(`Error canceling reader for ${id}:`, e);
      }
    }

    if (conn.closedPromise) {
      try {
        await conn.closedPromise;
      } catch (e) {
        console.error(`Error waiting for stream to close for ${id}:`, e);
      }
    }

    if (conn.port) {
      try {
        await conn.port.close();
      } catch (e) {
        console.error(`Error closing port for ${id}:`, e);
      }
    }

    setConnections(prev => ({
      ...prev,
      [id]: {
        ...prev[id],
        port: null,
        connected: false,
        keepReading: false,
        reader: null,
        closedPromise: null
      }
    }));
  }, []);

  const readLoop = async (id: string) => {
    let conn = connectionsRef.current[id];
    try {
      while (conn && conn.port && conn.port.readable && conn.keepReading) {
        const textDecoder = new TextDecoderStream();
        let closedPromise;
        try {
          closedPromise = conn.port.readable.pipeTo(textDecoder.writable);
        } catch (pipeError) {
          console.error(`PipeTo error on ${id}:`, pipeError);
          break; // Break the while loop if the stream cannot be piped
        }
        
        setConnections(prev => ({
          ...prev,
          [id]: { ...prev[id], closedPromise }
        }));
        
        const reader = textDecoder.readable.getReader();
        setConnections(prev => ({
          ...prev,
          [id]: { ...prev[id], reader }
        }));

        let loopBuffer = "";
        let pendingEntries: { time: number, text: string }[] = [];
        let rAF: number | null = null;

        const flushState = () => {
          if (pendingEntries.length === 0 && loopBuffer === "") return;
          const entriesToFlush = pendingEntries;
          pendingEntries = [];
          
          setConnections(prev => {
            const c = prev[id];
            if (!c) return prev;
            return {
              ...prev,
              [id]: {
                ...c,
                logs: [...c.logs, ...entriesToFlush].slice(-1500),
                buffer: loopBuffer
              }
            };
          });
          rAF = null;
        };

        try {
          while (true) {
            const { value, done } = await reader.read();
            if (done) break;
            if (value) {
              // Get current listeners from ref to avoid stale closures
              connectionsRef.current[id]?.listeners.forEach(cb => cb(value));
              
              loopBuffer += value;
              const lines = loopBuffer.split("\n");
              
              if (lines.length > 1) {
                const completeLines = lines.slice(0, -1).map(l => l.replace("\r", ""));
                loopBuffer = lines[lines.length - 1];
                const now = Date.now();
                
                const newEntries = completeLines.map(text => {
                  window.dispatchEvent(new CustomEvent('hw_serial_line', { 
                    detail: { text, connectionId: id } 
                  }));
                  return { time: now, text };
                });
                
                pendingEntries.push(...newEntries);
              }
              
              if (!rAF) {
                rAF = requestAnimationFrame(flushState);
              }
            }
          }
        } catch (error) {
          console.error(`Read error on ${id}:`, error);
          break;
        } finally {
          if (rAF) cancelAnimationFrame(rAF);
          flushState(); // one last flush
          reader.releaseLock();
          setConnections(prev => ({
            ...prev,
            [id]: { ...prev[id], reader: null }
          }));
        }
        
        // Refresh conn reference for loop check from ref
        conn = connectionsRef.current[id];
      }
    } finally {
      if (connectionsRef.current[id]?.keepReading) {
        disconnect(id);
      }
    }
  };

  const connect = async (id: string = 'shared') => {
    try {
      const serial = (window.navigator as any).serial;
      if (!serial) throw new Error("Web Serial API not supported");

      let conn = connectionsRef.current[id];
      if (!conn) {
        conn = {
          id,
          port: null,
          connected: false,
          baudRate: 115200,
          logs: [],
          buffer: "",
          listeners: new Set(),
          reader: null,
          closedPromise: null,
          keepReading: false
        };
      }

      let currentPort = conn.port;
      if (!currentPort) {
        currentPort = await serial.requestPort();
      }

      try {
        await currentPort.open({ baudRate: conn.baudRate, bufferSize: 8 * 1024 * 1024 });
      } catch (e: any) {
        if (!e.message.includes('already open')) throw e;
      }

      let autoName = conn.name;
      if (!autoName || autoName === '') {
        const info = currentPort.getInfo && typeof currentPort.getInfo === 'function' ? currentPort.getInfo() : {};
        const vid = info.usbVendorId;
        const pid = info.usbProductId;
        if (vid === 0x10c4 && pid === 0xea60) autoName = "CP210x UART Bridge";
        else if (vid === 0x1a86 && pid === 0x7523) autoName = "CH340 Serial";
        else if (vid === 0x0403 && pid === 0x6001) autoName = "FT232R USB UART";
        else if (vid === 0x303a) autoName = "ESP32 USB JTAG/serial";
        else if (vid === 0x2341) autoName = "Arduino Serial";
        else if (vid && pid) autoName = `USB Serial (${vid.toString(16)}:${pid.toString(16)})`;
        else autoName = `Serial Port_${id.split('-').pop()?.toUpperCase() || id.toUpperCase()}`;
      }

      const newConnState = {
        ...conn,
        port: currentPort,
        connected: true,
        keepReading: true,
        name: autoName
      };

      connectionsRef.current = {
        ...connectionsRef.current,
        [id]: newConnState
      };

      setConnections(prev => ({
        ...prev,
        [id]: newConnState
      }));

      // We need to trigger the loop after the state update
      setTimeout(() => readLoop(id), 10);
      
      return currentPort;
    } catch (err) {
      console.error(`Connection failed for ${id}:`, err);
      throw err;
    }
  };

  const writeToSerial = async (data: string, id: string = 'shared') => {
    const conn = connectionsRef.current[id];
    if (!conn || !conn.port || !conn.port.writable) return;
    const encoder = new TextEncoder();
    const writer = conn.port.writable.getWriter();
    try {
      await writer.write(encoder.encode(data));
      // Local echo
      setConnections(prev => {
        const c = prev[id];
        if (!c) return prev;
        const now = Date.now();
        const text = `> ${data.replace(/\r?\n$/, '')}`;
        return {
          ...prev,
          [id]: {
            ...c,
            logs: [...c.logs, { time: now, text }].slice(-1000)
          }
        };
      });
    } catch (err) {
      console.error(`Write error on ${id}:`, err);
    } finally {
      writer.releaseLock();
    }
  };

  const subscribe = useCallback((callback: (data: string) => void, id: string = 'shared') => {
    setConnections(prev => {
      const conn = prev[id] || {
        id,
        port: null,
        connected: false,
        baudRate: 115200,
        logs: [],
        buffer: "",
        listeners: new Set(),
        reader: null,
        closedPromise: null,
        keepReading: false
      };
      const newListeners = new Set(conn.listeners);
      newListeners.add(callback);
      return {
        ...prev,
        [id]: { ...conn, listeners: newListeners }
      };
    });

    return () => {
      setConnections(prev => {
        const conn = prev[id];
        if (!conn) return prev;
        const newListeners = new Set(conn.listeners);
        newListeners.delete(callback);
        return {
          ...prev,
          [id]: { ...conn, listeners: newListeners }
        };
      });
    };
  }, []);

  const setBaudRate = (rate: number, id: string = 'shared') => {
    setConnections(prev => ({
      ...prev,
      [id]: { ...prev[id], baudRate: rate }
    }));
  };

  const clearLogs = (id: string = 'shared') => {
    setConnections(prev => ({
      ...prev,
      [id]: { ...prev[id], logs: [] }
    }));
  };

  const renameConnection = (id: string, name: string) => {
    setConnections(prev => {
      const conn = prev[id];
      if (!conn) return prev;
      return {
        ...prev,
        [id]: { ...conn, name }
      };
    });
  };

  return (
    <SerialContext.Provider value={{
      connections, connect, disconnect, writeToSerial, subscribe, setBaudRate, clearLogs, renameConnection
    }}>
      {children}
    </SerialContext.Provider>
  );
};

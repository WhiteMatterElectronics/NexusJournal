import { contextBridge, ipcRenderer } from "electron";

contextBridge.exposeInMainWorld("electron", {
  shell: {
    start: (instanceId: string) => ipcRenderer.invoke("shell-start", instanceId),
    write: (instanceId: string, data: string) => ipcRenderer.send("shell-write", instanceId, data),
    resize: (instanceId: string, cols: number, rows: number) => ipcRenderer.send("shell-resize", instanceId, cols, rows),
    kill: (instanceId: string) => ipcRenderer.send("shell-kill", instanceId),
    onData: (instanceId: string, callback: (data: string) => void) => {
      const listener = (_event: any, data: string) => callback(data);
      ipcRenderer.on(`shell-data-${instanceId}`, listener);
      return () => ipcRenderer.removeListener(`shell-data-${instanceId}`, listener);
    },
  },
  closeApp: () => ipcRenderer.send("app-quit"),
  serial: {
    onShowPicker: (callback: (ports: any[]) => void) => {
      const listener = (_event: any, ports: any[]) => callback(ports);
      ipcRenderer.on("show-serial-picker", listener);
      return () => ipcRenderer.removeListener("show-serial-picker", listener);
    },
    selectPort: (portId: string) => ipcRenderer.send("serial-port-selected", portId),
  },
  fs: {
    readdir: (dirPath: string) => ipcRenderer.invoke("fs-readdir", dirPath),
    stat: (filePath: string) => ipcRenderer.invoke("fs-stat", filePath),
    readFile: (filePath: string, encoding?: string) => ipcRenderer.invoke("fs-readfile", filePath, encoding),
    writeFile: (filePath: string, data: string, encoding?: string) => ipcRenderer.invoke("fs-writefile", filePath, data, encoding),
    mkdir: (dirPath: string) => ipcRenderer.invoke("fs-mkdir", dirPath),
    rename: (oldPath: string, newPath: string) => ipcRenderer.invoke("fs-rename", oldPath, newPath),
    getHomeDir: () => ipcRenderer.invoke("fs-homedir"),
  },
});

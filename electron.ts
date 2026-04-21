import { app, BrowserWindow, ipcMain } from "electron";
import path from "path";
import { spawn, ChildProcess } from "child_process";
import * as pty from "node-pty";
import os from "os";
import fs from "fs/promises";

// Use app.isPackaged to reliably detect if we are in production
const isDev = !app.isPackaged;

let serverProcess: ChildProcess | null = null;
const ptyProcesses: Map<string, pty.IPty> = new Map();
let serialPickerResolver: ((portId: string) => void) | null = null;

function createWindow() {
  const win = new BrowserWindow({
    width: 1200,
    height: 800,
    fullscreen: true,
    frame: false,
    autoHideMenuBar: true,
    webPreferences: {
      preload: path.join(__dirname, "preload.js"),
      contextIsolation: true,
      nodeIntegration: false,
      devTools: false,
      webviewTag: true,
    },
  });

  // Remove menu bar completely
  win.setMenuBarVisibility(false);

  win.webContents.session.on('select-serial-port', (event, portList, webContents, callback) => {
    // Prevent default behavior (which does nothing and blocks)
    event.preventDefault();
    
    // Send ports to renderer
    win.webContents.send("show-serial-picker", portList);
    
    // Store callback to be called when user selects a port
    serialPickerResolver = (portId: string) => {
      callback(portId);
    };
  });

  win.webContents.session.setPermissionCheckHandler((webContents, permission, requestingOrigin, details) => {
    if (permission === 'serial') {
      return true;
    }
    return true;
  });

  win.webContents.session.setDevicePermissionHandler((details) => {
    if (details.deviceType === 'serial') {
      return true;
    }
    return true;
  });

  ipcMain.on("serial-port-selected", (event, portId) => {
    if (serialPickerResolver) {
      serialPickerResolver(portId);
      serialPickerResolver = null;
    }
  });

  ipcMain.on("app-quit", () => {
    app.quit();
  });

  // Handle Shell IPC
  ipcMain.handle("shell-start", (event, instanceId) => {
    const shell = os.platform() === "win32" ? "powershell.exe" : "bash";
    const ptyProcess = pty.spawn(shell, [], {
      name: "xterm-color",
      cols: 80,
      rows: 24,
      cwd: process.env.HOME,
      env: process.env as any,
    });

    ptyProcess.onData((data: string) => {
      win.webContents.send(`shell-data-${instanceId}`, data);
    });

    ptyProcesses.set(instanceId, ptyProcess);
    return true;
  });

  ipcMain.on("shell-write", (event, instanceId, data) => {
    const ptyProcess = ptyProcesses.get(instanceId);
    if (ptyProcess) {
      ptyProcess.write(data);
    }
  });

  ipcMain.on("shell-resize", (event, instanceId, cols, rows) => {
    const ptyProcess = ptyProcesses.get(instanceId);
    if (ptyProcess) {
      ptyProcess.resize(cols, rows);
    }
  });

  ipcMain.on("shell-kill", (event, instanceId) => {
    const ptyProcess = ptyProcesses.get(instanceId);
    if (ptyProcess) {
      ptyProcess.kill();
      ptyProcesses.delete(instanceId);
    }
  });

  // Handle Filesystem IPC
  ipcMain.handle("fs-readdir", async (event, dirPath) => {
    try {
      const files = await fs.readdir(dirPath, { withFileTypes: true });
      const results = await Promise.all(files.map(async file => {
        try {
          const filePath = path.join(dirPath, file.name);
          const stats = await fs.stat(filePath);
          return {
            name: file.name,
            isDirectory: file.isDirectory(),
            size: stats.size,
            mtimeMs: stats.mtimeMs
          };
        } catch (e) {
          return {
            name: file.name,
            isDirectory: file.isDirectory(),
            size: 0,
            mtimeMs: Date.now()
          };
        }
      }));
      return results;
    } catch (error) {
      console.error("fs-readdir error:", error);
      throw error;
    }
  });

  ipcMain.handle("fs-stat", async (event, filePath) => {
    try {
      const stats = await fs.stat(filePath);
      return {
        isDirectory: stats.isDirectory(),
        size: stats.size,
        mtimeMs: stats.mtimeMs,
      };
    } catch (error) {
      console.error("fs-stat error:", error);
      throw error;
    }
  });

  ipcMain.handle("fs-readfile", async (event, filePath, encoding = "utf-8") => {
    try {
      // Use raw read for binary-friendly base64 if requested
      if (encoding === "base64") {
        const data = await fs.readFile(filePath);
        return data.toString("base64");
      }
      const data = await fs.readFile(filePath, "utf-8");
      return data;
    } catch (error) {
      console.error("fs-readfile error:", error);
      throw error;
    }
  });

  ipcMain.handle("fs-writefile", async (event, filePath, data, encoding = "utf-8") => {
    try {
      if (encoding === "base64") {
        // Handle Data URL if present
        let buffer: Buffer;
        if (data.startsWith('data:')) {
          const base64Data = data.split(',')[1];
          buffer = Buffer.from(base64Data, 'base64');
        } else {
          buffer = Buffer.from(data, 'base64');
        }
        await fs.writeFile(filePath, buffer);
      } else {
        await fs.writeFile(filePath, data, "utf-8");
      }
      return true;
    } catch (error) {
      console.error("fs-writefile error:", error);
      throw error;
    }
  });

  ipcMain.handle("fs-mkdir", async (event, dirPath) => {
    try {
      await fs.mkdir(dirPath, { recursive: true });
      return true;
    } catch (error) {
      console.error("fs-mkdir error:", error);
      throw error;
    }
  });

  ipcMain.handle("fs-rename", async (event, oldPath, newPath) => {
    try {
      await fs.rename(oldPath, newPath);
      return true;
    } catch (error) {
      console.error("fs-rename error:", error);
      throw error;
    }
  });

  ipcMain.handle("fs-homedir", async () => {
    return os.homedir();
  });

  if (isDev) {
    win.loadURL("http://localhost:5173");
    // DevTools auto-open disabled per user request
    // win.webContents.openDevTools();
  } else {
    // In production, load the built index.html
    const filePath = path.join(__dirname, "../renderer/index.html");
    win.loadFile(filePath).catch((err) => {
      console.error("Failed to load index.html:", err);
    });
  }
}

function startServer(callback: () => void) {
  console.log("Starting server process...");
  
  // Use path.join to ensure correct path to server.js
  const serverPath = path.join(__dirname, "server.js");
  
  serverProcess = spawn("node", [serverPath], {
    stdio: "pipe",
    env: { ...process.env, NODE_ENV: "production" },
  });

  // Timeout to ensure we don't hang forever if server fails
  const serverTimeout = setTimeout(() => {
    console.warn("Server startup timed out, creating window anyway...");
    callback();
  }, 5000);

  serverProcess.stdout?.on("data", (data) => {
    const output = data.toString();
    console.log(`server: ${output}`);
    if (output.includes("Server running on")) {
      clearTimeout(serverTimeout);
      callback();
    }
  });

  serverProcess.stderr?.on("data", (data) => {
    console.error(`server error: ${data}`);
  });

  serverProcess.on("error", (err) => {
    console.error("Failed to start server process:", err);
    clearTimeout(serverTimeout);
    callback();
  });
}

app.whenReady().then(() => {
  if (!isDev) {
    startServer(() => {
      createWindow();
    });
  } else {
    createWindow();
  }

  app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createWindow();
    }
  });
});

app.on("window-all-closed", () => {
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("will-quit", () => {
  if (serverProcess) {
    serverProcess.kill();
  }
});

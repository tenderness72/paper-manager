const { app, BrowserWindow } = require("electron");
const path = require("path");
const { spawn } = require("child_process");
const fp = require("find-free-port");

const isDev = !app.isPackaged;
let mainWindow;
let serverProcess;

function createWindow(port) {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        webPreferences: {
            nodeIntegration: false,
            contextIsolation: true,
            preload: path.join(__dirname, "preload.js"), // Optional, if needed
        },
        autoHideMenuBar: true,
    });

    const url = `http://localhost:${port}`;
    console.log(`Loading URL: ${url}`);
    mainWindow.loadURL(url);

    if (isDev) {
        mainWindow.webContents.openDevTools();
    }

    mainWindow.on("closed", () => {
        mainWindow = null;
    });
}

async function startServer() {
    const [port] = await fp(3000);

    if (isDev) {
        // In development, assume the user is running `next dev` separately or via concurrently
        // Wait a bit or check if port is open? For concurrently, 3000 is usually the target.
        // Actually, let's just use 3000 for dev.
        createWindow(3000);
    } else {
        // In production, spawn the standalone server
        const serverPath = path.join(
            process.resourcesPath,
            "standalone",
            "server.js"
        );

        // Set DATABASE_URL to a user data directory
        const userDataPath = app.getPath("userData");
        const dbPath = path.join(userDataPath, "paper-manager.db");
        const databaseUrl = `file:${dbPath}`;

        console.log(`Starting server at ${serverPath} on port ${port}`);
        console.log(`Database URL: ${databaseUrl}`);

        serverProcess = spawn("node", [serverPath], {
            env: {
                ...process.env,
                PORT: port,
                HOSTNAME: "localhost",
                DATABASE_URL: databaseUrl,
                NODE_ENV: "production",
            },
            cwd: path.join(process.resourcesPath, "standalone"), // Important for finding .next/
        });

        serverProcess.stdout.on("data", (data) => {
            console.log(`Server stdout: ${data}`);
        });

        serverProcess.stderr.on("data", (data) => {
            console.error(`Server stderr: ${data}`);
        });

        // Wait slightly for server to verify start? Or just create window and let it retry connection
        // Let's create window after a short delay
        setTimeout(() => createWindow(port), 1000);
    }
}

app.whenReady().then(startServer);

app.on("window-all-closed", () => {
    if (process.platform !== "darwin") {
        app.quit();
    }
});

app.on("activate", () => {
    if (BrowserWindow.getAllWindows().length === 0) {
        startServer();
    }
});

app.on("will-quit", () => {
    if (serverProcess) {
        serverProcess.kill();
    }
});

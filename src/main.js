// Modules to control application life and create native browser window
const { app, BrowserWindow, ipcMain } = require("electron");
const path = require("path");
const url = require("url");
const fs = require("fs");
const { google } = require("googleapis");

const SCOPES = ["https://www.googleapis.com/auth/gmail.readonly"];
const CONTACTS_PATH = "contacts.json";
const TOKEN_PATH = "token.json";
const SETTINGS_PATH = "settings.json";
const MESSAGES_PATH = "messages.json";

const INITIAL_SETTINGS = {
  nextPageToken: null,
  historyId: null
};

const {
  installed: { client_secret, client_id, redirect_uris }
} = JSON.parse(fs.readFileSync(process.env.GOOGLE_APPLICATION_CREDENTIALS));

const oAuth2Client = new google.auth.OAuth2(
  client_id,
  client_secret,
  redirect_uris[0]
);
const gmail = google.gmail({ version: "v1", auth: oAuth2Client });

const settings = fs.existsSync(SETTINGS_PATH)
  ? JSON.parse(fs.readFileSync(SETTINGS_PATH))
  : INITIAL_SETTINGS;
let contacts = fs.existsSync(CONTACTS_PATH)
  ? JSON.parse(fs.readFileSync(CONTACTS_PATH))
  : [];
let messages = [];

const Pechkin = (function() {
  return {
    init: function(cb) {
      fs.readFile(TOKEN_PATH, (err, token) => {
        if (err) return this.getNewToken(cb);
        oAuth2Client.setCredentials(JSON.parse(token));
        cb();
      });
    },
    getNewToken: function(cb) {
      const authUrl = oAuth2Client.generateAuthUrl({
        access_type: "offline",
        scope: SCOPES
      });

      cb(authUrl);
    },
    setToken: function(code) {
      oAuth2Client.getToken(code, (err, token) => {
        if (err) return console.error("Error retrieving access token", err);
        oAuth2Client.setCredentials(token);
        // Store the token to disk for later program executions
        fs.writeFile(TOKEN_PATH, JSON.stringify(token), err => {
          if (err) return console.error(err);
          console.log("Token stored to", TOKEN_PATH);
        });
      });
    },
    listMessages: function(pageToken, cb) {
      gmail.users.messages.list(
        {
          userId: "me",
          pageToken
        },
        (err, { data: { nextPageToken, messages } }) => {
          cb(nextPageToken, messages);
        }
      );
    },
    getMessage: function(id, cb) {
      gmail.users.messages.get(
        {
          userId: "me",
          id
        },
        (err, { data }) => {
          if (err) return console.log("The API returned an error: " + err);
          if (data.payload.parts) {
            console.log(data.payload.parts.map(({ headers }) => headers));
          }
          cb(data);
        }
      );
    }
  };
})();

ipcMain.on("signin", ({ sender }) => {
  Pechkin.init(authUrl => {
    if (authUrl) {
      sender.send("signin-failed", authUrl);
    } else {
      sender.send("signin-success");
    }
  });
});

ipcMain.on("set-token", ({ sender }, token) => {
  Pechkin.setToken(token);
});

ipcMain.on("get-messages", ({ sender }) => {
  Pechkin.listMessages(settings.nextPageToken, (nextPageToken, ids) => {
    ids.forEach(({ id }) => {
      Pechkin.getMessage(
        id,
        ({ id, snippet, internalDate, payload: { headers } }) => {
          const from = headers.find(({ name }) => name === "From").value;
          const message = { id, snippet, internalDate, from };

          if (!contacts.includes(from)) {
            contacts = [...contacts, from];
          }

          if (!messages.includes())
            messages = [...messages, message].sort(
              ({ internalDate: a }, { internalDate: b }) => b - a
            );

          sender.send("get-messages-success", messages);
        }
      );
    });
  });
});

// Keep a global reference of the window object, if you don't, the window will
// be closed automatically when the JavaScript object is garbage collected.

let mainWindow;

function createWindow() {
  // Create the browser window.
  mainWindow = new BrowserWindow({ width: 800, height: 600 });

  const startUrl =
    process.env.ELECTRON_START_URL ||
    url.format({
      pathname: path.join(__dirname, "/../build/index.html"),
      protocol: "file:",
      slashes: true
    });
  mainWindow.loadURL(startUrl);

  // Open the DevTools.
  // mainWindow.webContents.openDevTools()

  // Emitted when the window is closed.
  mainWindow.on("closed", function() {
    // Dereference the window object, usually you would store windows
    // in an array if your app supports multi windows, this is the time
    // when you should delete the corresponding element.
    mainWindow = null;
  });
}

// This method will be called when Electron has finished
// initialization and is ready to create browser windows.
// Some APIs can only be used after this event occurs.
app.on("ready", createWindow);

// Quit when all windows are closed.
app.on("window-all-closed", function() {
  // On OS X it is common for applications and their menu bar
  // to stay active until the user quits explicitly with Cmd + Q
  if (process.platform !== "darwin") {
    app.quit();
  }
});

app.on("activate", function() {
  // On OS X it's common to re-create a window in the app when the
  // dock icon is clicked and there are no other windows open.
  if (mainWindow === null) {
    createWindow();
  }
});

// In this file you can include the rest of your app's specific main process
// code. You can also put them in separate files and require them here.

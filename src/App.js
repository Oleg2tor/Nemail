import React, { Component, Fragment } from "react";

import Nemail from './Nemail';

import "./App.css";

const electron = window.require("electron");
// eslint-disable-next-line no-unused-vars
const fs = electron.remote.require("fs");
const ipcRenderer = electron.ipcRenderer;

const RESPONSE = "response";
const RESPONSE_DELIMITER = "=";
const ERROR = "error";
const CODE = "code";

class App extends Component {
  constructor(props) {
    super(props);

    this.myRef = React.createRef();
  }

  componentWillMount() {
    ipcRenderer.send("signin");

    ipcRenderer.on("signin-failed", (event, authUrl) => {
      this.setState({ authUrl });
    });

    ipcRenderer.on("signin-success", () => {
      this.setState({ code: true });
    });
  }

  componentDidMount() {
    const webview = document.querySelector("webview");
    webview.addEventListener("did-navigate-in-page", ({ url }) => {
      const response = new URL(url).searchParams.get(RESPONSE);

      if (response) {
        const [type, code] = response.split(RESPONSE_DELIMITER);

        if (type === ERROR) {
          this.setState({
            authUrl: this.state.authUrl
          });
        } else if (type === CODE) {
          ipcRenderer.send("set-token", code);

          this.setState({
            code,
            authUrl: null
          });
        }
      }
    });
  }

  state = { authUrl: null, code: null };

  render() {
    return (
      <Fragment>
        {!this.state.code ? (
          <webview ref={this.myRef} id="auth" src={this.state.authUrl} />
        ) : (
          <Nemail ipcRenderer={ipcRenderer} />
        )}
      </Fragment>
    );
  }
}

export default App;

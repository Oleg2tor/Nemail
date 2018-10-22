import React, { Component } from "react";

import "./Nemail.css";

export class Nemail extends Component {
  componentWillMount() {
    this.props.ipcRenderer.send("get-messages");

    this.props.ipcRenderer.on("get-messages-success", (event, messages) => {
      const contacts = messages
        .map(({ from }) => from)
        .filter((value, index, self) => self.indexOf(value) === index);
      this.setState({ messages, contacts });
    });
  }

  state = { messages: [], contacts: [], contact: null };

  handleClick = contact => () => {
    this.setState({ contact });
  };

  render() {
    const { contacts } = this.state;

    return (
      <div className="container-fluid">
        <div className="row flex-xl-nowrap">
          <div className="col-md-4 p-0 sidebar">
            <ul className="list-group">
              {contacts.map(contact => {
                const messages = this.state.messages.filter(
                  ({ from, seen }) => from === contact
                );

                return (
                  <li
                    key={contact}
                    onClick={this.handleClick(contact)}
                    className="list-group-item d-flex justify-content-between align-items-center rounded-0 border-left-0 contact"
                  >
                    <div>
                      <b>{contact}</b>
                      <br />
                      <small>
                        {messages.length && messages[0].internalDate}
                      </small>
                    </div>
                    <span className="badge badge-primary badge-pill">
                      {messages.filter(({ seen }) => !seen).length}
                    </span>
                  </li>
                );
              })}
            </ul>
          </div>
          <div className="col-md-8">
            {this.state.messages
              .filter(({ from }) => from === this.state.contact)
              .map(({ id, snippet }) => (
                <div key={id} class="card mb-2">
                  <div class="card-header">
                    {id}
                  </div>
                  <div class="card-body">{snippet}</div>
                </div>
              ))}
          </div>
        </div>
      </div>
    );
  }
}

export default Nemail;

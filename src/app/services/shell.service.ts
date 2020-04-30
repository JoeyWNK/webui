import { Injectable, EventEmitter, Output, Input } from '@angular/core';
import { Router } from '@angular/router';
import { UUID } from 'angular2-uuid';
import { LocalStorage } from 'ngx-webstorage';
import { Observable, Subject, Subscription } from 'rxjs/Rx';
import { environment } from '../../environments/environment';

@Injectable()
export class ShellService {

  onCloseSubject: Subject < any > ;
  onOpenSubject: Subject < any > ;
  pendingCalls: any;
  pendingMessages: any[] = [];
  socket: WebSocket;
  connected = false;
  loggedIn = false;
  @LocalStorage() username;
  @LocalStorage() password;
  redirectUrl = '';
  public token: string;
  public jailId: string;

  //input and output and eventEmmitter
  private shellCmdOutput: any;
  @Output() shellOutput = new EventEmitter < any > ();
  @Output() shellConnected = new EventEmitter < any > ();

  public subscriptions: Map < string, Array < any >> = new Map < string, Array < any >> ();

  constructor(private _router: Router) {
    this.onOpenSubject = new Subject();
    this.onCloseSubject = new Subject();
    this.pendingCalls = new Map();
  }

  connect() {
    this.socket = new WebSocket(
      (window.location.protocol === 'https:' ? 'wss://' : 'ws://') +
      environment.remote + '/websocket/shell/');
    this.socket.onmessage = this.onmessage.bind(this);
    this.socket.onopen = this.onopen.bind(this);
    this.socket.onclose = this.onclose.bind(this);
  }

  onopen(event) {
    this.onOpenSubject.next(true);
    if (this.jailId) {
      this.send(JSON.stringify({ "token": this.token, "jail": this.jailId }));
    } else {
      this.send(JSON.stringify({ "token": this.token }));
    }
  }

  onconnect() {
    while (this.pendingMessages.length > 0) {
      const payload = this.pendingMessages.pop();
      this.send(payload);
    }
  }

  //empty eventListener for attach socket
  addEventListener() {}

  onclose(event) {
    this.connected = false;
    this.onCloseSubject.next(true);
    this.shellConnected.emit(this.connected);
  }


  onmessage(msg) {
    let data: any;

    try {
      data = JSON.parse(msg.data);
    } catch (e) {
      data = { 'msg': 'please discard this' };
    }

    if (data.msg === "connected") {
      this.connected = true;
      this.onconnect();
      this.shellConnected.emit(this.connected);
      return;
    }

    if (!this.connected) {
      return;
    }
    if (data.msg === "ping") {} else {
      this.shellCmdOutput = msg.data;
      this.shellOutput.emit(this.shellCmdOutput);
    }
  }

  send(payload) {
    if (this.socket.readyState === WebSocket.OPEN) {
      this.socket.send(payload);
    } else {
      this.pendingMessages.push(payload);
    }
  }

  subscribe(name): Observable < any > {
    const source = Observable.create((observer) => {
      if (this.subscriptions.has(name)) {
        this.subscriptions.get(name).push(observer);
      } else {
        this.subscriptions.set(name, [observer]);
      }
    });
    return source;
  }

  unsubscribe(observer) {
    // FIXME: just does not have a good performance :)
    this.subscriptions.forEach((v, k) => {
      v.forEach((item) => {
        if (item === observer) {
          v.splice(v.indexOf(item), 1);
        }
      });
    });
  }

}


import { Terminal, IDisposable, ITerminalAddon } from 'xterm';

interface IAttachOptions {
  bidirectional?: boolean;
}

export class AttachAddon implements ITerminalAddon {
  private _socket: WebSocket;
  private _bidirectional: boolean;
  private _disposables: IDisposable[] = [];

  constructor(socket: WebSocket, options?: IAttachOptions) {
    this._socket = socket;
    // always set binary type to arraybuffer, we do not handle blobs
    this._socket.binaryType = 'arraybuffer';
    this._bidirectional = (options && options.bidirectional === false) ? false : true;
  }

  public activate(terminal: Terminal): void {
    this._disposables.push(
      addSocketListener(this._socket, 'message', ev => {
        let msg: any
        const data: ArrayBuffer | string = ev.data;
        try {
          msg = JSON.parse(<string>data);
          if (msg.msg === "connected") {
            return;
          }
        } catch (e) {
          
        }
        terminal.write(typeof data === 'object' ? new Uint8Array(data) : data);
      })
    );

    if (this._bidirectional) {
      this._disposables.push(terminal.onData(data => this._sendData(data)));
      this._disposables.push(terminal.onBinary(data => this._sendBinary(data)));
    }

    this._disposables.push(addSocketListener(this._socket, 'close', () => this.dispose()));
    this._disposables.push(addSocketListener(this._socket, 'error', () => this.dispose()));
  }

  public dispose(): void {
    this._disposables.forEach(d => d.dispose());
  }

  private _sendData(data: string): void {
    // TODO: do something better than just swallowing
    // the data if the socket is not in a working condition
    if (this._socket.readyState !== 1) {
      return;
    }
    this._socket.send(data);
  }

  private _sendBinary(data: string): void {
    if (this._socket.readyState !== 1) {
      return;
    }
    const buffer = new Uint8Array(data.length);
    for (let i = 0; i < data.length; ++i) {
      buffer[i] = data.charCodeAt(i) & 255;
    }
    this._socket.send(buffer);
  }
}

function addSocketListener<K extends keyof WebSocketEventMap>(socket: WebSocket, type: K, handler: (this: WebSocket, ev: WebSocketEventMap[K]) => any): IDisposable {
  socket.addEventListener(type, handler);
  return {
    dispose: () => {
      if (!handler) {
        // Already disposed
        return;
      }
      socket.removeEventListener(type, handler);
    }
  };
}
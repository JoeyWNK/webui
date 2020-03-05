import { Component, ElementRef, Input, OnChanges, OnDestroy, OnInit, SimpleChange, ViewChild } from "@angular/core";
import { TranslateService } from "@ngx-translate/core";
import { MatDialog } from '@angular/material';
import { ShellService, WebSocketService, AttachAddon } from "../../services/";
import helptext from "./../../helptext/shell/shell";
import { CopyPasteMessageComponent } from "./copy-paste-message.component";
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
@Component({
  selector: 'app-shell',
  templateUrl: './shell.component.html',
  styleUrls: ['./shell.component.css'],
  providers: [ShellService],
})
export class ShellComponent implements OnInit, OnChanges, OnDestroy {
  // sets the shell prompt
  @Input() prompt = '';
  //xter container
  @ViewChild('terminal', { static: true}) container: ElementRef;
  // xterm variables
  cols: string;
  rows: string;
  font_size = 14;
  public token: any;
  public xterm: Terminal;
  private fitAddon: FitAddon = new FitAddon();
  public resize_terminal = true;

  public usage_tooltip = helptext.usage_tooltip;

  clearLine = "\u001b[2K\r"
  public shellConnected: boolean = false;

  ngOnInit() {
    this.xterm = new Terminal();
    this.xterm.open(this.container.nativeElement);
    this.xterm.loadAddon(this.fitAddon);
    this.onResize(null);
    this.getAuthToken().subscribe((res) => {
      this.initializeWebShell(res);
      this.initializeTerminal();
    });
  }

  ngOnDestroy() {
    if (this.ss.connected){
      this.ss.socket.close();
    }
  }
  
  onResize(event){
    let dims = this.fitAddon.proposeDimensions();
    if (isNaN(dims.rows) || dims.rows == Infinity || isNaN(dims.cols) || dims.cols == Infinity) {
      console.debug(`Remove an bug where dimensions of the detached terminal element aren't set`)
      this.xterm.resize(10, 10);
    } else {
      this.fitAddon.fit();
    }
    this.informTerminalChange();
  }

  resetDefault() {
    this.font_size = 14;
  }

  ngOnChanges(changes: {
    [propKey: string]: SimpleChange
  }) {
    const log: string[] = [];
    for (const propName in changes) {
      const changedProp = changes[propName];
      // reprint prompt
      if (propName === 'prompt' && this.xterm != null) {
        this.xterm.write(this.clearLine + this.prompt)
      }
    }
  }

  onRightClick(): false {
    this.dialog.open(CopyPasteMessageComponent);
    return false;
  }

  initializeTerminal() {
    const attachAddon = new AttachAddon(this.ss.socket);
    this.xterm.loadAddon(attachAddon);
    this.fitAddon.fit();
    //this.informTerminalChange();
  }

  initializeWebShell(res: string) {
    this.ss.token = res;
    this.ss.connect();

    this.ss.shellConnected.subscribe((res)=> {
      this.shellConnected = res;
    })
  }

  getAuthToken() {
    return this.ws.call('auth.generate_token');
  }

  informTerminalChange(){
    let dims = this.fitAddon.proposeDimensions();
    if (isNaN(dims.rows) || dims.rows == Infinity || isNaN(dims.cols) || dims.cols == Infinity) {

    } else if (this.ss.connected){
       this.ss.send(`\u001b[2J`);
    }
   
  }

  reconnect() {
    this.ss.connect();
  }

  constructor(private ws: WebSocketService, public ss: ShellService, public translate: TranslateService, private dialog: MatDialog) {
  }
}

import { Component, ElementRef, OnDestroy, OnInit, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material';
import { ShellService, WebSocketService, AttachAddon } from '../../services/';
import { CopyPasteMessageComponent } from '../shell/copy-paste-message.component';
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';

@Component({
  selector: 'app-system-processes',
  templateUrl: './system-processes.component.html',
  providers: [ShellService],
})

export class SystemProcessesComponent implements OnInit, OnDestroy {

  //xter container
  @ViewChild('terminal', { static: true}) container: ElementRef;

  // xterm variables
  public token: any;
  public xterm: Terminal;
  private fitAddon: FitAddon = new FitAddon();
  private top_displayed = false;

  clearLine = "\u001b[2K\r"

  ngOnInit() {
    this.xterm = new Terminal();
    this.xterm.open(this.container.nativeElement);
    this.xterm.loadAddon(this.fitAddon);
    this.onResize(null);
    this.getAuthToken().subscribe((res) => {
      this.initializeWebShell(res);
      this.initializeTerminal();
      this.ss.send('resizewin && top\n');
      setTimeout(function() {
        this.xterm.setOption('disableStdin', true);
      },100);
      
    });
  }

  ngOnDestroy() {
    if (this.ss.connected){
      this.ss.socket.close();
    }
  };

  onResize(event) {
    let dims = this.fitAddon.proposeDimensions();
    if (isNaN(dims.rows) || dims.rows == Infinity || isNaN(dims.cols) || dims.cols == Infinity) {
      console.debug(`Remove an bug where dimensions of the detached terminal element aren't set`)
      this.xterm.resize(10, 10);
    } else {
      this.fitAddon.fit();
    }
  }

  initializeTerminal() {
    const attachAddon = new AttachAddon(this.ss.socket);
    this.xterm.loadAddon(attachAddon);
    this.fitAddon.fit();
  }

  resizeTerm(){
    const domHeight = document.body.offsetHeight;
    const domWidth = document.body.offsetWidth;
    let colNum = (domWidth * 0.75 - 104) / 10;
    if (colNum < 80) {
      colNum = 80;
    }
    let rowNum = (domHeight * 0.75 - 104) / 21;
    if (rowNum < 10) {
      rowNum = 25;
    }

    this.xterm.resize(parseInt(colNum.toFixed(),10),parseInt(rowNum.toFixed(),10));
    return true;
  }

  initializeWebShell(res: string) {
    this.ss.token = res;
    this.ss.connect();
  }

  getAuthToken() {
    return this.ws.call('auth.generate_token');
  }

  onShellRightClick(): false {
    this.dialog.open(CopyPasteMessageComponent);
    return false;
  }

  constructor(private ws: WebSocketService, public ss: ShellService, private dialog: MatDialog) {
  }
}

import { Component, ElementRef, Input, OnChanges, OnDestroy, OnInit, SimpleChange, ViewChild } from '@angular/core';
import { MatDialog } from '@angular/material';
import { ActivatedRoute, Router } from '@angular/router';
import { TranslateService } from '@ngx-translate/core';
import { CopyPasteMessageComponent } from 'app/pages/shell/copy-paste-message.component';
import * as _ from 'lodash';
import { ShellService, WebSocketService, AttachAddon } from '../../../services/';
import helptext from "./../../../helptext/shell/shell";
import { Terminal } from 'xterm';
import { FitAddon } from 'xterm-addon-fit';
@Component({
  selector: 'app-jail-shell',
  templateUrl: './jail-shell.component.html',
  styleUrls: ['./jail-shell.component.css'],
  providers: [ShellService],
})

export class JailShellComponent implements OnInit, OnChanges, OnDestroy {
  // sets the shell prompt
  @Input() prompt = '';
  //xter container
  @ViewChild('terminal', { static: true }) container: ElementRef;
  // xterm variables
  cols: string;
  rows: string;
  font_size: number;
  public jailTitle: string
  public token: any;
  public xterm: Terminal;
  private shellSubscription: any;
  private fitAddon: FitAddon = new FitAddon();
  public shell_tooltip = helptext.usage_tooltip;
  public shellConnected: boolean = false;
  clearLine = "\u001b[2K\r"
  protected pk: string;
  protected route_success: string[] = ['jails'];
  constructor(private ws: WebSocketService,
    public ss: ShellService,
    protected aroute: ActivatedRoute,
    public translate: TranslateService,
    protected router: Router,
    private dialog: MatDialog) {
  }

  ngOnInit() {
    this.aroute.params.subscribe(params => {
      this.pk = params['pk'];
      this.jailTitle = this.pk;
      this.getAuthToken().subscribe((res) => {
        this.shellSubscription = this.ss.shellOutput.subscribe((value) => {
          if (value !== undefined) {

            if (_.trim(value) == "logout") {
              this.router.navigate(new Array('/').concat(this.route_success));
            }
          }
        });
        this.xterm = new Terminal();
        this.xterm.open(this.container.nativeElement);
        this.xterm.loadAddon(this.fitAddon);
        this.onResize(null);
        this.getAuthToken().subscribe((res) => {
          this.initializeWebShell(res);
          this.initializeTerminal();
        });
      });
    });

  }

  ngOnDestroy() {
    if (this.shellSubscription) {
      this.shellSubscription.unsubscribe();
    }
    if (this.ss.connected) {
      this.ss.socket.close();
    }
  };

  onResize(event) {
    this.resizeTerm();
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

  initializeTerminal() {
    const attachAddon = new AttachAddon(this.ss.socket);
    this.xterm.loadAddon(attachAddon);
    this.fitAddon.fit();
  }

  resizeTerm() {
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
    this.xterm.resize(parseInt(colNum.toFixed(), 10), parseInt(rowNum.toFixed(), 10));
    return true;
  }

  initializeWebShell(res: string) {
    this.ss.token = res;
    this.ss.jailId = this.pk;
    this.ss.connect();
    this.ss.shellConnected.subscribe((res) => {
      this.shellConnected = res;
    })
  }

  getAuthToken() {
    return this.ws.call('auth.generate_token');
  }

  onShellRightClick(): false {
    this.dialog.open(CopyPasteMessageComponent);
    return false;
  }
}

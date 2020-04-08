import { MatDialog, MatDialogRef} from '@angular/material';
import { Component, OnInit } from '@angular/core';
import * as _ from 'lodash';
import { TranslateService } from '@ngx-translate/core';
import globalHelptext from '../../../../helptext/global-helptext';

import {
  RestService,
  SystemGeneralService,
  WebSocketService
} from '../../../../services/';

@Component({
  selector: 'about-dialog',
  styleUrls: ['./about-dialog.component.css'],
  templateUrl: './about-dialog.component.html',
  providers: [SystemGeneralService]
})
export class AboutModalDialogComponent implements OnInit{
  public copyrightYear = globalHelptext.copyright_year;
  public info: any = {};
  public is_freenas: false;

  constructor(
    public dialogRef: MatDialogRef<AboutModalDialogComponent>,
    private ws: WebSocketService,
    protected translate: TranslateService,
    protected systemGeneralService: SystemGeneralService) { 
      this.ws.call('system.is_freenas').subscribe((res)=>{
        this.is_freenas = res;
      });
    }

  ngOnInit() {
    this.ws.call('system.info').subscribe((res) => {
      this.info = res;
      this.info.loadavg =
        this.info.loadavg.map((x, i) => {return x.toFixed(2);}).join(' ');
      this.info.physmem =
        Number(this.info.physmem / 1024 / 1024).toFixed(0) + ' MiB';
    });
  }

}

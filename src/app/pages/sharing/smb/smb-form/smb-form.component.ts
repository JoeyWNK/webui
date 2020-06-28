import { Component } from '@angular/core';
import { FormControl } from '@angular/forms';
import { Router } from '@angular/router';
import { shared, helptext_sharing_smb } from 'app/helptext/sharing';
import { T } from "app/translate-marker";
import { EntityUtils } from 'app/pages/common/entity/utils';
import * as _ from 'lodash';
import { combineLatest, of } from 'rxjs';
import { catchError, filter, map, switchMap, tap } from 'rxjs/operators';
import { DialogService, RestService, WebSocketService, AppLoaderService } from '../../../../services/';
import { FieldConfig } from '../../../common/entity/entity-form/models/field-config.interface';

@Component({
  selector : 'app-smb-form',
  template : `<entity-form [conf]="this"></entity-form>`
})
export class SMBFormComponent {

  protected resource_name: string = 'sharing/cifs/';
  protected route_success: string[] = [ 'sharing', 'smb' ];
  protected isEntity: boolean = true;
  protected isBasicMode: boolean = true;
  public isTimeMachineOn = false;

  protected fieldConfig: FieldConfig[] = [
    {
      type : 'explorer',
      initial: '/mnt',
      explorerType: 'directory',
      name: 'cifs_path',
      placeholder: helptext_sharing_smb.placeholder_path,
      tooltip: helptext_sharing_smb.tooltip_path,
      required: true,
      validation : helptext_sharing_smb.validators_path
    },
    {
      type: 'input',
      name: 'cifs_name',
      placeholder: helptext_sharing_smb.placeholder_name,
      tooltip: helptext_sharing_smb.tooltip_name,
      validation: this.forbiddenNameValidator.bind(this),
      hasErrors: false,
      errors: helptext_sharing_smb.errormsg_name
    },
    {
      type: 'checkbox',
      name: 'cifs_home',
      placeholder: helptext_sharing_smb.placeholder_home,
      tooltip: helptext_sharing_smb.tooltip_home,
    },
    {
      type: 'input',
      name: 'cifs_comment',
      placeholder: helptext_sharing_smb.placeholder_comment,
      tooltip: helptext_sharing_smb.tooltip_comment,
    },
    {
      type: 'checkbox',
      name: 'cifs_timemachine',
      placeholder: helptext_sharing_smb.placeholder_timemachine,
      tooltip: helptext_sharing_smb.tooltip_timemachine,
    },
    {
      type: 'checkbox',
      name: 'cifs_ro',
      placeholder: helptext_sharing_smb.placeholder_ro,
      tooltip: helptext_sharing_smb.tooltip_ro
    },
    {
      type: 'checkbox',
      name: 'cifs_browsable',
      placeholder: helptext_sharing_smb.placeholder_browsable,
      tooltip: helptext_sharing_smb.tooltip_browsable,
    },
    {
      type: 'checkbox',
      name: 'cifs_recyclebin',
      placeholder: helptext_sharing_smb.placeholder_recyclebin,
      tooltip: helptext_sharing_smb.tooltip_recyclebin
    },
    {
      type: 'checkbox',
      name: 'cifs_showhiddenfiles',
      placeholder: helptext_sharing_smb.placeholder_showhiddenfiles,
      tooltip: helptext_sharing_smb.tooltip_showhiddenfiles
    },
    {
      type: 'checkbox',
      name: 'cifs_guestok',
      placeholder: helptext_sharing_smb.placeholder_guestok,
      tooltip: helptext_sharing_smb.tooltip_guestok
    },
    {
      type: 'checkbox',
      name: 'cifs_guestonly',
      placeholder: helptext_sharing_smb.placeholer_guestonly,
      tooltip: helptext_sharing_smb.tooltip_guestonly
    },
    {
      type: 'checkbox',
      name: 'cifs_abe',
      placeholder: helptext_sharing_smb.placeholder_abe,
      tooltip: helptext_sharing_smb.tooltip_abe
    },
    {
      type: 'textarea',
      name: 'cifs_hostsallow',
      placeholder: helptext_sharing_smb.placeholder_hostsallow,
      tooltip: helptext_sharing_smb.tooltip_hostsallow
    },
    {
      type: 'textarea',
      name: 'cifs_hostsdeny',
      placeholder: helptext_sharing_smb.placeholder_hostsdeny,
      tooltip: helptext_sharing_smb.tooltip_hostsdeny
    },
    {
      type: 'select',
      name: 'cifs_vfsobjects',
      placeholder: helptext_sharing_smb.placeholder_vfsobjects,
      tooltip: helptext_sharing_smb.tooltip_vfsobjects,
      options: [],
      multiple: true,
    },
    {
      type: 'checkbox',
      name: 'cifs_shadowcopy',
      placeholder: helptext_sharing_smb.placeholder_shadowcopy,
      tooltip: helptext_sharing_smb.tooltip_shadowcopy,
      value: true
    },
    {
      type: 'textarea',
      name: 'cifs_auxsmbconf',
      placeholder: helptext_sharing_smb.placeholder_auxsmbconf,
      tooltip: helptext_sharing_smb.tooltip_auxsmbconf,
    },
  ];

  private cifs_vfsobjects: any;

  protected advanced_field: Array<any> = [
    'cifs_auxsmbconf',
    'cifs_vfsobjects',
    'cifs_hostsdeny',
    'cifs_hostsallow',
    'cifs_guestonly',
    'cifs_abe',
    'cifs_showhiddenfiles',
    'cifs_recyclebin',
    'cifs_browsable',
    'cifs_ro',
  ];

  public custActions: Array<any> = [
    {
      id : 'basic_mode',
      name : helptext_sharing_smb.actions_basic_mode,
      function : () => { this.isBasicMode = !this.isBasicMode; }
    },
    {
      'id' : 'advanced_mode',
      name : helptext_sharing_smb.actions_advanced_mode,
      function : () => { this.isBasicMode = !this.isBasicMode; }
    }
  ];

  constructor(protected router: Router, protected rest: RestService,
              protected ws: WebSocketService, private dialog:DialogService,
              protected loader: AppLoaderService ) {}

  isCustActionVisible(actionId: string) {
    if (actionId == 'advanced_mode' && this.isBasicMode == false) {
      return false;
    } else if (actionId == 'basic_mode' && this.isBasicMode == true) {
      return false;
    }
    return true;
  }

  afterSave(entityForm) {
    if (entityForm.formGroup.controls['cifs_timemachine'].value && !this.isTimeMachineOn) {
      this.dialog.confirm(helptext_sharing_smb.restart_smb_dialog.title, helptext_sharing_smb.restart_smb_dialog.message,
        true, helptext_sharing_smb.restart_smb_dialog.title, false, '','','','',false, 
        helptext_sharing_smb.restart_smb_dialog.cancel_btn).subscribe((res) => {
          if (res) {
            this.loader.open();
            this.ws.call('service.restart', ['cifs']).subscribe(() => {
              this.loader.close();
              this.dialog.Info(helptext_sharing_smb.restarted_smb_dialog.title, 
                helptext_sharing_smb.restarted_smb_dialog.message, '250px').subscribe(() => {
                  this.checkACLactions(entityForm);
                })
            }, (err) => { 
              this.loader.close();
              this.dialog.errorReport('Error', err.err, err.backtrace);
            }
            )
          } else {
            this.checkACLactions(entityForm);
          }
        });
    } else {
      this.checkACLactions(entityForm);   
    }
  }

  checkACLactions(entityForm) {
    const sharePath: string = entityForm.formGroup.get('cifs_path').value;
    const datasetId = sharePath.replace('/mnt/', '');
    const poolName = datasetId.split('/')[0];

    // Check if pool is offline (possibly locked); if so, return to list; else, do some more checking
    this.ws.call('pool.query', [[["name", "=", poolName]]]).subscribe(pool => {
      if (pool[0].status === 'OFFLINE') {
        this.router.navigate(['/'].concat(this.route_success))
      } else {
    /**
     * If share does have trivial ACL, check if user wants to edit dataset permissions. If not,
     * nav to SMB shares list view.
     */
    const promptUserACLEdit = () => 
      this.ws.call('filesystem.acl_is_trivial', [sharePath]).pipe(
        switchMap((isTrivialACL: boolean) =>
          /* If share does not have trivial ACL, move on. Otherwise, perform some async data-gathering operations */
          !isTrivialACL || !datasetId.includes('/')
            ? combineLatest(of(false), of({}))
            : 
              combineLatest(
                /* Check if user wants to edit the share's ACL */
                this.dialog.confirm(
                  helptext_sharing_smb.dialog_edit_acl_title,
                  helptext_sharing_smb.dialog_edit_acl_message,
                  true,
                  helptext_sharing_smb.dialog_edit_acl_button
                ),
              )
        ),
        tap(([doConfigureACL, dataset]) =>
          doConfigureACL
            ? this.router.navigate(
                ['/'].concat(['storage', 'pools', 'id', poolName, 'dataset', 'acl', datasetId])
              )
            : this.router.navigate(['/'].concat(this.route_success))
        )
      );

    this.ws
      .call("service.query", [])
      .pipe(
        map(response => _.find(response, { service: "cifs" })),
        switchMap(cifsService => {
          if (cifsService.enable) {
            return promptUserACLEdit();
          }

          /**
           * Allow user to enable cifs service, then ask about editing
           * dataset ACL.
           */
          return this.dialog
            .confirm(
              shared.dialog_title,
              shared.dialog_message,
              true,
              shared.dialog_button
            )
            .pipe(
              switchMap(doEnableService => {
                if (doEnableService) {
                  entityForm.loader.open();
                  return this.ws.call("service.update", [cifsService.id, { enable: true }]).pipe(
                    switchMap(() => this.ws.call("service.start", [cifsService.service])),
                    tap(() => {
                      entityForm.loader.close();
                    }),
                    switchMap(() => {
                    return this.dialog.Info(T('SMB') + shared.dialog_started_title, 
                      T('The SMB') + shared.dialog_started_message, '250px')
                    }),
                    catchError(error => {
                      entityForm.loader.close();
                      return this.dialog.errorReport(error.error, error.reason, error.trace.formatted);
                    })
                  );
                }
                return of(true);
              }),
              switchMap(promptUserACLEdit)
            );
        })
      )
      .subscribe(() => {}, error => new EntityUtils().handleWSError(this, error, this.dialog));
      }
    })

  }

  afterInit(entityForm: any) {
    entityForm.ws.call('sharing.smb.vfsobjects_choices', [])
        .subscribe((res) => {
          this.cifs_vfsobjects =
              _.find(this.fieldConfig, {'name': "cifs_vfsobjects"});
          const options = [];
          res.forEach((item) => {
            options.push({label : item, value : item});
          });
          this.cifs_vfsobjects.options = _.sortBy(options, ['label']);
        });
    if (entityForm.isNew) {
      entityForm.formGroup.controls['cifs_vfsobjects'].setValue(['ixnas', 'streams_xattr']);
      entityForm.formGroup.controls['cifs_browsable'].setValue(true);
    }

    entityForm.formGroup.controls['cifs_name'].statusChanges.subscribe((res) => {
      let target = _.find(this.fieldConfig, {'name' : 'cifs_name'});
      res === 'INVALID' ? target.hasErrors = true : target.hasErrors = false;
    })
    setTimeout(() => {
      if (entityForm.formGroup.controls['cifs_timemachine'].value) { this.isTimeMachineOn = true };
    }, 700)
  }

  forbiddenNameValidator(control: FormControl): {[key: string]: boolean} {
    if (control.value === 'global') {
      return {'nameIsForbidden': true}
    }
    return null;
  }
}

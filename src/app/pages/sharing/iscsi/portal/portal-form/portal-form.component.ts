import { Component } from '@angular/core';
import { Router, ActivatedRoute } from '@angular/router';
import { Validators } from "@angular/forms";

import * as _ from 'lodash';
import { IscsiService, WebSocketService, AppLoaderService } from '../../../../../services/';
import { FieldConfig } from '../../../../common/entity/entity-form/models/field-config.interface';
import { EntityUtils } from '../../../../common/entity/utils';
import { helptext_sharing_iscsi } from 'app/helptext/sharing';
import { ipValidator } from "app/pages/common/entity/entity-form/validators/ip-validation";
import { selectedOptionValidator } from "app/pages/common/entity/entity-form/validators/invalid-option-selected";

@Component({
  selector: 'app-iscsi-portal-add',
  template: `<entity-form [conf]="this"></entity-form>`,
  providers: [IscsiService],
})
export class PortalFormComponent {

  protected addCall = 'iscsi.portal.create';
  protected queryCall = 'iscsi.portal.query';
  protected editCall = 'iscsi.portal.update';
  protected route_success: string[] = ['sharing', 'iscsi', 'portals'];
  protected customFilter: Array<any> = [[["id", "="]]];
  protected isEntity = true;
  protected getValidOptions = this.iscsiService.getIpChoices().toPromise().then(res => {
    const options = [];
    for (const ip in res) {
      options.push({ label: res[ip], value: ip });
    }
    return options;
  });
  protected fieldConfig: FieldConfig[] = [
    {
      type: 'input',
      name: 'comment',
      placeholder: helptext_sharing_iscsi.portal_form_placeholder_comment,
      tooltip: helptext_sharing_iscsi.portal_form_tooltip_comment,
    },
    {
      type: 'select',
      name: 'discovery_authmethod',
      placeholder: helptext_sharing_iscsi.portal_form_placeholder_discovery_authmethod,
      tooltip: helptext_sharing_iscsi.portal_form_tooltip_discovery_authmethod,
      options: [
        {
          label: 'NONE',
          value: 'NONE',
        },
        {
          label: 'CHAP',
          value: 'CHAP',
        },
        {
          label: 'Mutual CHAP',
          value: 'CHAP_MUTUAL',
        }
      ],
      value: 'NONE',
    },
    {
      type: 'select',
      name: 'discovery_authgroup',
      placeholder: helptext_sharing_iscsi.portal_form_placeholder_discovery_authgroup,
      tooltip: helptext_sharing_iscsi.portal_form_tooltip_discovery_authgroup,
      options: [{ label: '---', value: null }],
      value: null,
    },
    {
      type: 'list',
      name: 'listen',
      templateListField: [
        {
          type: 'select',
          multiple: true,
          name: 'ip',
          placeholder: helptext_sharing_iscsi.portal_form_placeholder_ip,
          tooltip: helptext_sharing_iscsi.portal_form_tooltip_ip,
          options: [],
          class: 'inline',
          width: '60%',
          required: true,
          validation: [Validators.required, ipValidator('all')],
          asyncValidation: [selectedOptionValidator(this.getValidOptions)]
        },
        {
          type: 'input',
          name: 'port',
          placeholder: helptext_sharing_iscsi.portal_form_placeholder_port,
          tooltip: helptext_sharing_iscsi.portal_form_tooltip_port,
          value: '3260',
          validation: helptext_sharing_iscsi.portal_form_validators_port,
          class: 'inline',
          width: '30%',
        }
      ],
      listFields: [],
    }
  ];

  protected pk: any;
  protected authgroup_field: any;
  protected entityForm: any;
  protected ip: any;

  constructor(protected router: Router,
    protected iscsiService: IscsiService,
    protected aroute: ActivatedRoute,
    protected loader: AppLoaderService,
    protected ws: WebSocketService) { }

    prerequisite(): Promise<boolean> {
      return new Promise(async (resolve, reject) => {
        const listenIpField = _.find(this.fieldConfig, { 'name': 'listen' }).templateListField[0];
        await this.iscsiService.getIpChoices().toPromise().then((ips) => {
          for (const ip in ips) {
            listenIpField.options.push({ label: ips[ip], value: ip });
          }
          const listenListFields = _.find(this.fieldConfig, { 'name': 'listen' }).listFields;
          for (const listenField of listenListFields) {
            const ipField = _.find(listenField, { name: 'ip' });
            ipField.options = listenIpField.options;
          }
          resolve(true);
        }, (err) => {
          resolve(false);
        });
      });
    }

  preInit() {
    this.aroute.params.subscribe(params => {
      if (params['pk']) {
        this.pk = params['pk'];
        this.customFilter[0][0].push(parseInt(params['pk']));
      }
    });

    this.authgroup_field = _.find(this.fieldConfig, { 'name': 'discovery_authgroup' });
    this.iscsiService.getAuth().subscribe((res) => {
      for (let i = 0; i < res.length; i++) {
        if (_.find(this.authgroup_field.options, { value: res[i].tag }) == undefined) {
          this.authgroup_field.options.push({ label: res[i].tag, value: res[i].tag });
        }
      }
    });
  }

  afterInit(entityForm: any) {
    this.entityForm = entityForm;

    entityForm.formGroup.controls['listen'].valueChanges.subscribe((res) => {
      this.genPortalAddress(res);
    })
  }

  customEditCall(value) {
    this.loader.open();
    this.ws.call(this.editCall, [this.pk, value]).subscribe(
      (res) => {
        this.loader.close();
        this.router.navigate(new Array('/').concat(this.route_success));
      },
      (res) => {
        this.loader.close();
        new EntityUtils().handleWSError(this.entityForm, res);
      }
    );
  }

  genPortalAddress(data) {
    let ips = [];
    for (let i = 0; i < data.length; i++) {
      if (data[i]['ip']) {
        const samePortIps = data[i]['ip'].reduce(
          (fullIps, currip) => fullIps.concat({ip:currip, port:data[i]['port']})
        , []);
        ips = ips.concat(samePortIps);
      }
    }
    this.ip = ips;
  }

  beforeSubmit(data) {
    data['listen'] = this.ip;
  }

  resourceTransformIncomingRestData(data) {
    const ports = new Map();
    const groupedIp = [];
    for (let i = 0; i < data['listen'].length; i++) {
      if (ports[data['listen'][i].port] === undefined) {
        ports[data['listen'][i].port] = [];
        groupedIp.push({ip: ports[data['listen'][i].port], port:data['listen'][i].port});
      }
      ports[data['listen'][i].port].push(data['listen'][i]['ip']);
    }
    data['listen'] = groupedIp;
    return data;
  }
}

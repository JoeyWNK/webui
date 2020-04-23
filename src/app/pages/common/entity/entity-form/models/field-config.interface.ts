import { ValidatorFn, AsyncValidatorFn } from '@angular/forms';
import { RelationGroup } from './field-relation.interface';

export interface FieldConfig {
  disabled?: boolean, label?: string, inlineLabel?: string, name: string, options?: any[],
  errors?: string, hasErrors?: boolean, placeholder?: string, type: string,
  inputType?: string, validation?: any[] | ValidatorFn | ValidatorFn[], asyncValidation?: AsyncValidatorFn | AsyncValidatorFn[];
  value?: any, multiple?: boolean, tristate?: boolean, tooltip?: string,
  relation?: RelationGroup[], isHidden?: boolean, formarray?: any,
  initialCount?: number, readonly?: boolean, initial?: string, rootSelectable?: boolean,
  min?: number, max?: number, tabs?: any[], tabName?: string, class?: string,
  customEventActionLabel?: string, explorerType?: string, explorerParam?: any, customTemplateStringOptions?: any,
  required?: boolean, deleteButtonOnFirst?: boolean, addBtnMessage?: string,
  acceptedFiles?: string, fileLocation?: string, fileType?: string,width?:string,
  message?: any, updater?:any, parent?:any,togglePw?:boolean, paraText?: any,
  noexec?: boolean, blurStatus?:boolean,blurEvent?:any,noMinutes?:boolean,
  warnings?: string, hideButton?:boolean, searchOptions?: any[], hideDirs?: any,
  listFields?: Array<FieldConfig>[], templateListField?: FieldConfig[],
  updateLocal?: boolean, isLoading?: boolean, textAreaRows?: number, netmaskPreset?: number,
  isLargeText?: boolean, paragraphIcon?: string, zeroStateMessage?: string, isDoubleConfirm?:boolean,
  maskValue?: any
  customEventMethod?(data:any), onChangeOption?(data:any),
}

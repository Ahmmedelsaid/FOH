import { AbstractControl, FormArray, ValidationErrors, ValidatorFn } from '@angular/forms';

/** 01 + one of 0/1/2/5 + 8 digits, e.g. 01012345678. */
const EGYPTIAN_MOBILE = /^01[0125]\d{8}$/;

/** Empty values pass: combine with Validators.required when the field is mandatory. */
export function egyptianMobile(): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const value = control.value as string | null;
    return !value || EGYPTIAN_MOBILE.test(value.trim()) ? null : { egyptianMobile: true };
  };
}

export function minArrayLength(min: number): ValidatorFn {
  return (control: AbstractControl): ValidationErrors | null => {
    const length = control instanceof FormArray ? control.length : 0;
    return length >= min ? null : { minArrayLength: { required: min, actual: length } };
  };
}

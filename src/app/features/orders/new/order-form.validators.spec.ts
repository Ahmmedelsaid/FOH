import { FormArray, FormControl } from '@angular/forms';
import { egyptianMobile, minArrayLength } from './order-form.validators';

describe('egyptianMobile', () => {
  const validate = (value: string | null) => egyptianMobile()(new FormControl(value));

  it('accepts 01 + 0/1/2/5 + 8 digits', () => {
    for (const number of ['01012345678', '01112345678', '01212345678', '01512345678']) {
      expect(validate(number)).toBeNull();
    }
  });

  it('rejects other prefixes, wrong length and non-digits', () => {
    for (const number of ['01312345678', '0101234567', '010123456789', '02012345678', '0101234567a']) {
      expect(validate(number)).toEqual({ egyptianMobile: true });
    }
  });

  it('lets empty values through so required can report them', () => {
    expect(validate('')).toBeNull();
    expect(validate(null)).toBeNull();
  });
});

describe('minArrayLength', () => {
  it('fails an empty array and passes once it has enough controls', () => {
    const array = new FormArray<FormControl<string | null>>([]);
    expect(minArrayLength(1)(array)).toEqual({ minArrayLength: { required: 1, actual: 0 } });

    array.push(new FormControl('x'));
    expect(minArrayLength(1)(array)).toBeNull();
  });
});

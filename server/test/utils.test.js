import assert from 'node:assert/strict';
import { test } from 'node:test';
import { feeRangeFromCourses, profileCompleteness } from '../src/services/institutions.js';
import { isIndianMobile, normalizePhone, slugify, toCsv } from '../src/utils/text.js';

test('slugify makes clean URL slugs', () => {
  assert.equal(slugify('L.D. College of Engineering, Ahmedabad'), 'l-d-college-of-engineering-ahmedabad');
  assert.equal(slugify('  ---  '), '');
});

test('phone normalisation accepts +91 and leading 0', () => {
  assert.equal(normalizePhone('+91 98765 43210'), '9876543210');
  assert.equal(normalizePhone('09876543210'), '9876543210');
  assert.ok(isIndianMobile('+919876543210'));
  assert.ok(!isIndianMobile('1234567890'));
});

test('csv escapes quotes, commas and newlines', () => {
  const csv = toCsv([{ a: 'x,"y"', b: 'line\nbreak' }], [{ label: 'A', value: 'a' }, { label: 'B', value: (r) => r.b }]);
  assert.equal(csv, 'A,B\n"x,""y""","line\nbreak"');
});

test('fee range comes from course fees', () => {
  assert.deepEqual(feeRangeFromCourses([{ feesPerYear: 50000 }, { feesPerYear: 20000 }, {}]), { min: 20000, max: 50000 });
  assert.equal(feeRangeFromCourses([]), null);
});

test('profile completeness lists missing fields', () => {
  const { percent, missing } = profileCompleteness({ name: 'X', courses: [] });
  assert.ok(percent < 20);
  assert.ok(missing.includes('courses'));
});

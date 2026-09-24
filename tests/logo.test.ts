import { describe, it, expect } from 'vitest';
import {
  parseLogoUrl,
  formatLogoUrl,
  getLogoShapeClass,
  getLogoFitClass,
  getCompanyInitials,
} from '@/lib/utils/logo';

describe('Logo Utils', () => {
  it('parses logo URL with shape and fit query parameters', () => {
    const parsed = parseLogoUrl('/uploads/logo.png?shape=circle&fit=cover');
    expect(parsed.cleanUrl).toBe('/uploads/logo.png');
    expect(parsed.shape).toBe('circle');
    expect(parsed.fit).toBe('cover');
  });

  it('defaults to circle and cover when query parameters are absent', () => {
    const parsed = parseLogoUrl('/uploads/old-logo.png');
    expect(parsed.cleanUrl).toBe('/uploads/old-logo.png');
    expect(parsed.shape).toBe('circle');
    expect(parsed.fit).toBe('cover');
  });

  it('formats clean URL with shape and fit parameters', () => {
    const formatted = formatLogoUrl('/uploads/logo.png', 'rounded', 'contain');
    expect(formatted).toBe('/uploads/logo.png?shape=rounded&fit=contain');
  });

  it('maps shape to correct Tailwind CSS class', () => {
    expect(getLogoShapeClass('circle')).toBe('rounded-full');
    expect(getLogoShapeClass('rounded')).toBe('rounded-2xl');
    expect(getLogoShapeClass('square')).toBe('rounded-lg');
  });

  it('maps fit to correct Tailwind CSS class', () => {
    expect(getLogoFitClass('cover')).toBe('object-cover');
    expect(getLogoFitClass('contain')).toBe('object-contain');
  });

  it('extracts initials cleanly from company names', () => {
    expect(getCompanyInitials('taj gate')).toBe('TG');
    expect(getCompanyInitials('Apple')).toBe('AP');
    expect(getCompanyInitials('SUBESH M LLC')).toBe('SM');
    expect(getCompanyInitials('')).toBe('Q');
    expect(getCompanyInitials(null)).toBe('Q');
  });
});

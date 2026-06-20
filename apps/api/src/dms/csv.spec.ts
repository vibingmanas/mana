import { describe, it, expect } from 'vitest';
import { parseCsv } from './csv';

describe('parseCsv', () => {
  it('parses headers + rows into objects', () => {
    const rows = parseCsv(
      'regNumber,make,price\nMH12AB1234,Maruti,550000\nKA01CD5678,Hyundai,420000',
    );
    expect(rows).toHaveLength(2);
    expect(rows[0]).toEqual({ regNumber: 'MH12AB1234', make: 'Maruti', price: '550000' });
    expect(rows[1].make).toBe('Hyundai');
  });

  it('handles quoted fields with commas and escaped quotes', () => {
    const rows = parseCsv('regNumber,model\nMH12AB1234,"Swift, VXi ""ABS"""');
    expect(rows[0].model).toBe('Swift, VXi "ABS"');
  });

  it('tolerates CRLF and trailing blank lines', () => {
    const rows = parseCsv('regNumber\r\nMH12AB1234\r\n\r\n');
    expect(rows).toHaveLength(1);
    expect(rows[0].regNumber).toBe('MH12AB1234');
  });

  it('returns [] for empty input', () => {
    expect(parseCsv('')).toEqual([]);
  });
});

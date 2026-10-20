import { describe, expect, it } from 'vitest';
import { rgbToPdf } from './pdf';

describe('pdf', () => {
  it('pakker et RGB-bilde i en gyldig PDF', async () => {
    const rgb = new Uint8Array([255, 0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 0]);
    const pdf = await rgbToPdf(2, 2, rgb, 20, 10);
    const text = new TextDecoder().decode(pdf);
    expect(text.startsWith('%PDF-1.4')).toBe(true);
    expect(text).toContain('/Subtype /Image');
    expect(text).toContain('/Width 2');
    expect(text).toContain('%%EOF');
  });
});

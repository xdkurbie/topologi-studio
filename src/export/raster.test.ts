import { readFileSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { perfektTemplate } from '../template/perfekt';
import { udmVlanTemplate } from '../template/unifi';
import { CANVAS_TILE, encodePng, rasterPlan } from './raster';

function covers(plan: ReturnType<typeof rasterPlan>): void {
  const seen = new Uint8Array(plan.width * plan.height);
  for (const tile of plan.tiles) {
    expect(tile.w).toBeGreaterThan(0);
    expect(tile.h).toBeGreaterThan(0);
    expect(tile.w).toBeLessThanOrEqual(CANVAS_TILE);
    expect(tile.h).toBeLessThanOrEqual(CANVAS_TILE);
    expect(tile.x + tile.w).toBeLessThanOrEqual(plan.width);
    expect(tile.y + tile.h).toBeLessThanOrEqual(plan.height);
    for (let y = tile.y; y < tile.y + tile.h; y += 1) {
      seen.fill(1, y * plan.width + tile.x, y * plan.width + tile.x + tile.w);
    }
  }
  expect(seen.every((value) => value === 1)).toBe(true);
}

describe('rasterplan for macOS', () => {
  it('deler store lerreter slik at ingen canvas overstiger WebKit-grensen', () => {
    const small = rasterPlan(100, 80, 2);
    expect(small.tiles).toEqual([{ x: 0, y: 0, w: 200, h: 160 }]);
    expect(small.clamped).toBe(false);

    const vlan = udmVlanTemplate();
    const triple = rasterPlan(vlan.canvas.width, vlan.canvas.height, 3);
    expect(triple.width).toBe(5700);
    expect(triple.height).toBe(5820);
    expect(triple.tiles.length).toBeGreaterThan(1);
    covers(triple);

    const tall = perfektTemplate();
    expect(tall.canvas).toEqual({ width: 1900, height: 4388, background: '#14171c' });
    for (const scale of [1, 2, 3]) {
      const plan = rasterPlan(tall.canvas.width, tall.canvas.height, scale);
      expect(plan.tiles.length).toBeGreaterThan(1);
      expect(plan.width).toBe(Math.round(1900 * plan.scale));
      expect(plan.height).toBe(Math.round(4388 * plan.scale));
      covers(plan);
    }
  });

  it('koder PNG uten ett kjempelerret', async () => {
    const rgb = new Uint8Array([255, 0, 0, 0, 255, 0, 0, 0, 255, 255, 255, 255]);
    const png = await encodePng(2, 2, rgb);
    expect(Array.from(png.subarray(0, 8))).toEqual([137, 80, 78, 71, 13, 10, 26, 10]);
    expect(new TextDecoder().decode(png.subarray(12, 16))).toBe('IHDR');
    const view = new DataView(png.buffer, png.byteOffset, png.byteLength);
    expect(view.getUint32(16)).toBe(2);
    expect(view.getUint32(20)).toBe(2);
  });

  it('lar lagringsdialogen være asynkron, med foreldrevindu', () => {
    const source = readFileSync(new URL('../../src-tauri/src/lib.rs', import.meta.url), 'utf8');
    const syncDialog = source.split('\n').filter((line) => /^\s*(pub\s+)?fn pick_(open|save)\b/.test(line));
    expect(syncDialog).toEqual([]);
    expect(source).toMatch(/async fn pick_open/);
    expect(source).toMatch(/async fn pick_save/);
    expect(source).toContain('set_parent');
    expect(source).not.toContain('.unwrap()');
  });
});

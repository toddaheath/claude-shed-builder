import { describe, it, expect } from 'vitest';

// Basic type/structure tests for the API module
describe('api module', () => {
  it('exports api object', async () => {
    const module = await import('../api');
    expect(module.api).toBeDefined();
    expect(typeof module.api.listDesigns).toBe('function');
    expect(typeof module.api.getDesign).toBe('function');
    expect(typeof module.api.createDesign).toBe('function');
    expect(typeof module.api.updateDesign).toBe('function');
    expect(typeof module.api.deleteDesign).toBe('function');
    expect(typeof module.api.getBom).toBe('function');
    expect(typeof module.api.getCost).toBe('function');
    expect(typeof module.api.downloadStl).toBe('function');
    expect(typeof module.api.downloadPdf).toBe('function');
    expect(typeof module.api.listVersions).toBe('function');
    expect(typeof module.api.createVersion).toBe('function');
    expect(typeof module.api.restoreVersion).toBe('function');
  });
});

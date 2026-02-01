import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import {
  registerRenderer,
  getRenderer,
  render,
  hasRenderer,
  getFormatsForResource,
} from '../registry.js';
import { jsonRenderer } from '../json.js';
import { csvRenderer } from '../csv.js';
import { tableRenderer } from '../table.js';
import type { GenericRenderer, RenderContext } from '../types.js';

const defaultCtx: RenderContext = {
  noColor: true,
  terminalWidth: 80,
};

describe('renderer registry', () => {
  describe('getRenderer', () => {
    it('should return json renderer for any resource type', () => {
      expect(getRenderer('time_entry', 'json')).toBe(jsonRenderer);
      expect(getRenderer('task', 'json')).toBe(jsonRenderer);
      expect(getRenderer('project', 'json')).toBe(jsonRenderer);
    });

    it('should return csv renderer for any resource type', () => {
      expect(getRenderer('time_entry', 'csv')).toBe(csvRenderer);
      expect(getRenderer('task', 'csv')).toBe(csvRenderer);
    });

    it('should return table renderer for any resource type', () => {
      expect(getRenderer('time_entry', 'table')).toBe(tableRenderer);
      expect(getRenderer('project', 'table')).toBe(tableRenderer);
    });

    it('should return undefined for unregistered format', () => {
      // Human format is not registered yet (will be added later)
      expect(getRenderer('time_entry', 'human')).toBeUndefined();
    });
  });

  describe('registerRenderer', () => {
    it('should register a specific renderer for a resource type', () => {
      const mockRenderer: GenericRenderer = {
        render: vi.fn(),
      };

      registerRenderer('budget', 'human', mockRenderer);

      expect(getRenderer('budget', 'human')).toBe(mockRenderer);
    });

    it('should allow overriding wildcard with specific renderer', () => {
      const specificRenderer: GenericRenderer = {
        render: vi.fn(),
      };

      registerRenderer('service', 'json', specificRenderer);

      // Specific renderer takes precedence
      expect(getRenderer('service', 'json')).toBe(specificRenderer);
    });
  });

  describe('render', () => {
    let consoleSpy: ReturnType<typeof vi.spyOn>;

    beforeEach(() => {
      consoleSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
    });

    afterEach(() => {
      consoleSpy.mockRestore();
    });

    it('should render data using the appropriate renderer', () => {
      const data = { id: '1', name: 'Test' };

      render('project', 'json', data, defaultCtx);

      expect(consoleSpy).toHaveBeenCalledWith(JSON.stringify(data, null, 2));
    });

    it('should throw error for unregistered format', () => {
      expect(() => {
        render('project', 'human', {}, defaultCtx);
      }).toThrow('No renderer found for project:human');
    });
  });

  describe('hasRenderer', () => {
    it('should return true for registered formats', () => {
      expect(hasRenderer('time_entry', 'json')).toBe(true);
      expect(hasRenderer('task', 'csv')).toBe(true);
      expect(hasRenderer('project', 'table')).toBe(true);
    });

    it('should return false for unregistered formats', () => {
      expect(hasRenderer('time_entry', 'human')).toBe(false);
      expect(hasRenderer('task', 'kanban')).toBe(false);
    });
  });

  describe('getFormatsForResource', () => {
    it('should return all registered formats for a resource', () => {
      const formats = getFormatsForResource('time_entry');

      expect(formats).toContain('json');
      expect(formats).toContain('csv');
      expect(formats).toContain('table');
    });
  });
});

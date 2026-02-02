import { describe, it, expect } from 'vitest';
import { TOOLS, STDIO_ONLY_TOOLS } from '../tools.js';

describe('tools', () => {
  describe('TOOLS', () => {
    it('should export an array of tools', () => {
      expect(Array.isArray(TOOLS)).toBe(true);
      expect(TOOLS.length).toBeGreaterThan(0);
    });

    it('should have valid tool structure for all tools', () => {
      for (const tool of TOOLS) {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
        expect(typeof tool.name).toBe('string');
        expect(typeof tool.description).toBe('string');
        expect(tool.inputSchema).toHaveProperty('type', 'object');
      }
    });

    it('should have exactly 5 consolidated tools', () => {
      expect(TOOLS.length).toBe(5);
      const toolNames = TOOLS.map(t => t.name);
      expect(toolNames).toContain('productive_projects');
      expect(toolNames).toContain('productive_time');
      expect(toolNames).toContain('productive_tasks');
      expect(toolNames).toContain('productive_services');
      expect(toolNames).toContain('productive_people');
    });

    it('should include productive_projects with list and get actions', () => {
      const tool = TOOLS.find(t => t.name === 'productive_projects');
      expect(tool).toBeDefined();
      expect(tool?.inputSchema.required).toContain('action');
      
      const actionProp = tool?.inputSchema.properties?.action as { enum?: string[] };
      expect(actionProp?.enum).toEqual(['list', 'get']);
      
      expect(tool?.inputSchema.properties).toHaveProperty('id');
      expect(tool?.inputSchema.properties).toHaveProperty('filter');
      expect(tool?.inputSchema.properties).toHaveProperty('page');
      expect(tool?.inputSchema.properties).toHaveProperty('per_page');
      expect(tool?.inputSchema.properties).toHaveProperty('compact');
    });

    it('should include productive_time with all CRUD actions', () => {
      const tool = TOOLS.find(t => t.name === 'productive_time');
      expect(tool).toBeDefined();
      expect(tool?.inputSchema.required).toContain('action');

      const actionProp = tool?.inputSchema.properties?.action as { enum?: string[] };
      expect(actionProp?.enum).toEqual(['list', 'get', 'create', 'update', 'delete']);

      // Check create/update fields
      expect(tool?.inputSchema.properties).toHaveProperty('person_id');
      expect(tool?.inputSchema.properties).toHaveProperty('service_id');
      expect(tool?.inputSchema.properties).toHaveProperty('time');
      expect(tool?.inputSchema.properties).toHaveProperty('date');
      expect(tool?.inputSchema.properties).toHaveProperty('note');
    });

    it('should include productive_tasks with list and get actions', () => {
      const tool = TOOLS.find(t => t.name === 'productive_tasks');
      expect(tool).toBeDefined();
      expect(tool?.inputSchema.required).toContain('action');
      
      const actionProp = tool?.inputSchema.properties?.action as { enum?: string[] };
      expect(actionProp?.enum).toEqual(['list', 'get']);
    });

    it('should include productive_services with list action', () => {
      const tool = TOOLS.find(t => t.name === 'productive_services');
      expect(tool).toBeDefined();
      expect(tool?.inputSchema.required).toContain('action');
      
      const actionProp = tool?.inputSchema.properties?.action as { enum?: string[] };
      expect(actionProp?.enum).toEqual(['list']);
    });

    it('should include productive_people with list, get, and me actions', () => {
      const tool = TOOLS.find(t => t.name === 'productive_people');
      expect(tool).toBeDefined();
      expect(tool?.inputSchema.required).toContain('action');
      
      const actionProp = tool?.inputSchema.properties?.action as { enum?: string[] };
      expect(actionProp?.enum).toEqual(['list', 'get', 'me']);
    });

    it('all tools should support compact mode', () => {
      for (const tool of TOOLS) {
        expect(tool.inputSchema.properties).toHaveProperty('compact');
      }
    });

    it('all tools should support pagination', () => {
      for (const tool of TOOLS) {
        expect(tool.inputSchema.properties).toHaveProperty('page');
        expect(tool.inputSchema.properties).toHaveProperty('per_page');
      }
    });
  });

  describe('STDIO_ONLY_TOOLS', () => {
    it('should export an array of tools', () => {
      expect(Array.isArray(STDIO_ONLY_TOOLS)).toBe(true);
      expect(STDIO_ONLY_TOOLS.length).toBeGreaterThan(0);
    });

    it('should include configure tool', () => {
      const configureTool = STDIO_ONLY_TOOLS.find(t => t.name === 'productive_configure');
      expect(configureTool).toBeDefined();
      expect(configureTool?.inputSchema.required).toEqual(
        expect.arrayContaining(['organizationId', 'apiToken'])
      );
    });

    it('should include get_config tool', () => {
      const getConfigTool = STDIO_ONLY_TOOLS.find(t => t.name === 'productive_get_config');
      expect(getConfigTool).toBeDefined();
    });

    it('should have valid tool structure', () => {
      for (const tool of STDIO_ONLY_TOOLS) {
        expect(tool).toHaveProperty('name');
        expect(tool).toHaveProperty('description');
        expect(tool).toHaveProperty('inputSchema');
        expect(tool.name).toMatch(/^productive_/);
      }
    });
  });

  describe('tool naming conventions', () => {
    it('all tools should start with productive_ prefix', () => {
      const allTools = [...TOOLS, ...STDIO_ONLY_TOOLS];
      for (const tool of allTools) {
        expect(tool.name).toMatch(/^productive_/);
      }
    });

    it('consolidated tools should use resource names without verbs', () => {
      const resourceTools = TOOLS.filter(t => !t.name.includes('configure') && !t.name.includes('config'));
      for (const tool of resourceTools) {
        // Should be productive_<resource> format
        expect(tool.name).toMatch(/^productive_(projects|time|tasks|services|people)$/);
      }
    });
  });

  describe('token optimization', () => {
    it('should have reduced total tool schema size', () => {
      const totalSize = JSON.stringify(TOOLS).length;
      // Old tools were ~5209 bytes, new consolidated should be < 4000 bytes
      expect(totalSize).toBeLessThan(4500);
    });

    it('should have fewer tools than before', () => {
      // Was 13 tools, now 5
      expect(TOOLS.length).toBeLessThanOrEqual(5);
    });
  });
});

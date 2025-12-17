import fs from 'fs/promises';
import { existsSync } from 'fs';
import path from 'path';
import { app } from 'electron';
import { Project } from '../../shared/types';
import { PROJECT_FILE_EXTENSION, PROJECT_VERSION } from '../../shared/constants';
import { createLogger } from '../utils/logger';

const logger = createLogger('ProjectManager');

export class ProjectManager {
  private projectsDir: string;
  private autoSaveInterval: NodeJS.Timeout | null = null;
  private currentProject: { project: Project; path: string } | null = null;

  constructor() {
    this.projectsDir = path.join(app.getPath('documents'), 'VideoEditorProjects');
    this.initialize();
  }

  private async initialize() {
    try {
      await fs.mkdir(this.projectsDir, { recursive: true });
      logger.info('Projects directory initialized', { dir: this.projectsDir });
    } catch (error) {
      logger.error('Failed to initialize projects directory', error);
    }
  }

  /**
   * Save project to disk
   */
  async saveProject(project: Project, filePath?: string): Promise<string> {
    try {
      const savePath = filePath || (this.currentProject?.path ?? this.getDefaultPath(project.name));
      
      // Update project metadata
      project.updatedAt = Date.now();
      project.version = PROJECT_VERSION;

      // Ensure directory exists
      await fs.mkdir(path.dirname(savePath), { recursive: true });

      // Write project file
      await fs.writeFile(savePath, JSON.stringify(project, null, 2), 'utf-8');
      
      this.currentProject = { project, path: savePath };
      
      logger.info('Project saved', { name: project.name, path: savePath });
      return savePath;
    } catch (error) {
      logger.error('Failed to save project', { project: project.name, error });
      throw error;
    }
  }

  /**
   * Load project from disk
   */
  async loadProject(filePath: string): Promise<Project> {
    try {
      const data = await fs.readFile(filePath, 'utf-8');
      const project: Project = JSON.parse(data);
      
      // Version migration if needed
      if (project.version < PROJECT_VERSION) {
        await this.migrateProject(project);
      }

      this.currentProject = { project, path: filePath };
      
      logger.info('Project loaded', { name: project.name, path: filePath });
      return project;
    } catch (error) {
      logger.error('Failed to load project', { path: filePath, error });
      throw error;
    }
  }

  /**
   * Get current project
   */
  getCurrentProject(): Project | null {
    return this.currentProject?.project || null;
  }

  /**
   * Create new project
   */
  async createProject(name: string, template?: string): Promise<Project> {
    const project: Project = {
      id: `project_${Date.now()}`,
      name,
      version: PROJECT_VERSION,
      createdAt: Date.now(),
      updatedAt: Date.now(),
      timeline: {
        tracks: [],
        playheadPosition: 0,
        pixelsPerSecond: 10,
        duration: 0,
        isPlaying: false,
        selectedClipIds: [],
        editMode: 'ripple' as any,
        snapEnabled: true,
        snapThreshold: 5,
        magneticTimeline: false,
        markers: [],
        zoom: 1,
      },
      mediaLibrary: [],
      exportSettings: {
        format: 'mp4',
        codec: 'libx264',
        width: 1920,
        height: 1080,
        fps: 30,
        videoBitrate: '8M',
        audioBitrate: '192k',
        audioCodec: 'aac',
        hardwareAccel: 'software' as any,
        twoPass: false,
      },
      metadata: {
        notes: [],
      },
    };

    logger.info('Project created', { name });
    return project;
  }

  /**
   * Delete project
   */
  async deleteProject(filePath: string): Promise<void> {
    try {
      await fs.unlink(filePath);
      logger.info('Project deleted', { path: filePath });
    } catch (error) {
      logger.error('Failed to delete project', { path: filePath, error });
      throw error;
    }
  }

  /**
   * List all projects in directory
   */
  async listProjects(): Promise<Array<{ name: string; path: string; modifiedAt: number }>> {
    try {
      const files = await fs.readdir(this.projectsDir);
      const projects = [];

      for (const file of files) {
        if (file.endsWith(PROJECT_FILE_EXTENSION)) {
          const filePath = path.join(this.projectsDir, file);
          const stats = await fs.stat(filePath);
          projects.push({
            name: file.replace(PROJECT_FILE_EXTENSION, ''),
            path: filePath,
            modifiedAt: stats.mtimeMs,
          });
        }
      }

      return projects.sort((a, b) => b.modifiedAt - a.modifiedAt);
    } catch (error) {
      logger.error('Failed to list projects', error);
      return [];
    }
  }

  /**
   * Create project snapshot for versioning
   */
  async createSnapshot(project: Project): Promise<string> {
    try {
      const timestamp = new Date().toISOString().replace(/[:.]/g, '-');
      const snapshotName = `${project.name}_snapshot_${timestamp}${PROJECT_FILE_EXTENSION}`;
      const snapshotPath = path.join(this.projectsDir, 'snapshots', snapshotName);
      
      await fs.mkdir(path.dirname(snapshotPath), { recursive: true });
      await fs.writeFile(snapshotPath, JSON.stringify(project, null, 2), 'utf-8');
      
      logger.info('Snapshot created', { path: snapshotPath });
      return snapshotPath;
    } catch (error) {
      logger.error('Failed to create snapshot', error);
      throw error;
    }
  }

  /**
   * Start auto-save timer
   */
  startAutoSave(intervalMs: number, callback: () => Promise<void>) {
    this.stopAutoSave();
    this.autoSaveInterval = setInterval(async () => {
      try {
        await callback();
        logger.info('Auto-save completed');
      } catch (error) {
        logger.error('Auto-save failed', error);
      }
    }, intervalMs);
  }

  /**
   * Stop auto-save timer
   */
  stopAutoSave() {
    if (this.autoSaveInterval) {
      clearInterval(this.autoSaveInterval);
      this.autoSaveInterval = null;
    }
  }

  /**
   * Get default save path for project
   */
  private getDefaultPath(projectName: string): string {
    return path.join(this.projectsDir, `${projectName}${PROJECT_FILE_EXTENSION}`);
  }

  /**
   * Migrate project to current version
   */
  private async migrateProject(project: Project): Promise<void> {
    logger.info('Migrating project', { from: project.version, to: PROJECT_VERSION });
    // Add migration logic here for future versions
    project.version = PROJECT_VERSION;
  }

  /**
   * Export project as JSON
   */
  async exportProject(project: Project, exportPath: string): Promise<void> {
    try {
      await fs.writeFile(exportPath, JSON.stringify(project, null, 2), 'utf-8');
      logger.info('Project exported', { path: exportPath });
    } catch (error) {
      logger.error('Failed to export project', error);
      throw error;
    }
  }
}

// Singleton instance
let projectManagerInstance: ProjectManager | null = null;

export function getProjectManager(): ProjectManager {
  if (!projectManagerInstance) {
    projectManagerInstance = new ProjectManager();
  }
  return projectManagerInstance;
}

export default ProjectManager;
/**
 * DataFileManager - Manages multiple data files in the GitHub repository
 * Allows users to switch between data.json, data2.json, data3.json, etc.
 */

export interface DataFile {
  name: string; // e.g., "data.json", "data2.json"
  path: string; // e.g., "data/data.json", "data/data2.json"
  displayName: string; // e.g., "Data File 1", "Data File 2" or custom name
}

export class DataFileManager {
  private static instance: DataFileManager;
  private readonly STORAGE_KEY = "selected_data_file";
  private readonly CUSTOM_NAMES_KEY = "data_file_custom_names";
  private readonly DEFAULT_DATA_FILE = "data.json";
  private readonly DATA_FOLDER = "data";

  private constructor() {}

  static getInstance(): DataFileManager {
    if (!DataFileManager.instance) {
      DataFileManager.instance = new DataFileManager();
    }
    return DataFileManager.instance;
  }

  /**
   * Get the currently selected data file from localStorage
   */
  getCurrentDataFile(): string {
    if (typeof window === "undefined") {
      return this.DEFAULT_DATA_FILE;
    }

    const savedFile = localStorage.getItem(this.STORAGE_KEY);
    return savedFile || this.DEFAULT_DATA_FILE;
  }

  /**
   * Set the current data file and persist to localStorage
   */
  setCurrentDataFile(fileName: string): void {
    if (typeof window !== "undefined") {
      localStorage.setItem(this.STORAGE_KEY, fileName);
    }
  }

  /**
   * Get the full path for a data file
   */
  getDataFilePath(fileName: string): string {
    return `${this.DATA_FOLDER}/${fileName}`;
  }

  /**
   * Extract file number from data file name
   * e.g., "data.json" -> 1, "data2.json" -> 2, "data3.json" -> 3
   */
  private getFileNumber(fileName: string): number {
    const match = fileName.match(/^data(\d*)\.json$/);
    if (!match) return 1;
    return match[1] ? parseInt(match[1], 10) : 1;
  }

  /**
   * Generate next available data file name
   */
  getNextDataFileName(existingFiles: string[]): string {
    const numbers = existingFiles.map((f) => this.getFileNumber(f));
    const maxNumber = Math.max(0, ...numbers);
    const nextNumber = maxNumber + 1;

    return nextNumber === 1 ? "data.json" : `data${nextNumber}.json`;
  }

  /**
   * Get custom names mapping from localStorage
   */
  private getCustomNamesMap(): Record<string, string> {
    if (typeof window === "undefined") {
      return {};
    }

    const saved = localStorage.getItem(this.CUSTOM_NAMES_KEY);
    if (!saved) return {};

    try {
      return JSON.parse(saved);
    } catch {
      return {};
    }
  }

  /**
   * Save custom names mapping to localStorage
   */
  private saveCustomNamesMap(map: Record<string, string>): void {
    if (typeof window !== "undefined") {
      localStorage.setItem(this.CUSTOM_NAMES_KEY, JSON.stringify(map));
    }
  }

  /**
   * Set custom display name for a data file
   */
  setCustomDisplayName(fileName: string, customName: string): void {
    const map = this.getCustomNamesMap();
    const trimmedName = customName.trim();

    if (trimmedName) {
      map[fileName] = trimmedName;
    } else {
      delete map[fileName];
    }

    this.saveCustomNamesMap(map);
  }

  /**
   * Get display name for a data file (checks for custom name first)
   */
  getDisplayName(fileName: string): string {
    const customNames = this.getCustomNamesMap();

    // Return custom name if it exists
    if (customNames[fileName]) {
      return customNames[fileName];
    }

    // Fall back to default naming
    const number = this.getFileNumber(fileName);
    return `Data File ${number}`;
  }

  /**
   * Parse data file name to DataFile object
   */
  parseDataFile(fileName: string): DataFile {
    return {
      name: fileName,
      path: this.getDataFilePath(fileName),
      displayName: this.getDisplayName(fileName),
    };
  }

  /**
   * Get all available data files from a list
   */
  getAvailableDataFiles(fileNames: string[]): DataFile[] {
    return fileNames
      .filter((name) => this.isValidDataFileName(name))
      .sort((a, b) => this.getFileNumber(a) - this.getFileNumber(b))
      .map((name) => this.parseDataFile(name));
  }

  /**
   * Check if a file name is a valid data file name
   */
  isValidDataFileName(fileName: string): boolean {
    return /^data\d*\.json$/.test(fileName);
  }

  /**
   * Validate data file name format
   */
  validateDataFileName(fileName: string): { valid: boolean; error?: string } {
    if (!fileName) {
      return { valid: false, error: "File name is required" };
    }

    if (!this.isValidDataFileName(fileName)) {
      return {
        valid: false,
        error: 'File name must be in format "data.json" or "dataN.json"',
      };
    }

    return { valid: true };
  }

  /**
   * Create file name from number
   */
  createFileName(number: number): string {
    if (number < 1) {
      throw new Error("File number must be at least 1");
    }
    return number === 1 ? "data.json" : `data${number}.json`;
  }
}

// Export singleton instance
export const dataFileManager = DataFileManager.getInstance();

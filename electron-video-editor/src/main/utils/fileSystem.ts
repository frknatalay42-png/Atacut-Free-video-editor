import fs from 'fs';
import path from 'path';

export const readFile = (filePath: string): Promise<string> => {
    return new Promise((resolve, reject) => {
        fs.readFile(filePath, 'utf-8', (err, data) => {
            if (err) {
                return reject(err);
            }
            resolve(data);
        });
    });
};

export const writeFile = (filePath: string, data: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        fs.writeFile(filePath, data, 'utf-8', (err) => {
            if (err) {
                return reject(err);
            }
            resolve();
        });
    });
};

export const deleteFile = (filePath: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        fs.unlink(filePath, (err) => {
            if (err) {
                return reject(err);
            }
            resolve();
        });
    });
};

export const ensureDirectoryExists = (dirPath: string): Promise<void> => {
    return new Promise((resolve, reject) => {
        fs.mkdir(dirPath, { recursive: true }, (err) => {
            if (err) {
                return reject(err);
            }
            resolve();
        });
    });
};

export const getFileExtension = (filePath: string): string => {
    return path.extname(filePath);
};
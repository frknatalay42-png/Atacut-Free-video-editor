import { parentPort } from 'worker_threads';
import { exec } from 'child_process';
import path from 'path';

const runFFmpeg = (command: string) => {
    return new Promise((resolve, reject) => {
        exec(command, (error, stdout, stderr) => {
            if (error) {
                reject(`Error: ${stderr}`);
            } else {
                resolve(stdout);
            }
        });
    });
};

const handleFFmpegTask = async (task: { command: string }) => {
    try {
        const result = await runFFmpeg(task.command);
        parentPort?.postMessage({ status: 'success', result });
    } catch (error) {
        parentPort?.postMessage({ status: 'error', error });
    }
};

parentPort?.on('message', handleFFmpegTask);
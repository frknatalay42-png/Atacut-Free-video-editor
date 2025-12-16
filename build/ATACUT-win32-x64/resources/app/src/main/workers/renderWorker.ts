import { parentPort } from 'worker_threads';
import { exec } from 'child_process';
import path from 'path';

const renderVideo = (inputPath: string, outputPath: string, options: any) => {
    return new Promise((resolve, reject) => {
        const ffmpegCommand = `ffmpeg -i "${inputPath}" ${options} "${outputPath}"`;
        exec(ffmpegCommand, (error, stdout, stderr) => {
            if (error) {
                reject(`Error: ${stderr}`);
            } else {
                resolve(stdout);
            }
        });
    });
};

if (parentPort) {
    parentPort.on('message', async (data) => {
        const { inputPath, outputPath, options } = data;
        try {
            const result = await renderVideo(inputPath, outputPath, options);
            parentPort.postMessage({ status: 'success', result });
        } catch (error) {
            parentPort.postMessage({ status: 'error', error });
        }
    });
}
const { FsHandler } = require('./handlers');
const { exec } = require('child_process');
const { resolve } = require('path');
const PuppeteerMassScreenshots = require('puppeteer-mass-screenshots');

class PuppeteerVideoRecorder {
    config = {
        inputFrameRate: -1,
        outputFrameRate: 60,
        ffmpegPath: 'ffmpeg',
    };
    recordStartTime = -1;
    recordEndTime = -1;
    frames = 0;
    constructor(config){
        this.config = Object.assign({}, this.config, config || {});
        this.screenshots = new PuppeteerMassScreenshots();
        this.fsHandler = new FsHandler();
    }

    async init(page, outputFolder, fileName){
        if (!fileName) {
            fileName = Date.now() + '.webm';
        }
        this.frames = 0;
        this.recordStartTime = -1;
        this.recordEndTime = -1;
        this.page = page;
        this.outputFolder = resolve(process.cwd(), outputFolder);
        await this.fsHandler.init(this.outputFolder, fileName);
        const { imagesPath,imagesFilename, appendToFile } = this.fsHandler;
        await this.screenshots.init(page, imagesPath, {
            afterWritingImageFile: (filename) => {
                appendToFile(imagesFilename, `file '${filename}'\n`);
                this.frames += 1;
            }
        });
    }             

    start(options = {}) { 
        this.recordStartTime = Date.now();
        return this.screenshots.start(options);
    }
    
    async stop () {
    	await this.screenshots.stop();
        this.recordEndTime = Date.now();
    }

    get defaultFFMpegCommand() {
        const { imagesFilename, videoFilename } = this.fsHandler;
        // calculate inputFrameRate from frames over elapsed time if needed
        const inputFrameRate = this.config.inputFrameRate === -1 ?
            this.frames / ((this.recordEndTime - this.recordStartTime) / 1000) :
            this.config.inputFrameRate;
        return [
            this.config.ffmpegPath,
            `-r ${inputFrameRate}`,
            '-f concat',
            '-safe 0',
            `-i "${imagesFilename}"`,
            `-vf fps=${this.config.outputFrameRate}`,
            `"${videoFilename}"`
        ].join(' ');
    }

    createVideo(ffmpegCommand = '') {
        const _ffmpegCommand = ffmpegCommand || this.defaultFFMpegCommand;
        return new Promise((resolve, reject) => {
            exec(_ffmpegCommand, (error, stdout, stderr) => {
                if (error) {
                    reject(error);
                    return;
                }
                resolve([stdout, stderr]);
            });
        })
    }
}

module.exports = PuppeteerVideoRecorder;

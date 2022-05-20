const { FsHandler } = require('./handlers');
const { exec } = require('child_process');
const { resolve } = require('path');
const PuppeteerMassScreenshots = require('puppeteer-mass-screenshots');

class PuppeteerVideoRecorder {
    config = {
        frameRate: 60,
        ffmpegPath: 'ffmpeg',
    };
    constructor(config){
        this.config = Object.assign({}, this.config, config || {});
        this.screenshots = new PuppeteerMassScreenshots();
        this.fsHandler = new FsHandler();
    }

    async init(page, outputFolder, fileName){
        if (!fileName) {
            fileName = Date.now() + '.webm';
        }
        this.page = page;
        this.outputFolder = resolve(process.cwd(), outputFolder);
        await this.fsHandler.init(this.outputFolder, fileName);
        const { imagesPath,imagesFilename, appendToFile } = this.fsHandler;
        await this.screenshots.init(page, imagesPath, {
            afterWritingImageFile: (filename) => appendToFile(imagesFilename, `file '${filename}'\n`)
        });
    }             

    start(options = {}) { 
        return this.screenshots.start(options);
    }
    
    async stop () {
    	await this.screenshots.stop();
    	return this.createVideo();
    }

    get defaultFFMpegCommand() {
        const { imagesFilename, videoFilename } = this.fsHandler;
        return [
            this.config.ffmpegPath,
            '-f concat',
            '-safe 0',
            `-i ${imagesFilename}`,
            '-framerate ' + this.config.frameRate,
            videoFilename
        ].join(' ');
    }

    createVideo(ffmpegCommand = '') {
        const _ffmpegCommand = ffmpegCommand || this.defaultFFMpegCommand;
        exec(_ffmpegCommand, (error, stdout, stderr) => {
            if (error) throw new Error(error);
            console.log(stdout);
            console.log(stderr);
        });
    }
}

module.exports = PuppeteerVideoRecorder;

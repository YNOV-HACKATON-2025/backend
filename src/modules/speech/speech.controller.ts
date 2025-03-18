import {
  Controller,
  Logger,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { memoryStorage } from 'multer';
import * as path from 'path';
import { SpeechService } from './speech.service';

@Controller('speech')
export class SpeechController {
  private readonly logger = new Logger(SpeechController.name);
  constructor(private readonly speechService: SpeechService) {}

  @Post('transcribe')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: memoryStorage(),
      fileFilter: (req, file, cb) => {
        const allowedExtensions = ['.mp3', '.wav', '.flac', '.m4a'];
        const ext = path.extname(file.originalname).toLowerCase();
        if (allowedExtensions.includes(ext)) {
          cb(null, true);
        } else {
          cb(new Error('Unsupported file format'), false);
        }
      },
      limits: {
        fileSize: 25 * 1024 * 1024, // 25MB max file size
      },
    }),
  )
  async uploadAndTranscribe(@UploadedFile() file) {
    try {
      this.logger.log(`Processing uploaded file: ${file.originalname}`);

      // Process the file buffer directly - no need to save to disk
      const result = await this.speechService.transcribeAudioBuffer(
        file.buffer,
        path.extname(file.originalname).toLowerCase(),
      );

      return { transcription: result };
    } catch (error) {
      this.logger.error(`Transcription error: ${error.message}`);
      throw error;
    }
  }
}

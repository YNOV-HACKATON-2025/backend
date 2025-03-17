import {
  Controller,
  Logger,
  Post,
  UploadedFile,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import * as fs from 'fs';
import { diskStorage } from 'multer';
import * as path from 'path';
import { SpeechService } from './speech.service';

@Controller('speech')
export class SpeechController {
  private readonly logger = new Logger(SpeechController.name);
  constructor(private readonly speechService: SpeechService) {}

  @Post('transcribe')
  @UseInterceptors(
    FileInterceptor('file', {
      storage: diskStorage({
        destination: './tmp/uploads',
        filename: (req, file, cb) => {
          // Create uploads directory if it doesn't exist
          if (!fs.existsSync('./tmp/uploads')) {
            fs.mkdirSync('./tmp/uploads', { recursive: true });
          }
          const uniqueName = `upload-${Date.now()}${path.extname(file.originalname)}`;
          cb(null, uniqueName);
        },
      }),
      fileFilter: (req, file, cb) => {
        const allowedExtensions = ['.mp3', '.wav', '.flac'];
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
      this.logger.log(`Processing uploaded file: ${file.filename}`);

      // Use the actual file path from multer rather than constructing it
      const filePath = file.path;
      this.logger.log(`File path from multer: ${filePath}`);

      // Process the file
      const result = await this.speechService.transcribeAudio(filePath);

      // Clean up the file after processing
      this.cleanupFile(filePath);

      return { transcription: result };
    } catch (error) {
      // Make sure to clean up the file even if there's an error
      if (file && file.path) {
        this.cleanupFile(file.path);
      }
      throw error;
    }
  }

  /**
   * Cleanup uploaded files after processing
   */
  private cleanupFile(filePath: string): void {
    try {
      this.logger.log(`Attempting to clean up file: ${filePath}`);

      if (fs.existsSync(filePath)) {
        fs.unlinkSync(filePath);
        this.logger.log(`Deleted temporary file: ${filePath}`);
      } else {
        this.logger.warn(`File not found for deletion: ${filePath}`);
      }

      // Also check for any whisper-generated files
      const baseFileName = path.basename(filePath, path.extname(filePath));
      const directoryPath = path.dirname(filePath);

      this.logger.log(
        `Looking for generated files with base name: ${baseFileName} in directory: ${directoryPath}`,
      );

      // Whisper might create these files
      const possibleExtensions = ['.txt', '.vtt', '.srt', '.tsv', '.json'];

      // Also check for whisper output files in the current working directory
      const cwdPath = process.cwd();
      this.logger.log(`Also checking current working directory: ${cwdPath}`);

      possibleExtensions.forEach((ext) => {
        // Check in the same directory as the original file
        const potentialFile = path.join(directoryPath, `${baseFileName}${ext}`);
        if (fs.existsSync(potentialFile)) {
          fs.unlinkSync(potentialFile);
          this.logger.log(`Deleted generated file: ${potentialFile}`);
        }

        // Also check in the project root directory
        const potentialRootFile = path.join(cwdPath, `${baseFileName}${ext}`);
        if (fs.existsSync(potentialRootFile)) {
          fs.unlinkSync(potentialRootFile);
          this.logger.log(
            `Deleted generated file from project root: ${potentialRootFile}`,
          );
        }
      });
    } catch (error) {
      this.logger.error(`Error cleaning up files: ${error.message}`);
    }
  }
}

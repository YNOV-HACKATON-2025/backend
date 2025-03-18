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
import { RoomService } from '../room/room.service';
import {
  ApiTags,
  ApiOperation,
  ApiConsumes,
  ApiBody,
  ApiResponse,
} from '@nestjs/swagger';

@ApiTags('speech')
@Controller('speech')
export class SpeechController {
  private readonly logger = new Logger(SpeechController.name);
  constructor(
    private readonly speechService: SpeechService,
    private readonly roomService: RoomService,
  ) {}

  @Post('transcribe')
  @ApiOperation({ summary: 'Transcribe audio file to text' })
  @ApiConsumes('multipart/form-data')
  @ApiBody({
    schema: {
      type: 'object',
      properties: {
        file: {
          type: 'string',
          format: 'binary',
          description: 'Audio file to transcribe (.mp3, .wav, .flac, .m4a)',
        },
      },
    },
  })
  @ApiResponse({
    status: 200,
    description: 'Audio successfully transcribed',
    schema: {
      type: 'object',
      properties: {
        transcription: { type: 'string' },
        commandProcessed: { type: 'boolean' },
        commandResult: { type: 'object' },
      },
    },
  })
  @ApiResponse({
    status: 400,
    description: 'Bad request or unsupported file format',
  })
  @ApiResponse({ status: 500, description: 'Internal server error' })
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

      const result = await this.speechService.transcribeAudioBuffer(
        file.buffer,
        path.extname(file.originalname).toLowerCase(),
      );

      const commandResult = await this.roomService.processVoiceCommand(result);

      return {
        transcription: result,
        commandProcessed: commandResult.processed,
        commandResult: commandResult.result,
      };
    } catch (error) {
      this.logger.error(`Transcription error: ${error.message}`);
      throw error;
    }
  }
}

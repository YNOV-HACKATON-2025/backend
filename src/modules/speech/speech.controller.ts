import { BadRequestException, Controller } from '@nestjs/common';
import { SpeechService } from './speech.service';
import { FileInterceptor } from '@nestjs/platform-express';
import * as path from 'path';
import { diskStorage } from 'multer';

@Controller('speech')
export class SpeechController {
  constructor(private readonly speechService: SpeechService) {
  
  //   @Post('transcribe')
  //   @UseInterceptors(FileInterceptor('audio', {
  //     storage: diskStorage({
  //       destination: './uploads', // Stocker temporairement le fichier
  //       filename: (req, file, cb) => {
  //         const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1e9);
  //         cb(null, uniqueSuffix + path.extname(file.originalname));
  //       },
  //     }),
  //     fileFilter: (req, file, cb) => {
  //       if (!file.mimetype.startsWith('audio/')) {
  //         return cb(new BadRequestException('NotAudioFile'), false);
  //       }
  //       cb(null, true);
  //     }
  //   }))
  //   transcribeAudio(@UploadedFile() file: Express.Multer.File) {
  //     if (!file)
  //       throw new BadRequestException('Aucun fichier audio fourni');
  
  //     // Appeler le service pour traiter l'audio
  //     return await this.speechService.processAudio(file.path);
  //   }
  }
}


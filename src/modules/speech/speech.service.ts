import { Injectable, Logger } from '@nestjs/common';
import * as fs from 'fs';
import * as path from 'path';
import * as os from 'os';
import Groq from 'groq-sdk';
import 'dotenv/config';

@Injectable()
export class SpeechService {
  private readonly logger = new Logger(SpeechService.name);
  private readonly groq: Groq;

  constructor() {
    this.groq = new Groq({
      apiKey: process.env.GROQ_API_KEY,
    });
  }

  /**
   * Transcribe an audio buffer using Groq API
   * @param buffer The audio file buffer to transcribe
   * @param fileExtension The extension of the file (.mp3, .wav, etc.)
   * @returns Promise with the transcription result
   */
  async transcribeAudioBuffer(
    buffer: Buffer,
    fileExtension: string,
  ): Promise<string> {
    try {
      this.logger.log(`Processing audio buffer with format: ${fileExtension}`);

      if (['.mp3', '.wav', '.flac', '.m4a'].includes(fileExtension)) {
        // Create a temporary file to use with Groq API
        const tempDir = os.tmpdir();
        const tempFilePath = path.join(
          tempDir,
          `temp-audio-${Date.now()}${fileExtension}`,
        );

        // Write buffer to temporary file
        fs.writeFileSync(tempFilePath, buffer);

        try {
          // Use Groq API for transcription with file path
          const transcription = await this.groq.audio.transcriptions.create({
            file: fs.createReadStream(tempFilePath),
            model: 'whisper-large-v3-turbo',
            language: 'en',
            response_format: 'json',
            temperature: 0.0,
          });

          this.logger.log(`Transcription successful`);
          return transcription.text;
        } finally {
          // Clean up the temporary file
          if (fs.existsSync(tempFilePath)) {
            fs.unlinkSync(tempFilePath);
            this.logger.log(`Deleted temporary file: ${tempFilePath}`);
          }
        }
      } else {
        throw new Error(`Unsupported file format: ${fileExtension}`);
      }
    } catch (error) {
      this.logger.error(`Transcription error: ${error.message}`);
      throw new Error(`Failed to transcribe audio: ${error.message}`);
    }
  }

  /**
   * Legacy method for backward compatibility
   * @deprecated Use transcribeAudioBuffer instead
   */
  async transcribeAudio(audioFile: string): Promise<string> {
    try {
      const buffer = fs.readFileSync(audioFile);
      const fileExt = path.extname(audioFile).toLowerCase();
      return await this.transcribeAudioBuffer(buffer, fileExt);
    } catch (error) {
      this.logger.error(`Transcription error: ${error.message}`);
      throw new Error(`Failed to transcribe audio: ${error.message}`);
    }
  }
}

import { Injectable, Logger } from '@nestjs/common';
import { exec } from 'child_process';
import * as fs from 'fs';
import * as path from 'path';

@Injectable()
export class SpeechService {
  private readonly logger = new Logger(SpeechService.name);
  private readonly venvPath = '../../.venv'; // Python virtual environment path

  /**
   * Transcribe an audio file using Whisper
   * @param audioFile The path to the audio file to transcribe
   * @returns Promise with the transcription result
   */
  async transcribeAudio(audioFile: string): Promise<string> {
    try {
      // Ensure the file exists
      const audioPath = path.resolve(audioFile);

      this.logger.log(`Resolved audio path: ${audioPath}`);

      if (!fs.existsSync(audioPath)) {
        this.logger.error(`Audio file not found: ${audioPath}`);
        throw new Error(`Audio file not found: ${audioPath}`);
      }

      // Get the current working directory for later cleanup
      const cwd = process.cwd();
      this.logger.log(`Current working directory: ${cwd}`);

      // Build the command based on file type
      let command = '';

      // Determine the file extension
      const fileExt = path.extname(audioFile).toLowerCase();

      if (['.mp3', '.wav', '.flac'].includes(fileExt)) {
        // Use --output_dir to specify where whisper should output files
        const outputDir = path.dirname(audioPath);

        // Activate venv and run Whisper with output directory specified
        if (process.platform === 'win32') {
          command = `cd ${outputDir} && ${this.venvPath}\\Scripts\\activate && whisper "${audioPath}" --model turbo --output_dir "${outputDir}"`;
        } else {
          command = `cd ${outputDir} && source ${this.venvPath}/bin/activate && whisper "${audioPath}" --model turbo --output_dir "${outputDir}"`;
        }

        this.logger.log(`Executing command: ${command}`);
      } else {
        throw new Error(`Unsupported file format: ${fileExt}`);
      }

      // Execute the command and return the cleaned result
      const rawOutput = await this.executeCommand(command);
      return this.cleanTranscriptionOutput(rawOutput);
    } catch (error) {
      this.logger.error(`Transcription error: ${error.message}`);
      throw new Error(`Failed to transcribe audio: ${error.message}`);
    }
  }

  /**
   * Clean up the transcription output to return only the actual speech content
   * @param rawOutput The raw output from Whisper
   * @returns Cleaned transcription text
   */
  private cleanTranscriptionOutput(rawOutput: string): string {
    this.logger.debug(`Raw output: ${rawOutput}`);

    // Extract just the actual transcription content
    // Pattern to match: [timestamp --> timestamp] actual content
    const transcriptionRegex =
      /\[\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}\.\d{3}\]\s+(.*)/g;
    let cleanedOutput = '';
    let match;

    while ((match = transcriptionRegex.exec(rawOutput)) !== null) {
      if (match[1] && match[1].trim()) {
        cleanedOutput += match[1].trim() + ' ';
      }
    }

    // If regex failed to match, try another approach - look for content after language detection
    if (!cleanedOutput.trim()) {
      const lines = rawOutput.split('\n');
      for (let i = 0; i < lines.length; i++) {
        // Skip lines with language detection messages
        if (
          lines[i].includes('Detecting language') ||
          lines[i].includes('Detected language:')
        ) {
          continue;
        }

        // Remove timestamp patterns
        const withoutTimestamps = lines[i]
          .replace(/\[\d{2}:\d{2}\.\d{3} --> \d{2}:\d{2}\.\d{3}\]/g, '')
          .trim();
        if (withoutTimestamps) {
          cleanedOutput += withoutTimestamps + ' ';
        }
      }
    }

    const result = cleanedOutput.trim();
    this.logger.log(`Cleaned output: ${result}`);
    return result;
  }

  /**
   * Execute a shell command and return the output
   * @param command The command to execute
   * @returns Promise with the command output
   */
  private executeCommand(command: string): Promise<string> {
    return new Promise((resolve, reject) => {
      exec(command, (error, stdout, stderr) => {
        if (error) {
          this.logger.error(`Error executing command: ${stderr}`);
          reject(error);
          return;
        }
        this.logger.log(`Command executed successfully`);
        resolve(stdout.trim());
      });
    });
  }
}

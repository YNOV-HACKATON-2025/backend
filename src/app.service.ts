import { Injectable } from '@nestjs/common';

@Injectable()
export class AppService {
  config(): string {
    return 'Version 1.0.0';
  }
}

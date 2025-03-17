import { Module } from '@nestjs/common';
import { AuthentificationService } from './authentification.service';
import { AuthentificationController } from './authentification.controller';

@Module({
  controllers: [AuthentificationController],
  providers: [AuthentificationService],
})
export class AuthentificationModule {}

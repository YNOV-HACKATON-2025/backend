import { Module } from '@nestjs/common';
import { AppController } from './app.controller';
import { AppService } from './app.service';
import { AuthentificationModule } from './modules/authentification/authentification.module';

@Module({
  imports: [AuthentificationModule],
  controllers: [AppController],
  providers: [AppService],
})
export class AppModule {}

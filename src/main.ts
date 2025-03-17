import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { initializeApp } from 'firebase/app';
import { getAuth } from 'firebase/auth';
import { getFirestore } from 'firebase/firestore';

const firebaseConfig = {
  apiKey: 'AIzaSyBryUOt9ITqrNB-JrRHyHKRCQNaMINg_iA',
  authDomain: 'ynov-hackathon25-gr3.firebaseapp.com',
  projectId: 'ynov-hackathon25-gr3',
  storageBucket: 'ynov-hackathon25-gr3.firebasestorage.app',
  messagingSenderId: '914001134860',
  appId: '1:914001134860:web:80e688ad9e57dff57e3529',
  measurementId: 'G-3EV8MQQXCG',
};

async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  await app.listen(process.env.PORT ?? 3000);
}
export const firebaseApp = initializeApp(firebaseConfig);
export const auth = getAuth(firebaseApp);
export const db = getFirestore(firebaseApp);
bootstrap();

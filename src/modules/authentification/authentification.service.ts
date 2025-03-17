import { Injectable } from '@nestjs/common';
import { CreateAuthentificationDto } from './dto/create-authentification.dto';
import { UpdateAuthentificationDto } from './dto/update-authentification.dto';
import { doc, setDoc, getDoc } from 'firebase/firestore';
import { createUserWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from 'src/main';

@Injectable()
export class AuthentificationService {
  async create(createAuthentificationDto: CreateAuthentificationDto) {
    console.log(createAuthentificationDto);

    const userCredential = await createUserWithEmailAndPassword(
      auth,
      createAuthentificationDto.email,
      createAuthentificationDto.password,
    );

    const userRef = doc(db, 'users', userCredential.user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      await setDoc(userRef, {
        _uid: userCredential.user.uid,
        username: createAuthentificationDto.username,
        email: userCredential.user.email,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      // Réponse de succès
      return 'ok';
    } else {
      return 'error';
    }
  }

  findAll() {
    return `This action returns all authentification`;
  }

  findOne(id: number) {
    return `This action returns a #${id} authentification`;
  }

  update(id: number, updateAuthentificationDto: UpdateAuthentificationDto) {
    return `This action updates a #${id} authentification`;
  }

  remove(id: number) {
    return `This action removes a #${id} authentification`;
  }
}

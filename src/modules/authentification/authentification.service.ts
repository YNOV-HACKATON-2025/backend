import { HttpException, HttpStatus, Injectable } from '@nestjs/common';
import { CreateAuthentificationDto } from './dto/create-authentification.dto';
import { UpdateAuthentificationDto } from './dto/update-authentification.dto';
import { doc, setDoc, getDoc, collection, query, where, getDocs } from "firebase/firestore";
import { createUserWithEmailAndPassword, signInWithEmailAndPassword } from 'firebase/auth';
import { auth, db } from 'src/main';
import { LoginDto } from './dto/login.dto';

@Injectable()
export class AuthentificationService {
  async create(createAuthentificationDto: CreateAuthentificationDto) {
    const usersRef = collection(db, "users");
    const q = query(usersRef, where("email", "==", createAuthentificationDto.email));
    const querySnapshot = await getDocs(q);
    if(!querySnapshot.empty) throw new HttpException('UserAlreadyExist', HttpStatus.BAD_REQUEST);
    
    const userCredential = await createUserWithEmailAndPassword(
      auth,
      createAuthentificationDto.email,
      createAuthentificationDto.password
    );

    const userRef = doc(db, "users", userCredential.user.uid);
    const userDoc = await getDoc(userRef);

    if (!userDoc.exists()) {
      await setDoc(userRef, {
        _uid: userCredential.user.uid,
        username: createAuthentificationDto.username,
        email: userCredential.user.email,
        createdAt: new Date(),
        updatedAt: new Date(),
      });

      return {
        statusCode: 200,
        message: 'Succes'
      };
    } else {
      if(!querySnapshot.empty) throw new HttpException('FailedToInsertUser', HttpStatus.BAD_REQUEST);
    }
  }

  findAll() {
    return `This action returns all authentification`;
  }

  async findOne(loginDto: LoginDto) {
    const userCredential = await signInWithEmailAndPassword(auth, loginDto.email, loginDto.password);
    return userCredential;
  }

  update(id: number, updateAuthentificationDto: UpdateAuthentificationDto) {
    return `This action updates a #${id} authentification`;
  }

  remove(id: number) {
    return `This action removes a #${id} authentification`;
  }
}

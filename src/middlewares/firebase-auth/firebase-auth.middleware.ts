import {
  Injectable,
  NestMiddleware,
  UnauthorizedException,
} from '@nestjs/common';
import * as admin from 'firebase-admin';

@Injectable()
export class FirebaseAuthMiddleware implements NestMiddleware {
  async use(req: any, res: any, next: () => void) {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      throw new UnauthorizedException('Aucun token fourni');
    }

    const idToken = authHeader.split(' ')[1];

    try {
      const decodedToken = await admin.auth().verifyIdToken(idToken);
      console.log(decodedToken);
      req['user'] = decodedToken;
      const userRef = admin
        .firestore()
        .collection('users')
        .doc(decodedToken.uid);
      const userSnapshot = await userRef.get();
      if (userSnapshot.exists) {
        req['user'] = { ...req['user'], ...userSnapshot.data() };
      } else {
        throw new UnauthorizedException('UserDoesNotExist');
      }
      next(); 
    } catch (error) {
      if (error.code === 'auth/id-token-expired') {
        throw new UnauthorizedException('TokenExpired');
      } else if (error.code === 'auth/argument-error') {
        throw new UnauthorizedException('TokenInvalid');
      } else {
        throw new UnauthorizedException('TokenError');
      }
    }
    next();
  }
}

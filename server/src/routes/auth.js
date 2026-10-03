import {Router} from 'express';
import {register,login,deleteAccount} from '../controllers/authController.js';
import {auth} from '../middleware/auth.js';
const r=Router();
r.post('/register',register);
r.post('/login',login);
r.delete('/account',auth,deleteAccount);
export default r;

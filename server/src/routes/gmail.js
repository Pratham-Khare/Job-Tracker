import {Router} from 'express';
import {auth} from '../middleware/auth.js';
import {connect,callback,status,disconnect} from '../controllers/gmailController.js';
const r=Router();
r.get('/callback',callback);
r.use(auth);
r.get('/connect',connect);r.get('/status',status);r.post('/disconnect',disconnect);
export default r;

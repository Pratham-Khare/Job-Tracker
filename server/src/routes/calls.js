import {Router} from 'express';
import {list,create,update,remove} from '../controllers/callController.js';
import {auth} from '../middleware/auth.js';
const r=Router();r.use(auth);r.get('/',list);r.post('/',create);r.patch('/:id',update);r.delete('/:id',remove);export default r;

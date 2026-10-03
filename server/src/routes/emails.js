import {Router} from 'express';
import {list,detail,send,sendDraft,sendFollowUp,trackOpen,trackClick} from '../controllers/emailController.js';
import {auth} from '../middleware/auth.js';
const r=Router();
r.get('/track/:trackingId',trackOpen);
r.get('/click/:token',trackClick);
r.use(auth);
r.get('/',list);r.get('/:id',detail);r.post('/send',send);r.post('/:id/send-draft',sendDraft);r.post('/:id/follow-up',sendFollowUp);
export default r;

import 'dotenv/config';
import express from 'express';
import cors from 'cors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import morgan from 'morgan';
import {connectDB} from './config/db.js';
import {errorHandler} from './middleware/error.js';
import auth from './routes/auth.js';
import applications from './routes/applications.js';
import jobs from './routes/jobs.js';
import companies from './routes/companies.js';
import contacts from './routes/contacts.js';
import emails from './routes/emails.js';
import templates from './routes/templates.js';
import notifications from './routes/notifications.js';
import dashboard from './routes/dashboard.js';
import calls from './routes/calls.js';
import {importExcel,previewExcel} from './controllers/importController.js';
import multer from 'multer';
import {startFollowUpWorker} from './services/followUpWorker.js';
import {auth as authImport} from './middleware/auth.js';
import gmail from './routes/gmail.js';
import {startGmailReplyWorker} from './services/gmailReplyWorker.js';

if (!process.env.MONGO_URI) process.env.MONGO_URI = 'mongodb://127.0.0.1:27017/job_tracker';
if (!process.env.JWT_SECRET) process.env.JWT_SECRET = 'jobtrack-local-development-secret-change-in-production';

const app=express();
app.use(helmet({crossOriginResourcePolicy:false}));
const allowedOrigins = [
  'http://localhost:5173',
  'https://job-tracker-ten-red.vercel.app'
];

app.use(cors({
  origin: function (origin, callback) {
    if (!origin || allowedOrigins.includes(origin)) {
      callback(null, true);
    } else {
      callback(new Error('Not allowed by CORS'));
    }
  },
  credentials: true
}));app.use(morgan('combined'));
app.use(rateLimit({windowMs:15*60*1000,max:300,standardHeaders:true,legacyHeaders:false}));
app.get('/api/health',(req,res)=>res.json({ok:true,service:'job-tracker'}));
app.get('/api/tracking/health',(req,res)=>{const base=process.env.SERVER_PUBLIC_URL||'http://localhost:5000';res.json({ok:true,publicUrl:base,publiclyReachable:!/(localhost|127\.0\.0\.1)/i.test(base),message:/(localhost|127\.0\.0\.1)/i.test(base)?'Tracking will not receive external email events until SERVER_PUBLIC_URL is a public HTTPS URL.':'Tracking endpoint configured for a public URL.'})});

app.use(express.json({limit:'1mb'}));
app.use('/api/auth',auth);
app.use('/api/applications',applications);
app.use('/api/jobs',jobs);
app.use('/api/companies',companies);
app.use('/api/contacts',contacts);
app.use('/api/emails',emails);
app.use('/api/templates',templates);
app.use('/api/gmail',gmail);
app.use('/api/notifications',notifications);
app.use('/api/dashboard',dashboard);
app.use('/api/calls',calls);
const uploadExcel=multer({storage:multer.memoryStorage(),limits:{fileSize:10*1024*1024}}).single('file');
app.post('/api/import/preview',authImport,uploadExcel,previewExcel);
app.post('/api/import/excel',authImport,uploadExcel,importExcel);
app.use(errorHandler);
const port=Number(process.env.PORT||5000);

async function start(){
  try{
    await connectDB();
    app.listen(port,()=>console.log(`\nJobTrack API running at http://localhost:${port}\nMongoDB connected\n`));
    startFollowUpWorker();
    startGmailReplyWorker();
  }catch(e){
    console.error('\nJobTrack backend could not start.');
    console.error('MongoDB connection failed:', e.message);
    console.error('Make sure MongoDB is running and MONGO_URI is correct.');
    process.exit(1);
  }
}
start();

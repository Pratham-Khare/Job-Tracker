import axios from 'axios';

const api=axios.create({baseURL:import.meta.env.VITE_API_URL||'http://localhost:5000/api'});

api.interceptors.request.use(c=>{
  const t=localStorage.getItem('token');
  if(t)c.headers.Authorization=`Bearer ${t}`;
  return c;
});

api.interceptors.response.use(
  r=>r,
  error=>{
    if(!error.response && error.request){
      error.userMessage='Cannot reach JobTrack backend at http://localhost:5000. Start the server with npm run dev in the server folder.';
    }
    return Promise.reject(error);
  }
);

export default api;

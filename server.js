import http from 'node:http';import {createReadStream,existsSync} from 'node:fs';import path from 'node:path';import crypto from 'node:crypto';import {fileURLToPath} from 'node:url';import {MemoryStore,PostgresStore} from './database.js';
const root=path.dirname(fileURLToPath(import.meta.url));
const mime={'.html':'text/html','.js':'text/javascript','.css':'text/css','.svg':'image/svg+xml','.json':'application/json'};
const basePlan=()=>({members:[{id:'m1',name:'Alex',age:38,role:'adult',experience:'Intermediate',abilities:'All standard movements',restrictions:'Sensitive right shoulder',goals:'Build strength · improve energy',privateGoal:'Gradual weight management'},{id:'m2',name:'Maya',age:11,role:'child',experience:'Beginner',abilities:'Squat, hinge and run comfortably',restrictions:'No known restrictions',goals:'Feel strong · learn good form',privateGoal:''},{id:'m3',name:'Leo',age:8,role:'child',experience:'New',abilities:'Bodyweight movements',restrictions:'No known restrictions',goals:'Have fun · improve coordination',privateGoal:''}],equipment:[['Dumbbells','5, 10, 20 lb',6,1],['Kettlebells','18, 26 lb',2,1],['Resistance bands','Light, medium',3,1],['Jump ropes','Adjustable',2,1],['Barbells','',0,0],['Plates','',0,0],['Racks','',0,0],['Benches','',0,0],['Rowers','',0,0],['Bikes','',0,0],['Medicine balls','',0,0]].map(([name,detail,qty,on])=>({name,detail,qty,on:!!on})),week:[{day:'MON',date:'14',title:'Full-body foundations',duration:34,status:'Ready',participants:['m1','m2','m3'],blocks:[{type:'WARM-UP',title:'Move & prepare',time:'6 min',items:[{exercise:'Easy jump rope',prescription:'3 × 45 sec',rest:'15 sec',alts:'March in place',member:'Family'},{exercise:'World’s greatest stretch',prescription:'4 / side',rest:'—',alts:'Supported lunge stretch',member:'Family'}]},{type:'STRENGTH',title:'Hinge + push',time:'14 min',items:[{exercise:'Kettlebell deadlift',prescription:'3 × 8',rest:'60 sec',alts:'Dumbbell / elevated hinge',member:'Alex · 26 lb'},{exercise:'Kettlebell deadlift',prescription:'3 × 6, technique',rest:'60 sec',alts:'Light DB hinge',member:'Maya · 10 lb'},{exercise:'Backpack deadlift',prescription:'3 × 6, technique',rest:'60 sec',alts:'Hip hinge to wall',member:'Leo · light'}]},{type:'CONDITIONING',title:'Team relay',time:'9 min',items:[{exercise:'30 sec move / 30 sec rest',prescription:'3 rounds each',rest:'Shared-equipment handoff',alts:'Bike / fast march / rope',member:'Family'}]},{type:'COOLDOWN',title:'Breathe & reset',time:'5 min',items:[{exercise:'Child’s pose + box breathing',prescription:'5 min easy',rest:'—',alts:'Seated breathing',member:'Family'}]}]},{day:'TUE',date:'15',title:'Play & mobility',duration:22,status:'Ready',participants:['m2','m3'],blocks:[]},{day:'WED',date:'16',title:'Rest day',duration:0,status:'Rest',participants:[],blocks:[]},{day:'THU',date:'17',title:'Strength circuit',duration:36,status:'Draft',participants:['m1','m2'],blocks:[]},{day:'FRI',date:'18',title:'Family intervals',duration:28,status:'Ready',participants:['m1','m2','m3'],blocks:[]},{day:'SAT',date:'19',title:'Outdoor adventure',duration:45,status:'Flexible',participants:['m1','m2','m3'],blocks:[]},{day:'SUN',date:'20',title:'Rest day',duration:0,status:'Rest',participants:[],blocks:[]}],history:[{date:'Sep 12',title:'Family circuit',duration:'31 min',people:'3 members',note:'Everyone finished feeling good'},{date:'Sep 10',title:'Technique day',duration:'26 min',people:'Alex + Maya',note:'Kept loads steady; form improved'}]});
const hash=(p,s=crypto.randomBytes(16).toString('hex'))=>({salt:s,hash:crypto.scryptSync(p,s,64).toString('hex')});
const token=()=>crypto.randomBytes(32).toString('hex');
const json=(res,status,payload)=>{res.writeHead(status,{'content-type':'application/json'});res.end(JSON.stringify(payload))};
async function body(req){let value='';for await(const chunk of req)value+=chunk;return JSON.parse(value||'{}')}
const defaultStore=()=>process.env.NODE_ENV==='test'?new MemoryStore():new PostgresStore();

export function createRequestHandler({store=defaultStore(),serveStatic=true}={}){
  return async(req,res)=>{try{
    const pathname=new URL(req.url,'http://localhost').pathname;
    if(pathname==='/api/register'&&req.method==='POST'){
      const input=await body(req),email=String(input.email||'').trim().toLowerCase();
      if(!email||String(input.password||'').length<8)return json(res,400,{error:'Use an email and at least 8 characters'});
      if(await store.findByEmail(email))return json(res,409,{error:'Account already exists'});
      const password=hash(input.password),user={id:crypto.randomUUID(),email,...password,token:token(),data:basePlan()};
      try{await store.create(user)}catch(error){if(error.code==='23505')return json(res,409,{error:'Account already exists'});throw error}
      return json(res,200,{token:user.token,email});
    }
    if(pathname==='/api/login'&&req.method==='POST'){
      const input=await body(req),user=await store.findByEmail(String(input.email||'').trim().toLowerCase());
      const supplied=hash(input.password||'',user?.salt||'invalid').hash;
      if(!user||!crypto.timingSafeEqual(Buffer.from(supplied,'hex'),Buffer.from(user.hash,'hex')))return json(res,401,{error:'Invalid email or password'});
      const sessionToken=token();await store.updateToken(user.id,sessionToken);
      return json(res,200,{token:sessionToken,email:user.email});
    }
    if(pathname==='/api/data'){
      const sessionToken=(req.headers.authorization||'').replace(/^Bearer /,'');
      const user=await store.findByToken(sessionToken);
      if(!user)return json(res,401,{error:'Please sign in'});
      if(req.method==='GET')return json(res,200,user.data);
      if(req.method==='PUT'){await store.updateData(user.id,await body(req));return json(res,200,{ok:true})}
      return json(res,405,{error:'Method not allowed'});
    }
    if(!serveStatic)return json(res,404,{error:'Not found'});
    const requested=pathname==='/'?'/index.html':pathname;
    const normalized=path.normalize(requested).replace(/^\.\.(\/|\\)/,'');
    const file=path.join(root,'public',normalized);
    if(!file.startsWith(path.join(root,'public'))||!existsSync(file)){res.writeHead(404);return res.end('Not found')}
    res.writeHead(200,{'content-type':mime[path.extname(file)]||'application/octet-stream'});createReadStream(file).pipe(res);
  }catch(error){console.error(error);json(res,500,{error:'Server error'})}};
}

export function createServer(options){return http.createServer(createRequestHandler(options))}
if(process.argv[1]&&path.resolve(process.argv[1])===fileURLToPath(import.meta.url))createServer().listen(process.env.PORT||3001,()=>console.log(`KinFit running at http://localhost:${process.env.PORT||3001}`));

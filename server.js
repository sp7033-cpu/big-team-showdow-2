import express from 'express';
import {createServer} from 'node:http';
import {Server} from 'socket.io';
import crypto from 'node:crypto';
const app=express();const http=createServer(app);const io=new Server(http,{cors:{origin:false}});app.use(express.static('public'));
app.get('/', (req, res) => {
  res.sendFile('index.html', { root: process.cwd() });
});
const teams=['Blue Lightning','Green Giants','Red Rockets','Purple Power','Orange Ninjas','Yellow Sparks'];
const questions=[
['Emoji Office','What workplace situation do these emojis represent? 📅📅📅😵',['Meeting overload','Annual leave','Project launch','Training day'],0],
['Emoji Office','Decode this office phrase: 🔥🚒📧',['Fire drill','Urgent email firefighting','Office evacuation','Email archiving'],1],
['Emoji Office','What does this represent? 🏠💻☕',['Office relocation','Working from home','Coffee break','IT maintenance'],1],
['Process Detective','A process has 12 approval steps and takes weeks. What is the first sensible improvement action?',['Add more approvals','Map and examine the process','Buy new software','Skip all checks'],1],
['Process Detective','Which tool is most associated with exploring potential root causes?',['Fishbone diagram','Gantt chart','Calendar','Organisation chart'],0],
['Process Detective','A team receives 100 complaints, and 70 relate to just two issues. Which principle might help prioritise?',["Parkinson's Law",'Pareto principle',"Murphy's Law",'Law of averages'],1],
['Workplace Brain Blitz','Which of these is NOT a standard phase of DMAIC?',['Define','Measure','Invent','Control'],2],
['Workplace Brain Blitz',"What does the 'P' in PDCA stand for?",['Perform','Plan','Prioritise','Publish'],1],
['Workplace Brain Blitz','Which approach is generally best when improving a process?',['Assume the cause','Ask only managers','Understand the current process first','Add more handoffs'],2],
['Final Showdown','Which workplace frustration would you eliminate forever? (Opinion poll)',['Unnecessary meetings','Slow systems','Duplicate data entry','Unclear responsibilities'],-1],
['Final Showdown','A process takes 10 days, but only 2 days add value. What percentage is value-adding time?',['10%','20%','50%','80%'],1],
['Final Showdown','Which is the best example of continuous improvement?',['Making one huge change and stopping','Regularly testing and refining small changes','Adding checks everywhere','Changing a process without feedback'],1]];
const sessions=new Map();const clean=s=>String(s||'').trim().slice(0,24);
function snapshot(g,host=false){const ps=[...g.players.values()];const scores=teams.map((name,i)=>{const p=ps.filter(x=>x.team===i);return {name,count:p.length,score:p.length?Math.round(p.reduce((a,x)=>a+x.score,0)/p.length):0}});const q=questions[g.index];return {pin:g.pin,status:g.status,index:g.index,question:q?{round:q[0],text:q[1],options:q[2],points:g.index>=9?200:100}:null,answer:g.status==='reveal'?q?.[3]:undefined,teams:scores,playerCount:ps.length,answered:g.answers.size,players:host?ps.map(x=>({name:x.name,team:x.team,score:x.score})):undefined,seconds:g.seconds,deadline:g.deadline};}
function broadcast(g){io.to(g.pin).emit('state',snapshot(g));io.to('host:'+g.pin).emit('host-state',snapshot(g,true));}
function newPin(){let pin;do{pin=String(100000+crypto.randomInt(900000))}while(sessions.has(pin));return pin}
function schedule(g){clearTimeout(g.timer);if(g.status!=='question')return;g.deadline=Date.now()+g.seconds*1000;g.timer=setTimeout(()=>{if(g.status==='question'){g.status='reveal';broadcast(g)}},g.seconds*1000)}
io.on('connection',socket=>{
 socket.on('create',(_,cb)=>{const pin=newPin(),secret=crypto.randomBytes(24).toString('hex');const g={pin,secret,status:'lobby',index:-1,players:new Map(),answers:new Map(),seconds:18,deadline:null,timer:null};sessions.set(pin,g);socket.join(pin);socket.join('host:'+pin);socket.data.host=pin;cb?.({ok:true,pin,secret});broadcast(g)});
 socket.on('resume-host',({pin,secret},cb)=>{const g=sessions.get(pin);if(!g||g.secret!==secret)return cb?.({error:'Invalid host credentials'});socket.join(pin);socket.join('host:'+pin);socket.data.host=pin;cb?.({ok:true});broadcast(g)});
 socket.on('join',({pin,name,token},cb)=>{const g=sessions.get(String(pin));if(!g)return cb?.({error:'Room not found'});let p=token&&g.players.get(token);if(!p){if(g.status!=='lobby')return cb?.({error:'Game has started; ask the host to reopen the lobby'});if(g.players.size>=50)return cb?.({error:'Room is full'});const n=clean(name);if(!n)return cb?.({error:'Enter a nickname'});const counts=teams.map((_,i)=>[...g.players.values()].filter(x=>x.team===i).length),min=Math.min(...counts),choices=counts.map((c,i)=>c===min?i:-1).filter(i=>i>=0);p={token:crypto.randomBytes(18).toString('hex'),name:n,team:choices[crypto.randomInt(choices.length)],score:0};g.players.set(p.token,p)}socket.data.player=p.token;socket.data.pin=g.pin;socket.join(g.pin);cb?.({ok:true,token:p.token,team:teams[p.team],name:p.name});broadcast(g)});
 socket.on('answer',({pin,token,option},cb)=>{const g=sessions.get(String(pin)),p=g?.players.get(token);if(!g||!p||g.status!=='question'||!Number.isInteger(option)||option<0||option>3||g.answers.has(token)||Date.now()>g.deadline)return cb?.({error:'Answer not accepted'});g.answers.set(token,option);const correct=questions[g.index][3];if(correct===-1||correct===option)p.score+=g.index>=9?(correct===-1?100:200):100;cb?.({ok:true});broadcast(g)});
 socket.on('host-action',({pin,secret,action},cb)=>{const g=sessions.get(String(pin));if(!g||g.secret!==secret)return cb?.({error:'Not authorised'});clearTimeout(g.timer);if(action==='next'){if(g.status==='lobby'||g.status==='reveal'){g.index++;g.answers.clear();g.status=g.index>=questions.length?'results':'question';if(g.status==='question')schedule(g)}else return cb?.({error:'Reveal the answer before continuing'})}else if(action==='reveal'&&g.status==='question'){g.status='reveal';g.deadline=null}else if(action==='reopen'&&g.status==='lobby'){}else if(action==='reset'){g.index=-1;g.status='lobby';g.answers.clear();g.players.clear();g.deadline=null}else return cb?.({error:'Action unavailable'});broadcast(g);cb?.({ok:true})});
 socket.on('sync',({pin})=>{const g=sessions.get(String(pin));if(g){socket.join(g.pin);broadcast(g)}});
});
app.get('/health',(_,res)=>res.json({ok:true,sessions:sessions.size}));
const port=process.env.PORT||3000;http.listen(port,()=>console.log('Game listening on '+port));

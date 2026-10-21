// A browser-only illustration of the product loop. Never connects to Firebase,
// requests permissions, accepts payments, or persists visitor data.
const screen = document.querySelector('#screen');
const icons = {
  home: '<path d="m3 10 9-7 9 7v11h-6v-7H9v7H3z"/>',
  pacts: '<path d="M5 22V3h14l-3 5 3 5H5"/>',
  chats: '<path d="M3 3h18v14H8l-5 4z"/>',
  profile: '<circle cx="12" cy="7" r="4"/><path d="M4 22v-3a8 8 0 0 1 16 0v3"/>'
};
const svg = key => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true">${icons[key]}</svg>`;
const escape = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fresh = () => ({pact:null, balance:150, friendBalance:150, ledger:[]});
let state = fresh();
const goals = ['Walk 6,000 steps today', 'Read 20 pages today', 'Finish a 30-minute workout'];
const stage = () => !state.pact ? 0 : ({pending:1,active:2,review:3,approved:4,rejected:4,declined:1}[state.pact.status]);
const progress = () => `<div class="step" aria-label="Step ${Math.min(stage()+1,4)} of 4: propose, accept, submit, review">${[0,1,2,3].map(i=>`<span class="${i<=stage()?'done':''}"></span>`).join('')}</div>`;
const button = (action, text, style='primary') => `<button type="button" class="${style}" data-action="${action}">${text}</button>`;
const hint = text => `<p class="instruction">${text}</p>`;
const people = () => '<div class="people"><span class="avatar">YO</span><span class="avatar friend">SA</span> You commit · Sam verifies</div>';
const label = status => ({pending:'Awaiting Sam',active:'Active',review:'Proof in review',approved:'Completed',rejected:'Not verified',declined:'Declined'}[status]);
function card() {
  const p = state.pact;
  return `<div class="card"><div class="card-top"><span class="pill ${p.status==='pending'?'pending':['rejected','declined'].includes(p.status)?'failed':''}">${label(p.status)}</span><span class="stake">${p.stake} Pts staked</span></div><h2>${escape(p.goal)}</h2>${people()}<p class="subtle">Verification: sample photo + friend review</p>${p.status==='pending'?button('proposal','View invitation'):p.status==='active'?button('submit','Submit sample proof'):p.status==='review'?button('review','Review as Sam'):['approved','rejected'].includes(p.status)?button('result','See the outcome','secondary'):button('create','Try another pact','secondary')}</div>`;
}
function home() {
  return `<p class="eyebrow">Your accountability circle</p><h1>Small goals.<br>Real follow-through.</h1><p class="subtle">A little support. A little stake. Someone in your corner.</p>${progress()}${state.pact?card():`<div class="card"><span class="pill">Your first pact</span><h2 style="margin-top:18px">A promise is stronger<br>with a partner.</h2><p class="subtle">Choose a goal, put virtual points behind it, and ask Sam to keep you accountable.</p>${people()}${button('create','+ Create a pact')}</div>`}${hint('<strong>Try the whole loop in about a minute.</strong> You’ll play both sides: the person committing and the friend reviewing. All people and proof are fictional.')}`;
}
function create() {
  if (state.balance < 25) return `<h1>A fresh start?</h1><p class="subtle">You’ve used your demo points. Restart to explore another pact with 150 points.</p>${button('restart','Restart demo')}`;
  if (state.pact && ['pending','active','review'].includes(state.pact.status)) return `<h1>Your pact is in progress.</h1><p class="subtle">Finish this one before starting another.</p>${card()}${hint('Use Reset above to start fresh at any time.')}`;
  return `<p class="eyebrow">01 / Make a commitment</p><h1>Create a pact</h1><p class="subtle">One goal. One friend. A reason to follow through.</p><form id="pact-form"><label>Your goal<select name="goal">${goals.map(g=>`<option>${g}</option>`).join('')}</select></label><label>Accountability partner<input value="Sam · demo friend" readonly aria-readonly="true"></label><label>Points to stake<select name="stake">${[25,50,100].filter(n=>n<=state.balance).map(n=>`<option value="${n}" ${n===50?'selected':''}>${n} Pts</option>`).join('')}</select></label><div class="card"><p class="eyebrow">The agreement</p><p class="subtle">You commit to today’s goal. Sam reviews your proof. Approved proof earns your stake in bonus points. Rejected proof transfers your stake to Sam.</p><p class="subtle" style="margin:0">Virtual points only. Your pact starts after Sam accepts.</p></div><button class="primary" type="submit">Propose pact →</button></form>`;
}
function proposal() {
  const p=state.pact;
  return `<p class="eyebrow">02 / Playing as Sam</p><h1>You’ve been invited.</h1><p class="subtle">Your friend is making a commitment. You’re here to keep them accountable.</p><div class="card"><h2>${escape(p.goal)}</h2><dl class="summary"><dt>Who commits</dt><dd>You (the visitor)</dd><dt>Who verifies</dt><dd>Sam</dd><dt>What’s at stake</dt><dd>${p.stake} virtual points</dd><dt>If proof is rejected</dt><dd>Sam receives ${p.stake} Pts</dd></dl><p class="subtle">As Sam, you don’t need to do this goal or track your device.</p></div>${button('accept','Accept as Sam')}${button('decline','Decline invitation','secondary')}${hint('The goal stays inactive until the partner agrees. Declining releases the reserved points.')}`;
}
function submit() {
  return `<p class="eyebrow">03 / Playing as you</p><h1>Show you showed up.</h1><p class="subtle">${escape(state.pact.goal)}</p><div class="proof"><svg viewBox="0 0 64 64" fill="none" stroke="currentColor" stroke-width="2" aria-hidden="true"><rect x="6" y="12" width="52" height="40" rx="8"/><circle cx="32" cy="32" r="11"/><path d="m24 32 6 6 12-13"/></svg><p>“Done for today. Kept my promise!”</p><small>ILLUSTRATIVE SAMPLE PROOF</small></div><p class="subtle">In the app, you’d attach a photo for your friend to review. Here, use this sample check-in.</p>${button('send-proof','Send sample proof to Sam')}${hint('No photo is taken or uploaded. This sample exists only inside the demo.')}`;
}
function review() {
  return `<p class="eyebrow">04 / Playing as Sam</p><h1>Did they follow through?</h1><div class="card"><h2>${escape(state.pact.goal)}</h2><p class="subtle">Proof submitted by you · waiting for Sam</p><div class="proof"><p>“Done for today. Kept my promise!”</p><small>ILLUSTRATIVE SAMPLE PROOF</small></div><p class="subtle">Choose an outcome to explore what happens to the points.</p></div>${button('approve','Approve proof ✓')}${button('reject','Reject proof','danger')}${hint('Only the designated friend reviews. The person who submitted proof can’t approve their own check-in.')}`;
}
function result() {
  const won=state.pact.status==='approved', stake=state.pact.stake;
  return `<div class="result-symbol ${won?'':'failed'}">${won?'✓':'↗'}</div><p class="eyebrow">The accountability loop, complete</p><h1>${won?'A promise kept.':'A consequence that counts.'}</h1><p class="subtle">${won?`Sam approved your sample proof. Your reserved stake is released, and you earn ${stake} bonus points.`:`Sam rejected your sample proof. Your ${stake}-point stake goes to your accountability partner.`}</p><div class="card"><p class="eyebrow">Your balance</p><div class="big-points">${state.balance} <span style="font-size:16px">Pts</span></div><dl class="summary"><dt>Sam’s balance</dt><dd>${state.friendBalance} Pts</dd><dt>Real money moved</dt><dd>None</dd></dl></div>${button('profile','See points history')}${button('restart','Try the other outcome','secondary')}${hint('This is the idea behind HabitPact: a commitment becomes visible, proof gets reviewed, and follow-through has a consequence.')}`;
}
function profile() {
  const reserved=state.pact&&['pending','active','review'].includes(state.pact.status)?state.pact.stake:0;
  return `<p class="eyebrow">Demo profile</p><h1>Your points, explained.</h1><div class="card"><div class="big-points">${state.balance} <span style="font-size:16px">Pts</span></div><dl class="summary"><dt>Reserved for this pact</dt><dd>${reserved} Pts</dd><dt>Available</dt><dd>${state.balance-reserved} Pts</dd></dl></div><h2>Points history</h2><ul class="ledger"><li><span>Demo starting balance</span><strong>+150 Pts</strong></li>${state.ledger.map(e=>`<li><span>${e.text}</span><strong class="${e.amount<0?'negative':''}">${e.amount>0?'+':''}${e.amount} Pts</strong></li>`).join('')}</ul>${hint('Virtual points demonstrate the incentive. This portfolio demo has no wallet, purchases, or withdrawals.')}`;
}
function chats() {
  return `<p class="eyebrow">Demo conversation</p><h1>You & Sam</h1><div class="chat them"><small>SAM · SAMPLE MESSAGE</small>Want to keep each other accountable today?</div><div class="chat you"><small>YOU · SAMPLE MESSAGE</small>${state.pact?`My goal: ${escape(state.pact.goal)}`:'I’m in. Let’s make a pact.'}</div><div class="chat them"><small>SAM · SAMPLE MESSAGE</small>${state.pact?.status==='approved'?'You did it! Same time tomorrow?':state.pact?.status==='rejected'?'A fresh start tomorrow. I’m still in your corner.':'Send me your proof when you’re done. You’ve got this.'}</div><p class="subtle">A sample of the social layer. Real messages aren’t sent in this demo.</p>${button(state.pact?'pacts':'create',state.pact?'Back to your pact':'Make your first pact')}`;
}
let route='home';
function render(next='home',message='',focus=true) {
  // Guard deep links and stale actions; settlement can only happen once.
  if(['proposal','submit','review','result'].includes(next)) {
    const allowed={pending:'proposal',active:'submit',review:'review',approved:'result',rejected:'result'};
    if(!state.pact||allowed[state.pact.status]!==next) next='pacts';
  }
  route=next;
  const views={home,create,proposal,submit,review,result,profile,chats,pacts:()=>`<p class="eyebrow">Your commitments</p><h1>Pacts</h1>${state.pact?card():'<p class="subtle">Your next small win starts here.</p>'+button('create','+ Create a pact')}`};
  screen.innerHTML=(views[route]||home)();
  document.querySelector('#balance').textContent=`ϟ ${state.balance} Pts`;
  document.querySelector('#navigation').innerHTML=['home','pacts','create','chats','profile'].map(key=>`<a href="#${key}" ${key===route?'aria-current="page"':''} ${key==='create'?'class="new"':''}>${key==='create'?'+ New Pact':svg(key)+key[0].toUpperCase()+key.slice(1)}</a>`).join('');
  document.querySelector('#announcement').textContent=message;
  if(focus){screen.focus({preventScroll:true});window.scrollTo({top:0,behavior:'instant'});}
}
document.addEventListener('click',event=>{
  const action=event.target.closest('[data-action]')?.dataset.action;
  if(!action)return;
  const p=state.pact;
  if(action==='restart'){state=fresh();render('create','Demo restarted. Try another outcome.');return;}
  if(action==='accept'&&p?.status==='pending'){p.status='active';render('pacts','Sam accepted. Your pact is active.');return;}
  if(action==='decline'&&p?.status==='pending'){p.status='declined';render('pacts','Sam declined. Reserved points released.');return;}
  if(action==='send-proof'&&p?.status==='active'){p.status='review';render('review','Sample proof submitted. You are now reviewing as Sam.');return;}
  if(['approve','reject'].includes(action)&&p?.status==='review'){
    const won=action==='approve';p.status=won?'approved':'rejected';state.balance+=won?p.stake:-p.stake;if(!won)state.friendBalance+=p.stake;
    state.ledger.push({text:won?'Proof approved · goal bonus':'Proof rejected · stake to Sam',amount:won?p.stake:-p.stake});
    render('result',won?'Proof approved. Bonus points earned.':'Proof rejected. Stake transferred to Sam.');return;
  }
  if(['home','pacts','create','proposal','submit','review','result','profile','chats'].includes(action))render(action);
});
document.addEventListener('submit',event=>{
  if(event.target.id!=='pact-form')return;event.preventDefault();
  const values=new FormData(event.target),stake=Number(values.get('stake')),goal=String(values.get('goal'));
  if(!goals.includes(goal)||![25,50,100].includes(stake)||stake>state.balance)return;
  if(state.pact&&['pending','active','review'].includes(state.pact.status))return;
  state.pact={goal,stake,status:'pending'};render('proposal','Pact proposed. You are now playing as Sam.');
});
// Intercept navigation so clicking the current tab also works after action views.
document.addEventListener('click',event=>{
  const link=event.target.closest('a[href^="#"]');if(!link)return;
  event.preventDefault();render(link.hash.slice(1));
});
document.querySelector('#reset').addEventListener('click',()=>{state=fresh();render('home','Demo reset. Starting balance: 150 points.');});
render('home','',false);

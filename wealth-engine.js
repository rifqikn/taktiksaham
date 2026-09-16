/* TAKTIKSAHAM Wealth Management v1.0. Illustrative planning model, not live data. */
(function (root, factory) {
  const model = factory();
  if (typeof module === 'object' && module.exports) module.exports = model;
  else root.WealthEngine = model;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';
  const ASSETS = [
    {id:'cash',name:'Kas / tabungan',color:'#c0c7d1',note:'Likuiditas harian. Imbal hasil dan ketentuan mengikuti rekening bank.'},
    {id:'rdpu',name:'Reksa dana pasar uang',color:'#77cdb3',note:'Untuk kebutuhan likuiditas; periksa jadwal pencairan, isi portofolio, dan risiko NAB.'},
    {id:'rdpt',name:'Reksa dana pendapatan tetap',color:'#83a5db',note:'Nilai dapat berubah karena suku bunga dan kredit. Cocokkan durasi dan waktu pencairan.'},
    {id:'sbn',name:'Obligasi / SBN',color:'#d7b783',note:'Model memakai eksposur SBN. Cocokkan jatuh tempo; harga jual sebelum jatuh tempo dapat turun. Obligasi korporasi perlu kajian kredit tambahan.'},
    {id:'rds',name:'Reksa dana saham',color:'#bb9fdf',note:'Eksposur saham melalui manajer investasi. Tetap memiliki risiko penurunan nilai.'},
    {id:'saham',name:'Saham langsung',color:'#ee9b81',note:'Memerlukan waktu, pengetahuan, diversifikasi, dan evaluasi emiten.'}
  ];
  const LABELS=['Sangat konservatif','Konservatif','Moderat','Dinamis','Agresif'];
  const clone = x => JSON.parse(JSON.stringify(x));
  const sum = a => a.reduce((s,x)=>s+x,0);
  const clamp = (x,a,b)=>Math.max(a,Math.min(b,x));
  const monthly = annual => Math.expm1(Math.log1p(annual/100)/12);
  const growth = (r,n) => Math.exp(n*Math.log1p(r));
  const annuity = (r,n) => n<=0?0:Math.abs(r)<1e-12?n:Math.expm1(n*Math.log1p(r))/r;
  const weighted = (weights,values)=>sum(weights.map((w,i)=>w/100*values[ASSETS[i].id]));
  const defaults = {
    version:1, demo:true, alias:'Contoh keluarga · usia 38', age:38, dependents:2,
    incomeType:'stable', income:25000000, expenses:12000000, debtPayment:3000000, contributionEndAge:60,
    debtBalance:200000000, debtPriority:false, budget:6000000,
    emergency:60000000, emergencyMonths:6, healthCover:'yes', lifeCover:'review',
    assets:{cash:40000000,rdpu:30000000,rdpt:50000000,sbn:50000000,rds:30000000,saham:0},
    otherAssets:800000000, preference:'all',
    risk:{loss:20,reaction:2,experience:1,goal:2,fluctuation:2,effort:1},
    assumptions:{inflation:4,retirementReturn:4.5,returns:{cash:1,rdpu:4,rdpt:5.5,sbn:5.5,rds:8,saham:9}},
    goals:[
      {id:'g1',name:'DP rumah',type:'house',years:4,amount:250000000,inflation:5,seed:70000000,priority:1},
      {id:'g2',name:'Pendidikan anak',type:'education',years:8,amount:180000000,inflation:6,seed:30000000,priority:2},
      {id:'g3',name:'Pensiun terencana',type:'retirement',years:22,amount:0,inflation:4,seed:50000000,priority:3,retireAge:60,endAge:85,spending:10000000,pension:3000000}
    ]
  };
  function example(age) {
    const s=clone(defaults);
    if(age===23) Object.assign(s,{alias:'Contoh awal karier · usia 23',age:23,dependents:0,income:8000000,expenses:4000000,debtPayment:0,debtBalance:0,budget:2000000,emergency:12000000,otherAssets:0,assets:{cash:8000000,rdpu:7000000,rdpt:0,sbn:0,rds:0,saham:0},lifeCover:'review',goals:[{id:'g1',name:'Pendidikan lanjutan',type:'education',years:3,amount:50000000,inflation:6,seed:2000000,priority:1},{id:'g2',name:'Dana menikah',type:'wedding',years:5,amount:120000000,inflation:4,seed:1000000,priority:2}]});
    if(age===58) Object.assign(s,{alias:'Contoh menjelang pensiun · usia 58',age:58,dependents:1,income:18000000,expenses:10000000,debtPayment:0,debtBalance:0,budget:5000000,emergency:120000000,emergencyMonths:12,otherAssets:1500000000,assets:{cash:150000000,rdpu:150000000,rdpt:300000000,sbn:400000000,rds:200000000,saham:0},risk:{loss:10,reaction:1,experience:2,goal:1,fluctuation:1,effort:1},goals:[{id:'g1',name:'Dana pensiun',type:'retirement',years:2,amount:0,inflation:4,seed:1100000000,priority:1,retireAge:60,endAge:85,spending:10000000,pension:4000000},{id:'g2',name:'Kebutuhan keluarga',type:'other',years:3,amount:70000000,inflation:4,seed:50000000,priority:2}]});
    return s;
  }
  function foundation(s) {
    const expenses=s.expenses+s.debtPayment;
    const reserveTarget=expenses*s.emergencyMonths;
    const reserveGap=Math.max(0,reserveTarget-s.emergency);
    const liquid=s.assets.cash+s.assets.rdpu;
    const reserveTransfer=Math.min(reserveGap,liquid);
    const cashUsed=Math.min(s.assets.cash,reserveTransfer);
    const remainingAssets={...s.assets,cash:s.assets.cash-cashUsed,rdpu:s.assets.rdpu-(reserveTransfer-cashUsed)};
    const financial=sum(Object.values(s.assets))+s.emergency;
    const surplus=s.income-expenses;
    const budget=Math.min(s.budget,Math.max(0,surplus));
    return {expenses,reserveTarget,reserveGap,reserveTransfer,remainingGap:reserveGap-reserveTransfer,remainingAssets,financial,surplus,budget,investable:sum(Object.values(remainingAssets)),netWorth:financial+s.otherAssets-s.debtBalance,debtRatio:s.income>0?s.debtPayment/s.income:s.debtPayment>0?Infinity:0,coverage:expenses>0?s.emergency/expenses:0,coverageAfter:expenses>0?(s.emergency+reserveTransfer)/expenses:0};
  }
  function validate(s,options={}) {
    const errors=[];
    const number=(v,min,max,label)=>{if(typeof v!=='number'||!Number.isFinite(v)||v<min||v>max)errors.push(label+' harus berada antara '+min+' dan '+max+'.');};
    if(!s||typeof s!=='object')return ['Format rencana tidak valid.'];
    if(typeof s.alias!=='string'||s.alias.length>80)errors.push('Alias rencana maksimal 80 karakter.');
    if(!['yes','no','review'].includes(s.healthCover)||!['yes','no','review','na'].includes(s.lifeCover))errors.push('Isian proteksi belum valid.');
    if(typeof s.debtPriority!=='boolean')errors.push('Isian utang prioritas belum valid.');
    number(s.age,17,60,'Usia'); number(s.dependents,0,15,'Tanggungan');
    number(s.contributionEndAge,s.age,100,'Usia akhir setoran');
    if(!Number.isInteger(s.contributionEndAge))errors.push('Usia akhir setoran harus bilangan bulat.');
    if(!Number.isInteger(s.age)||!Number.isInteger(s.dependents))errors.push('Usia dan jumlah tanggungan harus berupa bilangan bulat.');
    const financialLabels={income:'Penghasilan',expenses:'Pengeluaran',debtPayment:'Cicilan bulanan',debtBalance:'Saldo utang',budget:'Anggaran investasi',emergency:'Dana darurat',otherAssets:'Aset noninvestasi'};
    for(const k of Object.keys(financialLabels))number(s[k],0,1e13,financialLabels[k]);
    number(s.emergencyMonths,1,24,'Target bulan dana darurat');
    if(!['stable','variable','retired','student'].includes(s.incomeType))errors.push('Jenis penghasilan belum valid.');
    if(!['all','syariah'].includes(s.preference))errors.push('Preferensi instrumen belum valid.');
    if(!s.assets||!s.risk||!s.assumptions||!s.assumptions.returns)return errors.concat('Bagian aset, risiko, atau asumsi belum lengkap.');
    for(const a of ASSETS){number(s.assets[a.id],0,1e13,a.name);number(s.assumptions.returns[a.id],-20,30,'Return '+a.name);}
    number(s.assumptions.inflation,0,15,'Inflasi umum');number(s.assumptions.retirementReturn,-10,20,'Return masa pensiun');
    if(!(options.allowDraft&&s.risk.loss===null)&&![0,5,10,20,35].includes(s.risk.loss))errors.push('Jawab toleransi penurunan nilai.');
    const riskLabels={reaction:'reaksi ketika pasar turun',experience:'pengalaman investasi',goal:'prioritas investasi',fluctuation:'kenyamanan menghadapi fluktuasi',effort:'waktu untuk mengelola investasi'};
    for(const k of Object.keys(riskLabels))if(!(options.allowDraft&&s.risk[k]===null)&&![0,1,2,3].includes(s.risk[k]))errors.push('Lengkapi pertanyaan risiko: '+riskLabels[k]+'.');
    if(!Array.isArray(s.goals)||s.goals.length<1||s.goals.length>6)return errors.concat('Masukkan 1–6 tujuan.');
    const ids=new Set();
    for(const g of s.goals){
      if(!g||typeof g!=='object'){errors.push('Format tujuan tidak valid.');continue;}
      if(typeof g.id!=='string'||!g.id||ids.has(g.id))errors.push('Identitas tujuan harus unik.'); ids.add(g.id);
      if(typeof g.name!=='string'||!g.name.trim()||g.name.length>80)errors.push('Nama tujuan harus diisi, maksimal 80 karakter.');
      if(!['house','education','wedding','retirement','holiday','other'].includes(g.type))errors.push('Jenis tujuan belum valid.');
      number(g.seed,0,1e13,'Modal '+g.name);number(g.inflation,0,15,'Inflasi '+g.name);number(g.priority,1,3,'Prioritas '+g.name);
      if(!Number.isInteger(g.priority))errors.push('Prioritas harus 1, 2, atau 3.');
      if(g.type==='retirement'){number(g.retireAge,s.age,80,'Usia pensiun');number(g.endAge,g.retireAge+1,105,'Usia akhir simulasi');number(g.spending,0,1e10,'Belanja pensiun');number(g.pension,0,1e10,'Pendapatan pensiun');if(!Number.isInteger(g.retireAge)||!Number.isInteger(g.endAge))errors.push('Usia pensiun dan akhir simulasi harus bilangan bulat.');}
      else {number(g.years,1/12,60,'Tahun '+g.name);number(g.amount,1,1e13,'Target '+g.name);}
    }
    if(!errors.length&&!options.allowDraft){const f=foundation(s);if(sum(s.goals.map(g=>g.seed))>f.investable+0.01)errors.push('Total modal awal tujuan melebihi aset investasi setelah penyisihan dana darurat. Kurangi modal tujuan atau koreksi aset.');}
    return errors;
  }
  function riskProfile(s,f) {
    const risk=s.risk;
    const willingness=clamp(Math.round((risk.reaction+risk.goal+risk.fluctuation)/9*4)+1,1,5);
    const lossCap=risk.loss===0?1:risk.loss===5?1:risk.loss===10?2:risk.loss===20?3:5;
    let capacity=5; const reasons=[];
    if(f.surplus<=0){capacity=s.incomeType==='retired'?2:1;reasons.push('Tidak ada surplus bulanan; fokus pada likuiditas dan penggunaan aset yang sudah ada.');}
    if(f.debtRatio>0.3){capacity=Math.min(capacity,2);reasons.push('Rasio cicilan di atas acuan 30%; ruang investasi perlu ditinjau.');}
    if(s.debtPriority){capacity=1;reasons.push('Ada kewajiban utang prioritas; selesaikan peninjauan utang sebelum menambah risiko.');}
    if(s.incomeType==='variable'){capacity=Math.min(capacity,3);reasons.push('Penghasilan berubah-ubah; kapasitas risiko dibatasi dalam model ini.');}
    if(f.expenses>0&&f.coverageAfter<3){capacity=Math.min(capacity,2);reasons.push('Cadangan awal belum mencapai tiga bulan kebutuhan.');}
    if(s.risk.experience===0){capacity=Math.min(capacity,3);reasons.push('Pengalaman masih awal; eksposur saham langsung dialihkan ke pengelolaan melalui reksa dana.');}
    const level=Math.min(willingness,capacity,lossCap);
    return {willingness,capacity,lossCap,level,label:LABELS[level-1],reasons,noRisk:risk.loss===0};
  }
  const SHOCK={cash:0,rdpu:-1,rdpt:-10,sbn:-8,rds:-35,saham:-45};
  const LOW={cash:0.5,rdpu:2,rdpt:4,sbn:2,rds:6,saham:8};
  const HIGH={cash:0.5,rdpu:1,rdpt:2,sbn:1,rds:4,saham:5};
  function weightsFor(s,risk,years) {
    if(risk.noRisk)return [100,0,0,0,0,0];
    if(years<1)return [50,50,0,0,0,0];
    if(years<3)return [10,80,10,0,0,0];
    const templates=[[5,65,20,10,0,0],[5,30,30,30,5,0],[5,10,25,30,25,5],[5,5,15,20,40,15],[5,0,10,15,45,25]];
    let level=Math.min(risk.level,years<5?2:years<10?3:5);
    let w;
    do {
      w=templates[level-1].slice();
      if(s.risk.experience<2||s.risk.effort<2){w[4]+=w[5];w[5]=0;}
      if(-weighted(w,SHOCK)<=s.risk.loss+1e-8||level===1)break;
      level--;
    } while(level>=1);
    return w;
  }
  function retirementTarget(g,age,nominalReturn) {
    const years=g.retireAge-age;
    const periods=(g.endAge-g.retireAge)*12;
    const atRetirement=Math.max(0,g.spending-g.pension)*Math.pow(1+g.inflation/100,years);
    const r=monthly(nominalReturn), inf=monthly(g.inflation);
    const q=(1+inf)/(1+r);
    const factor=Math.abs(q-1)<1e-12?periods:Math.expm1(periods*Math.log(q))/Math.expm1(Math.log(q));
    return {target:atRetirement*factor,monthlyGap:atRetirement,periods,years,realReturn:((1+nominalReturn/100)/(1+g.inflation/100)-1)*100};
  }
  function prepare(s) {
    const f=foundation(s), risk=riskProfile(s,f);
    const goals=s.goals.map((g,index)=>{
      const retirement=g.type==='retirement'?retirementTarget(g,s.age,s.assumptions.retirementReturn):null;
      const years=retirement?retirement.years:g.years, months=Math.round(years*12);
      const w=weightsFor(s,risk,years);
      const base=weighted(w,s.assumptions.returns), low=base-weighted(w,LOW), high=base+weighted(w,HIGH);
      return {...g,index,years,months,retirement,weights:w,target:retirement?retirement.target:g.amount*Math.pow(1+g.inflation/100,months/12),rates:{base,low,high},stress:weighted(w,SHOCK),horizonNote:years<1?'Besarnya kebutuhan likuiditas jangka sangat pendek membatasi risiko.':years<3?'Tujuan kurang dari tiga tahun: saham dan obligasi langsung tidak dialokasikan.':years<5?'Tujuan tiga sampai lima tahun: model membatasi risiko ke konservatif.':years<10?'Tujuan lima sampai sepuluh tahun: model membatasi risiko ke moderat.':'Jangka panjang memberi ruang risiko, tetap dibatasi profil dan kemampuan keuangan.'};
    }).sort((a,b)=>a.priority-b.priority||a.months-b.months||a.index-b.index);
    return {f,risk,goals,contributionMonths:(s.contributionEndAge-s.age)*12};
  }
  function simulate(prepared,budget,detail=true) {
    const {f,goals,contributionMonths}=prepared;
    let reserve=f.remainingGap;
    const totalMonths=Math.max(0,...goals.map(g=>g.months));
    const states=goals.map(g=>({id:g.id,base:g.seed,low:g.seed,high:g.seed,paid:0,firstPayment:0,firstPaymentMonth:null,series:[{month:0,base:g.seed,low:g.seed,high:g.seed,paid:g.seed}],payments:[]}));
    const totals=[];let reserveDone=reserve>0?null:0;
    for(let m=1;m<=totalMonths;m++){
      const availableBudget=m<=contributionMonths?budget:0;
      const emergencyPayment=Math.min(reserve,availableBudget);reserve-=emergencyPayment;
      if(reserveDone===null&&reserve<0.01)reserveDone=m;
      let available=availableBudget-emergencyPayment, invested=0;
      for(let i=0;i<goals.length;i++){
        const g=goals[i], t=states[i];if(m>g.months)continue;
        const remaining=g.months-m+1, r=monthly(g.rates.base);
        const deposits=Math.max(0,Math.min(remaining,contributionMonths-m+1));
        const targetAtLastDeposit=g.target/growth(r,remaining-deposits);
        const need=deposits>0?Math.max(0,(targetAtLastDeposit-t.base*growth(r,deposits))/annuity(r,deposits)):0;
        const payment=Math.min(available,need);available-=payment;invested+=payment;
        t.base=t.base*(1+r)+payment;
        if(detail){t.low=t.low*(1+monthly(g.rates.low))+payment;t.high=t.high*(1+monthly(g.rates.high))+payment;t.payments.push(payment);}
        t.paid+=payment;
        if(t.firstPaymentMonth===null&&payment>0.01){t.firstPaymentMonth=m;t.firstPayment=payment;}
        if(detail&&(m%12===0||m===g.months))t.series.push({month:m,base:t.base,low:t.low,high:t.high,paid:g.seed+t.paid});
      }
      if(detail)totals.push({month:m,availableBudget,emergency:emergencyPayment,goals:invested,unused:Math.max(0,available)});
    }
    return {states,totals,reserveLeft:Math.max(0,reserve),reserveDone,allFunded:reserve<1&&states.every((t,i)=>t.base+Math.max(1,goals[i].target*1e-8)>=goals[i].target)};
  }
  function requiredBudget(prepared) {
    if(prepared.goals.some(g=>g.months===0&&g.seed+1<g.target))return null;
    if(prepared.goals.every(g=>g.months===0)&&prepared.f.remainingGap>1)return null;
    if(simulate(prepared,0,false).allFunded)return 0;
    if(prepared.contributionMonths===0)return null;
    let low=0,high=1000000;
    while(high<1e12&&!simulate(prepared,high,false).allFunded)high*=2;
    if(!simulate(prepared,high,false).allFunded)return null;
    for(let i=0;i<42;i++){const mid=(low+high)/2;if(simulate(prepared,mid,false).allFunded)high=mid;else low=mid;}
    return Math.ceil(high);
  }
  function retirementPath(g,initial,nominalReturn) {
    if(!g.retirement)return null;
    let balance=initial,spent=0,depleted=null;
    const r=monthly(nominalReturn),inf=monthly(g.inflation),rows=[{age:g.retireAge,balance,annualSpend:0}];
    for(let m=0;m<g.retirement.periods;m++){
      const payment=g.retirement.monthlyGap*growth(inf,m);
      if(balance+0.01<payment&&depleted===null)depleted=g.retireAge+m/12;
      balance=Math.max(0,balance-payment)*(1+r);spent+=payment;
      if((m+1)%12===0){rows.push({age:g.retireAge+(m+1)/12,balance,annualSpend:spent});spent=0;}
    }
    return {rows,depleted,ending:balance};
  }
  function calculate(s) {
    const errors=validate(s);if(errors.length)return {errors};
    const p=prepare(s), sim=simulate(p,p.f.budget), required=requiredBudget(p);
    const goals=p.goals.map((g,i)=>{
      const t=sim.states[i];
      const r=monthly(g.rates.base), factor=annuity(r,g.months);
      const theoretical=g.months>0?Math.max(0,(g.target-g.seed*growth(r,g.months))/factor):g.seed+1>=g.target?0:null;
      const stressLoss=-g.seed*g.stress/100;
      return {...g,...t,theoretical,gap:Math.max(0,g.target-t.base),funding:g.target>0?t.base/g.target:1,stressLoss,retirementPath:retirementPath(g,t.base,s.assumptions.retirementReturn)};
    });
    const capitalByAsset=ASSETS.map((_,i)=>sum(goals.map(g=>g.seed*g.weights[i]/100)));
    const plannedSeed=sum(goals.map(g=>g.seed));
    const monthlyByAsset=ASSETS.map((_,i)=>sum(goals.map(g=>(g.payments[0]||0)*g.weights[i]/100)));
    const futureMonthlyByAsset=ASSETS.map((_,i)=>sum(goals.map(g=>g.firstPayment*g.weights[i]/100)));
    return {errors:[],...p,goals,sim,required,capitalByAsset,monthlyByAsset,futureMonthlyByAsset,plannedSeed,unassigned:p.f.investable-plannedSeed,stressLoss:sum(goals.map(g=>g.stressLoss)),shortfall:required===null?null:Math.max(0,required-p.f.budget),funded:goals.filter(g=>g.gap<=Math.max(1,g.target*1e-8)).length};
  }
  return {ASSETS,LABELS,SHOCK,LOW,HIGH,defaults,clone,example,validate,foundation,riskProfile,weightsFor,prepare,simulate,requiredBudget,calculate,monthly,annuity,retirementTarget,retirementPath};
});

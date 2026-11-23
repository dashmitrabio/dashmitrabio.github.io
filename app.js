(() => {
'use strict';
const $ = s => document.querySelector(s);
const esc = s => String(s ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const nf0 = new Intl.NumberFormat('id-ID',{maximumFractionDigits:0});
const nf1 = new Intl.NumberFormat('id-ID',{maximumFractionDigits:1});
const f0 = v => nf0.format(Math.round(v||0));
const f1 = v => nf1.format(v||0);
const pct = v => isFinite(v) ? nf0.format(Math.round(v*100))+'%' : '–';
const MONTHS=['Jan','Feb','Mar','Apr','Mei','Jun','Jul','Agu','Sep','Okt','Nov','Des'];
const MONTHS_L=['Januari','Februari','Maret','April','Mei','Juni','Juli','Agustus','September','Oktober','November','Desember'];
const D = s => { const [y,m,d]=s.split('-').map(Number); return Date.UTC(y,m-1,d); };
const iso = t => new Date(t).toISOString().slice(0,10);
const addDays = (s,n) => iso(D(s)+n*864e5);
const diffDays = (a,b) => Math.round((D(b)-D(a))/864e5);
const dLabel = s => { const [y,m,d]=s.split('-').map(Number); return d+' '+MONTHS[m-1]; };
const dLong = s => { const [y,m,d]=s.split('-').map(Number); return d+' '+MONTHS_L[m-1]+' '+y; };
const slug = s => String(s).replace(/[^A-Za-z0-9_\-.~:@+]/g,'-').replace(/-+/g,'-').slice(0,80);
const todayLocal = () => { const n=new Date(); return n.getFullYear()+'-'+String(n.getMonth()+1).padStart(2,'0')+'-'+String(n.getDate()).padStart(2,'0'); };
const hash = s => { let h=5381; for(let i=0;i<s.length;i++) h=((h<<5)+h+s.charCodeAt(i))|0; return (h>>>0).toString(36)+s.length; };
const YEAR_END='2026-12-31';
const nowIso=()=>new Date().toISOString();

/* ---------- mitigation library ---------- */
const CATS = {
  none:{label:'Tidak ada kendala'},
  akses:{label:'Akses jalan / rute', act:['Koordinasi dengan PLTU dan Pemda setempat untuk jadwal & percepatan perbaikan jalan','Tetapkan rute alternatif dan batas tonase sementara','Tumpuk stok di stockpile mitra sebelum penutupan, lalu kirim bertahap saat akses dibuka','Untuk PLTU di DAS Kapuas, kaji pengiriman via sungai sebagai jalur cadangan'],
    mitra:['Laporkan perkiraan lama penutupan jalan dan volume yang tertahan','Siapkan rute alternatif dan atur muatan sesuai batas tonase','Tumpuk stok siap kirim agar bisa dikirim begitu akses dibuka']},
  cuaca:{label:'Cuaca / banjir / sungai', act:['Bangun buffer stock min. 7 hari di stockpile PLTU sebelum puncak hujan','Gunakan terpal / gudang tertutup agar kadar air tidak naik','Majukan jadwal kirim pada hari cerah dan pantau prakiraan BMKG mingguan','Sepakati toleransi jadwal dengan PLTU untuk periode cuaca ekstrem'],
    mitra:['Tutup stok dengan terpal atau simpan di gudang agar kadar air tetap rendah','Kirim lebih banyak pada hari cerah untuk menutup hari hujan','Pantau prakiraan cuaca dan kabari PLN EPI bila pengiriman akan terhenti']},
  armada:{label:'Armada / driver', act:['Mitra menyiapkan armada cadangan atau sewa DT harian','Atur shift dan jadwal izin driver agar tidak bersamaan','Jalankan preventive maintenance terjadwal di luar jam kirim','Minta mitra lapor jumlah unit siap operasi tiap minggu'],
    mitra:['Siapkan armada cadangan atau sewa DT harian saat unit rusak','Atur jadwal izin driver agar tidak bersamaan','Lakukan servis berkala di luar jam kirim']},
  mesin:{label:'Mesin / chipper / listrik', act:['Siapkan suku cadang kritis (pisau chipper, belt, filter) di lokasi','Jadwalkan overhaul di luar periode target tinggi dan beri tahu PLN EPI H-7','Sewa chipper/genset cadangan selama perbaikan','Tambah shift produksi setelah perbaikan untuk mengejar kekurangan'],
    mitra:['Simpan suku cadang kritis di lokasi (pisau chipper, belt, filter)','Beri tahu PLN EPI minimal 7 hari sebelum overhaul','Tambah shift setelah perbaikan untuk mengejar kekurangan']},
  bahanbaku:{label:'Bahan baku / stok', act:['Petakan sumber bahan baku tambahan (sawmill, PKS, kebun) di radius ekonomis','Dorong kontrak pasokan bahan baku jangka menengah antara mitra dan pemasok','Pantau stok mitra mingguan dan tetapkan stok minimum','Alihkan sebagian kuota ke mitra lain yang punya stok lebih'],
    mitra:['Cari sumber bahan baku tambahan di sekitar lokasi','Ikat pemasok utama dengan kontrak pasokan','Laporkan stok siap kirim setiap minggu']},
  kualitas:{label:'Kualitas / kadar air', act:['Lakukan uji kadar air dan ukuran partikel di sumber sebelum muat','Keringkan / tiriskan material dan tutup terpal saat angkut','Sepakati spesifikasi dan prosedur penolakan dengan PLTU secara tertulis','Evaluasi pemasok bahan baku yang sering tidak sesuai spesifikasi'],
    mitra:['Uji kadar air dan ukuran sebelum muat','Keringkan material dan tutup terpal saat angkut','Pisahkan bahan baku dari pemasok yang sering tidak sesuai spesifikasi']},
  admin:{label:'Administrasi / izin / pembayaran', act:['Buat daftar dokumen wajib per pengiriman dan cek H-1','Percepat proses dokumen legalitas & surat jalan bersama instansi terkait','Pantau status tagihan mitra agar arus kas tidak menghambat pasokan','Tetapkan PIC administrasi di PLN EPI dan mitra'],
    mitra:['Cek kelengkapan dokumen pengiriman H-1','Ajukan tagihan tepat waktu dan konfirmasi statusnya ke PLN EPI','Tunjuk satu PIC administrasi']},
  pltu:{label:'Kendala di PLTU (bongkar/antrian)', act:['Koordinasi slot jadwal bongkar harian dengan PLTU','Tambah alat bongkar atau jam operasi penerimaan saat volume tinggi','Pastikan kapasitas stockpile dan kalibrasi timbangan','Catat waktu tunggu truk untuk dasar perbaikan SOP penerimaan'],
    mitra:['Catat jam tiba dan jam bongkar tiap truk sebagai bukti','Laporkan antrian lebih dari 3 jam di keterangan','Ikuti slot bongkar yang disepakati dengan PLTU']},
  libur:{label:'Hari libur / off', act:['Majukan pengiriman sebelum hari libur dan tumpuk stok di PLTU','Susun kalender operasi mitra bulanan termasuk hari libur','Gilir hari off antar mitra agar pasokan tidak berhenti bersamaan'],
    mitra:['Majukan pengiriman sebelum hari libur','Kirim kalender operasi bulanan ke PLN EPI']},
  lainnya:{label:'Lainnya', act:['Klarifikasi kendala dengan mitra dan tetapkan PIC penyelesaian','Catat dampak terhadap volume dan tenggat penyelesaian'],
    mitra:['Jelaskan kendala dan perkiraan dampaknya di keterangan laporan']},
  kinerja:{label:'Kinerja vs target', act:[], mitra:[]}
};
const CAT_ORDER=['akses','cuaca','armada','mesin','kualitas','bahanbaku','admin','pltu','libur','lainnya'];
function classify(t){
  const s=' '+String(t).toLowerCase()+' ';
  const R=[['akses',/jalan|akses|jembatan|longsor|rute/],['cuaca',/hujan|banjir|cuaca|asap|pasang|surut|sungai/],
    ['armada',/\bdt\b|dump|truk|truck|vehicle|driver|sopir|armada|kendaraan|tongkang|kapal|bbm|solar/],
    ['mesin',/mesin|chipper|overhaul|breakdown|rusak|power|listrik|genset|sparepart|spare part/],
    ['kualitas',/kadar air|kualitas|moisture|ukuran|kontamin/],['bahanbaku',/bahan baku|stok|kayu|limbah|sawmill|cangkang|serbuk/],
    ['admin',/izin|dokumen|administrasi|kontrak|tagihan|pembayaran|invoice/],['pltu',/pltu|bongkar|antri|bunker|timbang|tolak|stockpile/],
    ['libur',/libur|minggu|tgl merah|holiday|\boff\b|cuti|lebaran|natal/]];
  for(const [k,re] of R) if(re.test(s)) return k;
  return 'lainnya';
}

/* ---------- state ---------- */
const S={role:null,uid:null,email:'',profile:null,sb:null,geo:null,
  plantsRaw:[],partnersRaw:[],pById:new Map(),pByKey:new Map(),rows:[],catatan:[],
  base:null,entries:new Map(),followups:new Map(),coords:null,targets:null,ann:[],katalog:[],
  profiles:[],akses:[],req:[],
  my:{partners:[],rows:[],pct:null,umpan:[],req:null},preview:null,mp:null,
  M:null,view:null,plant:null,deferIssues:false,filtersReady:false};
try{ S.plant=localStorage.getItem('rmk.plant')||null; }catch(e){}
const isMgr=()=>S.role==='manager'&&!S.preview;
const errMsg=e=>e?.code==='42501'||/row-level security/i.test(e?.message||'')?'Akun Anda tidak berwenang untuk tindakan ini.':(e?.message||'Terjadi kesalahan. Coba lagi.');

/* ---------- manager model ---------- */
function prepBase(){
  const B={plants:[],partners:[],daily:[],notes:[],asOf:'2026-01-01'};
  S.pById=new Map(S.partnersRaw.map(p=>[p.id,p])); S.pByKey=new Map(S.partnersRaw.map(p=>[p.plant+'|'+p.name,p]));
  B.plants=S.plantsRaw.map(p=>({name:p.name,targetFGD:+(p.target_excel??p.target_waiver),rekap:(p.rekap||[]).map(Number),do:(p.do_bulanan||[]).map(Number)}));
  S.targets=Object.fromEntries(S.plantsRaw.map(p=>[p.name,+p.target_waiver]));
  S.coords=Object.fromEntries(S.plantsRaw.filter(p=>p.lat!=null&&p.lon!=null).map(p=>[p.name,[+p.lat,+p.lon]]));
  B.partners=S.partnersRaw.map(p=>({plant:p.plant,name:p.name,type:p.jenis||'',contracts:p.kontrak||[]}));
  S.entries=new Map();
  for(const r of S.rows){ const pa=S.pById.get(r.partner_id); if(!pa) continue;
    if(r.sumber==='excel'){ B.daily.push([pa.plant,pa.name,r.tanggal,+r.volume]); if(r.tanggal>B.asOf) B.asOf=r.tanggal; }
    else { const id=pa.id+'-'+r.tanggal; S.entries.set(id,{id,pid:pa.id,plant:pa.plant,partner:pa.name,date:r.tanggal,volume:+r.volume,ritase:r.ritase,jenis:r.jenis,kendala:r.kendala,ket:r.ket,rencana:r.rencana,uid:r.user_id,pel:r.pelapor,at:r.updated_at}); } }
  B.notes=S.catatan.map(c=>({plant:c.plant,partner:c.partner_id?(S.pById.get(c.partner_id)?.name||''):'',date:c.tanggal,text:c.teks}));
  S.base=B;
}
function build(){
  const B=S.base;
  const daily=new Map();
  for(const [p,pa,d,v] of B.daily) daily.set(p+'|'+pa+'|'+d,{v,src:'excel'});
  for(const e of S.entries.values()) daily.set(e.plant+'|'+e.partner+'|'+e.date,{v:+e.volume||0,src:'mitra',e});
  let asOf=B.asOf; const today=todayLocal();
  for(const [k,o] of daily){ const d=k.slice(k.lastIndexOf('|')+1); if(o.v>0 && d>asOf && d<=today) asOf=d; }
  const plants=B.plants.map(p=>({...p,targetXls:p.targetFGD,partners:new Map(),byDate:new Map()}));
  const pm=new Map(plants.map(p=>[p.name,p]));
  for(const pa of B.partners){ const P=pm.get(pa.plant); if(P) P.partners.set(pa.name,{name:pa.name,type:pa.type,contracts:pa.contracts,byDate:new Map(),src:new Map()}); }
  for(const [k,o] of daily){
    const [pl,pa,d]=k.split('|'); const P=pm.get(pl); if(!P||d>asOf) continue;
    let X=P.partners.get(pa);
    if(!X){X={name:pa,type:o.e?.jenis||'',contracts:[],byDate:new Map(),src:new Map(),isNew:true};P.partners.set(pa,X);}
    X.byDate.set(d,(X.byDate.get(d)||0)+o.v); X.src.set(d,o.src);
    P.byDate.set(d,(P.byDate.get(d)||0)+o.v);
  }
  const curM=+asOf.slice(5,7)-1, dayOfM=+asOf.slice(8,10), dim=new Date(Date.UTC(2026,curM+1,0)).getUTCDate();
  const rem=Math.max(1,diffDays(asOf,YEAR_END));
  const last=(n,off=0)=>{const a=[];for(let i=n-1+off;i>=off;i--)a.push(addDays(asOf,-i));return a;};
  const d30=last(30), d14=last(14), p14=last(14,14), d60=last(60), p30=last(30,30);
  for(const P of plants){
    const m=new Array(12).fill(0);
    for(let i=0;i<3;i++) m[i]=P.rekap[i]||0;
    for(const [d,v] of P.byDate){ const mi=+d.slice(5,7)-1; if(mi>=3) m[mi]+=v; }
    P.monthly=m; P.akum=m.reduce((a,b)=>a+b,0);
    const sum=ds=>ds.reduce((a,d)=>a+(P.byDate.get(d)||0),0);
    P.s30=sum(d30); P.r30=P.s30/30; P.s14=sum(d14); P.sp14=sum(p14);
    P.zero14=d14.filter(d=>!(P.byDate.get(d)>0)).length;
    P.target=(S.targets&&S.targets[P.name]>0)?S.targets[P.name]:P.targetXls;
    P.rem=rem; P.need=Math.max(0,P.target-P.akum)/rem;
    P.proj=P.akum+P.r30*rem;
    P.status = P.akum>=P.target ? 'aman' : P.proj>=P.target ? 'aman' : P.proj>=0.9*P.target ? 'waspada' : 'kritis';
    let ld=null; for(const [d,v] of P.byDate) if(v>0 && (!ld||d>ld)) ld=d; P.lastDate=ld;
    P.mtd=m[curM]; P.doM=P.do[curM]||0; P.doPro=P.doM*dayOfM/dim;
    P.daily60=d60.map(d=>({d,v:P.byDate.get(d)||0}));
    const pl=[];
    for(const X of P.partners.values()){
      const s=ds=>ds.reduce((a,d)=>a+(X.byDate.get(d)||0),0);
      X.s30=s(d30); X.sp30=s(p30); X.s14=s(d14); X.sp14=s(p14);
      let l=null,ytd=0; for(const [d,v] of X.byDate){ytd+=v; if(v>0&&(!l||d>l)) l=d;}
      X.ytd=ytd; X.lastDate=l; X.since=l?diffDays(l,asOf):Infinity;
      X.share=P.s30>0?X.s30/P.s30:0; X.trend=X.sp14>0?(X.s14-X.sp14)/X.sp14:null;
      X.spark=d30.map(d=>X.byDate.get(d)||0);
      X.status = X.since>30 ? 'nonaktif' : X.since>=7 ? 'pasif' : (X.trend!==null && X.trend<-0.3) ? 'melambat' : 'aktif';
      pl.push(X);
    }
    pl.sort((a,b)=>b.s30-a.s30||b.ytd-a.ytd);
    P.plist=pl;
  }
  const M={plants,pm,asOf,curM,dayOfM,dim,rem,daily,d30};
  S.M_asOfMonth=asOf.slice(0,7);
  for(const P of plants) P.alerts=alertsFor(P,M);
  M.issues=buildIssues(M);
  return M;
}
function sysId(P,rule,extra){ return 'sys-'+slug(P.name)+'-'+rule+(extra?'-'+slug(extra):'')+'-'+S.M_asOfMonth; }
function alertsFor(P,M){
  const A=[];
  if(P.akum>=P.target){
    A.push({sev:'good',rule:'done',title:'Target Waiver sudah tercapai',detail:`Akumulasi ${f0(P.akum)} MT ≥ target Waiver ${f0(P.target)} MT (${pct(P.akum/P.target)}).`,
      act:['Pertahankan laju pasokan dan jaga kapasitas stockpile PLTU','Gunakan kelebihan kapasitas mitra untuk uji coba jenis biomassa baru atau membantu PLTU lain']});
  } else if(P.status!=='aman'){
    A.push({sev:P.status==='kritis'?'critical':'warning',rule:'proj',title:`Proyeksi akhir tahun ${pct(P.proj/P.target)} dari target Waiver`,
      detail:`Laju 30 hari ${f1(P.r30)} MT/hari, kebutuhan ${f1(P.need)} MT/hari selama ${P.rem} hari tersisa. Perkiraan kurang ${f0(P.target-P.proj)} MT pada 31 Des.`,
      act:[`Naikkan laju harian sebesar ${f1(P.need-P.r30)} MT/hari; bagi tambahan kuota ke mitra aktif sesuai kapasitas`,
        'Rapat percepatan dengan mitra minggu ini: konfirmasi kapasitas armada & stok tiap mitra',
        'Aktifkan kembali mitra pasif atau tunjuk mitra pengganti via SPK jangka pendek',
        'Koordinasi dengan PLTU soal kesiapan penerimaan (bongkar, stockpile) untuk volume lebih tinggi']});
  }
  if(P.doM>0 && M.dayOfM>=5 && P.mtd<0.8*P.doPro)
    A.push({sev:'warning',rule:'do',title:`Realisasi ${MONTHS_L[M.curM]} di bawah DO`,detail:`${f0(P.mtd)} MT terhadap DO prorata ${f0(P.doPro)} MT (${pct(P.mtd/P.doPro)}). DO penuh bulan ini ${f0(P.doM)} MT.`,
      act:['Minta tiap mitra menyampaikan rencana kirim harian sampai akhir bulan','Prioritaskan mitra dengan stok siap kirim']});
  if(P.lastDate && diffDays(P.lastDate,M.asOf)>=2)
    A.push({sev:'warning',rule:'stale',title:'Data pasokan belum diperbarui',detail:`Pasokan terakhir tercatat ${dLong(P.lastDate)}.`,act:['Ingatkan mitra mengisi laporan harian','Konfirmasi ke PLTU apakah memang tidak ada penerimaan']});
  if(P.zero14>=4 && P.akum<P.target)
    A.push({sev:'warning',rule:'zero',title:`${P.zero14} hari tanpa pasokan dalam 14 hari terakhir`,detail:'Pasokan tidak kontinu meningkatkan risiko kekurangan stok di PLTU.',act:['Susun jadwal kirim bergilir antar mitra agar tiap hari ada penerimaan','Tetapkan stok minimum di stockpile PLTU']});
  const top=P.plist[0];
  if(top && P.s30>0 && top.share>0.6)
    A.push({sev:'info',rule:'conc',partner:top.name,title:`Ketergantungan pada ${top.name}`,detail:`${pct(top.share)} pasokan 30 hari terakhir berasal dari satu mitra.`,act:['Siapkan mitra cadangan dan bagi kuota agar tidak bergantung pada satu pemasok','Pastikan kontrak mitra utama memuat komitmen volume minimum dan sanksi']});
  for(const X of P.plist){
    if(X.status==='pasif')
      A.push({sev:'warning',rule:'pasif',partner:X.name,title:`${X.name} tidak mengirim ${X.since} hari`,detail:`Pengiriman terakhir ${dLong(X.lastDate)}. Volume 30 hari sebelumnya ${f0(X.sp30)} MT.`,
        act:['Hubungi mitra untuk klarifikasi penyebab dan tanggal kirim berikutnya','Bila tanpa kepastian, terbitkan teguran sesuai kontrak dan alihkan kuota ke mitra lain']});
    else if(X.status==='melambat' && X.sp14>=50)
      A.push({sev:'info',rule:'slow',partner:X.name,title:`${X.name} melambat ${pct(-X.trend)}`,detail:`${f0(X.s14)} MT dalam 14 hari terakhir vs ${f0(X.sp14)} MT di 14 hari sebelumnya.`,act:['Cek kendala armada, mesin, atau bahan baku mitra','Minta rencana pemulihan volume mingguan']});
  }
  const ord={critical:0,warning:1,info:2,good:3}; A.sort((a,b)=>ord[a.sev]-ord[b.sev]);
  for(const a of A){ a.plant=P.name; a.id=sysId(P,a.rule,a.partner); }
  return A;
}
function buildIssues(M){
  const L=[];
  for(const [id,e] of S.entries){
    if(!e.kendala||e.kendala==='none') continue;
    L.push({id:'mitra-'+id,src:'Laporan mitra',plant:e.plant,partner:e.partner,date:e.date,end:e.date,cat:e.kendala,text:e.ket||CATS[e.kendala]?.label||'',by:e.uid,sev:'warning'});
  }
  const notes=[...S.base.notes].sort((a,b)=>(a.plant+a.partner+a.text+a.date).localeCompare(b.plant+b.partner+b.text+b.date));
  let g=null;
  for(const n of notes){
    if(g && g.plant===n.plant && g.partner===n.partner && g.text===n.text && diffDays(g.end,n.date)<=2){ g.end=n.date; g.days++; continue; }
    g={id:'xls-'+slug(n.plant)+'-'+slug(n.partner||'pltu')+'-'+n.date,src:'Catatan Excel',plant:n.plant,partner:n.partner,date:n.date,end:n.date,days:1,cat:classify(n.text),text:n.text,sev:'info'};
    L.push(g);
  }
  for(const P of M.plants) for(const a of P.alerts) if(a.sev==='critical'||a.sev==='warning')
    L.push({id:a.id,src:'Peringatan sistem',plant:P.name,partner:a.partner||'',date:M.asOf,end:M.asOf,cat:a.rule==='pasif'?'armada':'kinerja',title:a.title,text:a.detail,act:a.act,sev:a.sev});
  return L;
}
const fuOf = I => S.followups.get(slug(I.id))||{};
const fuStatus = I => fuOf(I).status || 'open';

/* ---------- tooltip ---------- */
const tip=$('#tip');
function showTip(html,ev){ tip.innerHTML=html; tip.hidden=false; const w=tip.offsetWidth,h=tip.offsetHeight; let x=ev.clientX+14,y=ev.clientY+14; if(x+w>innerWidth-8)x=ev.clientX-w-14; if(y+h>innerHeight-8)y=ev.clientY-h-14; tip.style.left=Math.max(8,x)+'px'; tip.style.top=Math.max(8,y)+'px'; }
const hideTip=()=>{tip.hidden=true;};

/* ---------- charts ---------- */
function niceMax(v){ if(v<=0) return 10; const e=Math.pow(10,Math.floor(Math.log10(v))); const n=v/e; return (n<=1?1:n<=2?2:n<=2.5?2.5:n<=5?5:10)*e; }
function yAxis(w,h,m,max,ticks=4){
  let s='';
  for(let i=0;i<=ticks;i++){ const v=max*i/ticks, y=h-m.b-(h-m.t-m.b)*i/ticks;
    s+=`<line x1="${m.l}" x2="${w-m.r}" y1="${y}" y2="${y}" stroke="var(--line)" stroke-width="1"/>`;
    s+=`<text x="${m.l-6}" y="${y+4}" text-anchor="end" class="num">${max>=10000?nf1.format(v/1000)+'rb':f0(v)}</text>`; }
  return s;
}
function barChart(el,{labels,values,refs,height=240,tipFn,highlight}){
  const w=Math.max(280,el.clientWidth||600), h=height, m={l:46,r:8,t:10,b:24};
  const max=niceMax(Math.max(...values,...(refs||[]).filter(Boolean)));
  const n=labels.length, bw=(w-m.l-m.r)/n, Y=v=>h-m.b-(h-m.t-m.b)*v/max;
  let s=yAxis(w,h,m,max); const barW=Math.min(34,bw*0.62);
  labels.forEach((lb,i)=>{
    const cx=m.l+bw*i+bw/2, v=values[i];
    if(v>0){ const y=Y(v), x=cx-barW/2, r=Math.min(4,barW/2,(h-m.b-y));
      s+=`<path d="M${x},${h-m.b}V${y+r}Q${x},${y} ${x+r},${y}H${x+barW-r}Q${x+barW},${y} ${x+barW},${y+r}V${h-m.b}Z" fill="${highlight&&highlight(i)?'var(--bar-2)':'var(--bar)'}"/>`; }
    if(refs && refs[i]>0){ const y=Y(refs[i]); s+=`<line x1="${cx-barW/2-4}" x2="${cx+barW/2+4}" y1="${y}" y2="${y}" stroke="var(--ref)" stroke-width="2" stroke-linecap="round"/>`; }
    s+=`<text x="${cx}" y="${h-6}" text-anchor="middle">${esc(lb)}</text>`;
    s+=`<rect class="hit" data-i="${i}" x="${m.l+bw*i}" y="${m.t}" width="${bw}" height="${h-m.t-m.b}" fill="transparent"/>`;
  });
  s+=`<line x1="${m.l}" x2="${w-m.r}" y1="${h-m.b}" y2="${h-m.b}" stroke="var(--axis)"/>`;
  el.innerHTML=`<svg viewBox="0 0 ${w} ${h}" height="${h}" role="img">${s}</svg>`;
  el.querySelectorAll('.hit').forEach(r=>{ r.addEventListener('mousemove',ev=>showTip(tipFn(+r.dataset.i),ev)); r.addEventListener('mouseleave',hideTip); });
}
function dailyChart(el,{rows,need,height=240}){
  const w=Math.max(280,el.clientWidth||600), h=height, m={l:46,r:8,t:10,b:24};
  const vals=rows.map(r=>r.v);
  const avg=rows.map((r,i)=>{const s=rows.slice(Math.max(0,i-6),i+1);return s.reduce((a,b)=>a+b.v,0)/s.length;});
  const max=niceMax(Math.max(...vals,need||0,1));
  const n=rows.length, bw=(w-m.l-m.r)/n, Y=v=>h-m.b-(h-m.t-m.b)*v/max;
  let s=yAxis(w,h,m,max); const barW=Math.max(1,bw-2);
  rows.forEach((r,i)=>{ if(r.v>0){const y=Y(r.v); s+=`<rect x="${m.l+bw*i+1}" y="${y}" width="${barW}" height="${h-m.b-y}" rx="${Math.min(2,barW/2)}" fill="var(--bar)" opacity=".85"/>`;}
    if(i%10===0) s+=`<text x="${m.l+bw*i+bw/2}" y="${h-6}" text-anchor="middle">${dLabel(r.d)}</text>`; });
  s+=`<polyline fill="none" stroke="var(--crit)" stroke-width="2" stroke-linejoin="round" points="${avg.map((v,i)=>`${m.l+bw*i+bw/2},${Y(v)}`).join(' ')}"/>`;
  if(need>0){ const y=Y(need); s+=`<line x1="${m.l}" x2="${w-m.r}" y1="${y}" y2="${y}" stroke="var(--ref)" stroke-width="1.5" stroke-dasharray="5 4"/><text x="${w-m.r}" y="${y-5}" text-anchor="end" class="lbl" style="paint-order:stroke;stroke:var(--surface);stroke-width:4px">butuh ${f1(need)}/hari</text>`; }
  s+=`<line x1="${m.l}" x2="${w-m.r}" y1="${h-m.b}" y2="${h-m.b}" stroke="var(--axis)"/>`;
  rows.forEach((r,i)=>{ s+=`<rect class="hit" data-i="${i}" x="${m.l+bw*i}" y="${m.t}" width="${bw}" height="${h-m.t-m.b}" fill="transparent"/>`; });
  el.innerHTML=`<svg viewBox="0 0 ${w} ${h}" height="${h}" role="img">${s}</svg>`;
  el.querySelectorAll('.hit').forEach(r=>{ const i=+r.dataset.i; r.addEventListener('mousemove',ev=>showTip(`<b>${dLong(rows[i].d)}</b><br>${f1(rows[i].v)} MT<br>Rata-rata 7 hari: ${f1(avg[i])} MT`,ev)); r.addEventListener('mouseleave',hideTip); });
}
function cumChart(el,P,M,height=240){
  const w=Math.max(280,el.clientWidth||600), h=height, m={l:46,r:56,t:12,b:24};
  const pts=[{x:0,y:0,lab:'1 Jan'}]; let c=0;
  for(let i=0;i<=M.curM;i++){ c+=P.monthly[i]; const x=i<M.curM?i+1:i+M.dayOfM/M.dim; pts.push({x,y:c,lab:i<M.curM?'Akhir '+MONTHS_L[i]:dLong(M.asOf)}); }
  const max=niceMax(Math.max(P.target,P.proj,c));
  const X=x=>m.l+(w-m.l-m.r)*x/12, Y=v=>h-m.b-(h-m.t-m.b)*v/max;
  let s=yAxis(w,h,m,max);
  for(let i=0;i<12;i++) s+=`<text x="${X(i+.5)}" y="${h-6}" text-anchor="middle">${MONTHS[i]}</text>`;
  { const y=Y(P.target); s+=`<line x1="${m.l}" x2="${w-m.r}" y1="${y}" y2="${y}" stroke="var(--ref)" stroke-width="1.5"/><text x="${w-m.r+6}" y="${y+4}" class="lbl">Waiver</text><text x="${w-m.r+6}" y="${y+17}">${nf1.format(P.target/1000)}rb</text>`; }
  const last=pts[pts.length-1];
  s+=`<path d="M${pts.map(p=>X(p.x)+','+Y(p.y)).join('L')}L${X(last.x)},${h-m.b}L${X(0)},${h-m.b}Z" fill="var(--bar)" opacity=".12"/>`;
  s+=`<polyline fill="none" stroke="var(--bar)" stroke-width="2.5" stroke-linejoin="round" points="${pts.map(p=>X(p.x)+','+Y(p.y)).join(' ')}"/>`;
  s+=`<line x1="${X(last.x)}" y1="${Y(last.y)}" x2="${X(12)}" y2="${Y(P.proj)}" stroke="var(--proj)" stroke-width="2" stroke-dasharray="6 4"/>`;
  s+=`<circle cx="${X(12)}" cy="${Y(P.proj)}" r="4" fill="var(--surface)" stroke="var(--proj)" stroke-width="2"/>`;
  pts.slice(1).forEach((p,i)=>{ s+=`<circle cx="${X(p.x)}" cy="${Y(p.y)}" r="${i===pts.length-2?5:3}" fill="var(--bar)" stroke="var(--surface)" stroke-width="2"/>`; });
  s+=`<line x1="${m.l}" x2="${w-m.r}" y1="${h-m.b}" y2="${h-m.b}" stroke="var(--axis)"/>`;
  const hits=[...pts.slice(1).map(p=>({...p,t:`<b>${p.lab}</b><br>Kumulatif ${f0(p.y)} MT<br>${pct(p.y/P.target)} dari Waiver`})),{x:12,y:P.proj,t:`<b>Proyeksi 31 Des</b><br>${f0(P.proj)} MT (${pct(P.proj/P.target)} Waiver)<br>Laju ${f1(P.r30)} MT/hari`}];
  hits.forEach((p,i)=>{ s+=`<circle class="hit" data-i="${i}" cx="${X(p.x)}" cy="${Y(p.y)}" r="12" fill="transparent"/>`; });
  el.innerHTML=`<svg viewBox="0 0 ${w} ${h}" height="${h}" role="img">${s}</svg>`;
  el.querySelectorAll('.hit').forEach(r=>{ r.addEventListener('mousemove',ev=>showTip(hits[+r.dataset.i].t,ev)); r.addEventListener('mouseleave',hideTip); });
}
function spark(vals){
  const w=84,h=22,max=Math.max(...vals,1); const pts=vals.map((v,i)=>`${(w*i/(vals.length-1)).toFixed(1)},${(h-2-(h-4)*v/max).toFixed(1)}`);
  return `<svg width="${w}" height="${h}" viewBox="0 0 ${w} ${h}" aria-hidden="true"><path d="M0,${h}L${pts.join('L')}L${w},${h}Z" fill="var(--bar)" opacity=".15"/><polyline points="${pts.join(' ')}" fill="none" stroke="var(--bar)" stroke-width="1.5"/></svg>`;
}

/* ---------- map (manager) ---------- */
const COORDS={'Pulang Pisau':[-2.80,114.22],'Teluk Balikpapan':[-1.17,116.78],'Ketapang':[-1.79,110.03],'Sintang':[0.04,111.53],
  'Sanggau':[0.09,110.63],'Bengkayang':[0.70,108.89],'Asam Asam':[-3.92,115.10],'Berau':[2.20,117.45],'Malinau':[3.60,116.60]};
const LBL={'Sanggau':[-1,'end'],'Malinau':[-1,'end']};
const coordOf=n=>(S.coords&&S.coords[n])||COORDS[n];
function renderMap(){
  const el=$('#map'); if(!S.geo||!S.M) return;
  const G=S.geo, Pj=(la,lo)=>[(lo-G.B.w)*G.K,(G.B.n-la)*G.K];
  const t=(la,lo,txt,cls)=>{const [x,y]=Pj(la,lo);return `<text x="${x.toFixed(0)}" y="${y.toFixed(0)}" class="${cls}" text-anchor="middle">${txt}</text>`;};
  const ps=[...S.M.plants].sort((a,b)=>b.akum-a.akum); const mx=Math.max(...ps.map(p=>p.akum),1);
  const col={aman:'var(--good)',waspada:'var(--warn)',kritis:'var(--crit)'};
  let s=`<rect x="0" y="0" width="1000" height="${G.H}" fill="var(--sea)"/><path d="${G.other}" fill="var(--land-2)"/>
   <path d="${G.land}" fill="var(--land)" stroke="var(--coast)" stroke-width="1.2" stroke-linejoin="round"/>
   <path d="${G.border}" fill="none" stroke="var(--border)" stroke-width="1.4" stroke-dasharray="6 4"/>`;
  s+=t(-0.85,110.75,'Kalimantan Barat','prov')+t(-1.15,113.25,'Kalimantan Tengah','prov')+t(-2.55,115.75,'Kalsel','prov')+t(0.55,116.05,'Kalimantan Timur','prov')+t(2.75,115.55,'Kaltara','prov');
  s+=t(2.15,112.9,'SARAWAK','cty')+t(5.3,116.9,'SABAH','cty')+t(4.55,114.35,'BRUNEI','cty');
  s+=t(2.7,109.2,'Laut Natuna','seat')+t(-4.35,112.2,'Laut Jawa','seat')+t(-2.3,118.15,'Selat Makassar','seat')+t(3.75,118.55,'Laut Sulawesi','seat');
  for(const P of ps){
    const c=coordOf(P.name); if(!c) continue; const [x,y]=Pj(c[0],c[1]); const r=9+21*Math.sqrt(P.akum/mx);
    const st=P.status; const [dx,anc]=LBL[P.name]||[1,'start']; const lx=x+dx*(r+6);
    s+=`<g class="mk" tabindex="0" role="link" aria-label="${esc(P.name)}: ${pct(P.akum/P.target)} target Waiver" data-plant="${esc(P.name)}">
      <circle cx="${x}" cy="${y}" r="${r+7}" fill="${col[st]}" opacity=".18"/>
      <circle class="ring" cx="${x}" cy="${y}" r="${r}" fill="${col[st]}" stroke="var(--land)" stroke-width="2.5"/>
      <circle cx="${x}" cy="${y}" r="2.5" fill="var(--land)"/>
      <text x="${lx}" y="${y-2}" text-anchor="${anc}">${esc(P.name)}</text>
      <text class="sub num" x="${lx}" y="${y+15}" text-anchor="${anc}">${f0(P.akum)} MT · ${pct(P.akum/P.target)}</text></g>`;
  }
  el.innerHTML=`<svg viewBox="40 30 900 925" role="img" aria-label="Peta lokasi PLTU di Kalimantan">${s}</svg>`;
  el.querySelectorAll('.mk').forEach(g=>{
    const P=S.M.pm.get(g.dataset.plant); const act=P.plist.filter(x=>x.status==='aktif'||x.status==='melambat').length;
    const nAl=P.alerts.filter(a=>a.sev==='critical'||a.sev==='warning').length;
    const html=`<b>PLTU ${esc(P.name)}</b><br>Akumulasi ${f0(P.akum)} MT<br>${pct(P.akum/P.target)} dari target Waiver ${f0(P.target)} MT<br>Laju ${f1(P.r30)} / butuh ${f1(P.need)} MT/hari<br>Proyeksi 31 Des ${f0(P.proj)} MT<br>${act} mitra aktif · ${nAl} peringatan`;
    const go=()=>{hideTip();S.plant=P.name;savePlant();location.hash='pltu';};
    g.addEventListener('mousemove',ev=>showTip(html,ev)); g.addEventListener('mouseleave',hideTip);
    g.addEventListener('click',go); g.addEventListener('keydown',e=>{if(e.key==='Enter')go();});
  });
}
function openCoordForm(){
  const f=$('#coord-form'); if(!f.hidden){f.hidden=true;return;}
  f.innerHTML=`<div class="tbl-wrap"><table class="coord-tbl"><thead><tr><th>PLTU</th><th>Lintang</th><th>Bujur</th></tr></thead><tbody>${S.M.plants.map(p=>{const c=coordOf(p.name);return `<tr><td>${esc(p.name)}</td><td><input type="number" step="0.0001" id="lat-${slug(p.name)}" value="${c[0]}" aria-label="Lintang ${esc(p.name)}"></td><td><input type="number" step="0.0001" id="lon-${slug(p.name)}" value="${c[1]}" aria-label="Bujur ${esc(p.name)}"></td></tr>`;}).join('')}</tbody></table></div>
   <p class="hint">Lintang selatan pakai minus, mis. -2.80. Salin dari Google Maps (klik kanan titik PLTU).</p><div class="row"><button class="btn sm" type="button" id="coord-save">Simpan koordinat</button><span class="err" id="coord-err" hidden></span></div>`;
  f.hidden=false;
  $('#coord-save').onclick=async()=>{
    const out={}; for(const p of S.M.plants){ const la=parseFloat($('#lat-'+slug(p.name)).value), lo=parseFloat($('#lon-'+slug(p.name)).value);
      if(!(la>-5&&la<7.5&&lo>107.5&&lo<120.5)){ const e=$('#coord-err'); e.textContent=`Koordinat ${p.name} di luar Kalimantan.`; e.hidden=false; return; } out[p.name]=[la,lo]; }
    try{ for(const [n,[la,lo]] of Object.entries(out)){ const {error}=await S.sb.from('plants').update({lat:la,lon:lo}).eq('name',n); if(error) throw error; } f.hidden=true; toast('Koordinat tersimpan'); await reload(); } catch(e){ toast(errMsg(e)); }
  };
}
function openTargetForm(){
  const f=$('#tgt-form'); if(!f.hidden){f.hidden=true;return;}
  f.innerHTML=`<div class="tbl-wrap"><table class="coord-tbl"><thead><tr><th>PLTU</th><th class="r">Target Waiver (MT)</th><th class="r">Angka Excel</th></tr></thead><tbody>${S.M.plants.map(p=>`<tr><td>${esc(p.name)}</td><td class="r"><input type="number" min="0" step="1" style="width:120px" id="tgt-${slug(p.name)}" value="${Math.round(p.target)}" aria-label="Target Waiver ${esc(p.name)}"></td><td class="r num hint">${f0(p.targetXls)}</td></tr>`).join('')}</tbody></table></div>
   <div class="row" style="margin-top:8px"><button class="btn sm" type="button" id="tgt-save">Simpan target</button><button class="btn ghost sm" type="button" id="tgt-reset">Kembalikan ke angka Excel</button><span class="err" id="tgt-err" hidden></span></div>`;
  f.hidden=false;
  const save=async(obj)=>{ try{ for(const p of S.M.plants){ const v=obj[p.name]??p.targetXls; const {error}=await S.sb.from('plants').update({target_waiver:v}).eq('name',p.name); if(error) throw error; } f.hidden=true; toast('Target Waiver tersimpan'); await reload(); } catch(e){ toast(errMsg(e)); } };
  $('#tgt-save').onclick=()=>{ const o={}; for(const p of S.M.plants){ const v=parseFloat($('#tgt-'+slug(p.name)).value); if(!(v>0)){ const e=$('#tgt-err'); e.textContent=`Isi target ${p.name} dengan angka lebih dari 0.`; e.hidden=false; return; } o[p.name]=v; } save(o); };
  $('#tgt-reset').onclick=()=>save({});
}

/* ---------- manager views ---------- */
const STATUS_L={aman:'Aman',waspada:'Waspada',kritis:'Kritis'};
const PSTAT_L={aktif:'Aktif',melambat:'Melambat',pasif:'Pasif',nonaktif:'Tidak aktif'};
const PSTAT_C={aktif:'good',melambat:'warning',pasif:'critical',nonaktif:'info'};
const SEV_L={critical:'Kritis',warning:'Waspada',info:'Info',good:'Baik'};
const stLabel=P=>P.akum>=P.target?'Waiver tercapai':STATUS_L[P.status];
function alertHTML(a,withPlant){
  return `<div class="alert ${a.sev}"><div class="alert-h"><strong>${withPlant?esc(a.plant)+' · ':''}${esc(a.title)}</strong><span class="pill ${a.sev}">${SEV_L[a.sev]}</span></div><p>${esc(a.detail)}</p>${a.act&&a.act.length?`<ul>${a.act.map(x=>`<li>${esc(x)}</li>`).join('')}</ul>`:''}</div>`;
}
function curPlant(){ const M=S.M; let P=M.pm.get(S.plant); if(!P){P=M.plants[0];S.plant=P.name;} return P; }
function savePlant(){ try{localStorage.setItem('rmk.plant',S.plant);}catch(e){} }
/* ---------- mitra belum input s/d H-1 ---------- */
function renderNotSubmitted(){
  const M=S.M; const t=todayLocal(); const y=new Date(t+'T00:00:00'); y.setDate(y.getDate()-1);
  const h1=y.getFullYear()+'-'+String(y.getMonth()+1).padStart(2,'0')+'-'+String(y.getDate()).padStart(2,'0');
  const psel=$('#ns-plant');
  if(!psel.options.length){ psel.innerHTML='<option value="">Semua PLTU</option>'+M.plants.map(p=>`<option>${esc(p.name)}</option>`).join('');
    psel.onchange=renderNotSubmitted; $('#ns-scope').onchange=renderNotSubmitted; $('#ns-ok').onchange=renderNotSubmitted; }
  const last=new Map();   // partner_id -> {d, src, uid}
  for(const r of S.rows||[]){ if(r.tanggal>h1) continue; const o=last.get(r.partner_id); if(!o||r.tanggal>o.d) last.set(r.partner_id,{d:r.tanggal,src:r.sumber,uid:r.user_id}); }
  const days=(a,b)=>Math.round((new Date(b+'T00:00:00')-new Date(a+'T00:00:00'))/864e5);
  const scope=$('#ns-scope').value, fp=psel.value, showOk=$('#ns-ok').checked;
  const order=new Map(M.plants.map((p,i)=>[p.name,i]));
  let list=S.partnersRaw.filter(p=>!fp||p.plant===fp).map(p=>{ const l=last.get(p.id); return {p,last:l?.d||null,src:l?.src||'',gap:l?days(l.d,h1):null}; });
  if(scope!=='all') list=list.filter(x=>x.last&&x.gap<=+scope);
  const pending=list.filter(x=>x.gap!==0), done=list.filter(x=>x.gap===0);
  // PIC akun yang terhubung ke mitra
  const picOf=pid=>{ const a=S.akses.filter(a=>a.partner_id===pid).map(a=>S.profiles.find(p=>p.id===a.user_id)).filter(p=>p&&p.role==='mitra'); return a[0]||null; };
  const waNum=hp=>{ let n=String(hp||'').replace(/\D/g,''); if(n.startsWith('0')) n='62'+n.slice(1); return n.length>=9?n:''; };
  const sorted=[...pending].sort((a,b)=>(b.gap??1e9)-(a.gap??1e9)||order.get(a.p.plant)-order.get(b.p.plant));
  const rows=[...sorted,...(showOk?done.sort((a,b)=>order.get(a.p.plant)-order.get(b.p.plant)):[])];
  const sev=g=>g==null?'kritis':g>=7?'kritis':g>=3?'waspada':g>=1?'info':'aman';
  const lbl=g=>g==null?'Belum pernah':g===0?'Lengkap':g+' hari';
  $('#ns-title').textContent=`Mitra belum input s/d ${dLong(h1)} (H-1)`;
  $('#ns-sub').textContent=`${fp?'PLTU '+fp:'Semua PLTU'} · ${scope==='all'?'semua mitra':'mitra yang mengirim dalam '+scope+' hari terakhir'} · Excel terakhir disinkronkan ${M.asOf?dLong(M.asOf):'-'}`;
  const c7=pending.filter(x=>x.gap==null||x.gap>=7).length, c3=pending.filter(x=>x.gap!=null&&x.gap>=3&&x.gap<7).length, c1=pending.filter(x=>x.gap!=null&&x.gap>=1&&x.gap<3).length;
  $('#ns-sum').innerHTML=`<div class="kp"><b>${pending.length}<small style="font-size:12px;font-weight:400"> / ${list.length}</small></b><span>mitra belum input s/d H-1</span></div>
    <div class="kp"><b style="color:var(--crit-ink)">${c7}</b><span>≥ 7 hari tanpa input</span></div><div class="kp"><b style="color:var(--warn-ink)">${c3}</b><span>3–6 hari</span></div><div class="kp"><b>${c1}</b><span>1–2 hari</span></div><div class="kp"><b style="color:var(--good-ink)">${done.length}</b><span>sudah lengkap s/d H-1</span></div>`;
  $('#tbl-ns').innerHTML=rows.length?`<thead><tr><th>PLTU</th><th>Mitra</th><th>Terakhir input</th><th class="r">Hari tanpa input</th><th>Sumber terakhir</th><th>PIC akun</th><th></th></tr></thead><tbody>${rows.map(x=>{ const pic=picOf(x.p.id); const wa=pic&&waNum(pic.hp);
      const msg=`Yth. ${pic?.nama||x.p.name}, mohon segera input realisasi pasokan ${x.p.name} ke PLTU ${x.p.plant}${x.last?` sejak ${dLong(x.last)}`:''} di https://dashmitrabio.github.io . Terima kasih. — PLN EPI Kalimantan`;
      const dow=x.last?['Min','Sen','Sel','Rab','Kam','Jum','Sab'][new Date(x.last+'T00:00:00').getDay()]:'';
      return `<tr><td>${esc(x.p.plant)}</td><td><strong>${esc(x.p.name)}</strong>${x.p.nama_lengkap?`<br><span class="hint">${esc(x.p.nama_lengkap)}</span>`:''}</td>
        <td class="num">${x.last?`${dow}, ${dLong(x.last)}`:'—'}</td><td class="r"><span class="pill ${sev(x.gap)}">${lbl(x.gap)}</span></td>
        <td class="hint">${x.src==='online'?'Laporan online':x.src==='excel'?'Excel':'—'}</td>
        <td>${pic?`${esc(pic.nama||pic.username||'')}${pic.hp?`<br><span class="mono hint">${esc(pic.hp)}</span>`:''}`:'<span class="hint">Belum punya akun</span>'}</td>
        <td>${wa&&x.gap!==0?`<a class="wa" href="https://wa.me/${wa}?text=${encodeURIComponent(msg)}" target="_blank" rel="noopener">WhatsApp</a>`:''}</td></tr>`; }).join('')}</tbody>`
    :`<tbody><tr><td class="empty">${pending.length?'':'Semua mitra pada cakupan ini sudah input sampai '+dLong(h1)+'.'}</td></tr></tbody>`;
}
function renderYearMonths(){
  const M=S.M, sel=$('#ym-plant'); const ps=M.plants;
  const opts=['__all',...ps.map(p=>p.name)];
  if(sel.dataset.n!==String(opts.length)){ let keep='__all'; try{ keep=localStorage.getItem('rmk.ym')||'__all'; }catch(e){}
    sel.innerHTML=`<option value="__all">Seluruh Kalimantan</option>`+ps.map(p=>`<option>${esc(p.name)}</option>`).join(''); sel.dataset.n=String(opts.length); sel.value=opts.includes(keep)?keep:'__all';
    sel.onchange=()=>{ try{localStorage.setItem('rmk.ym',sel.value);}catch(e){} renderYearMonths(); }; }
  const all=sel.value==='__all'; const P=all?null:ps.find(p=>p.name===sel.value);
  const sumArr=k=>Array.from({length:12},(_,i)=>ps.reduce((a,p)=>a+(+(p[k]?.[i])||0),0));
  const real=all?sumArr('monthly'):P.monthly, dO=all?sumArr('do'):Array.from({length:12},(_,i)=>+(P.do?.[i])||0);
  const target=all?ps.reduce((a,p)=>a+(+p.target||0),0):(+P.target||0);
  const cur=M.curM;
  $('#ym-title').textContent=`Rekap bulanan & akumulasi — ${all?'Seluruh Kalimantan':'PLTU '+P.name}`;
  $('#ym-sub').textContent=`Januari s/d ${MONTHS_L[cur]} 2026 · Target Waiver ${f0(target)} MT`;
  const pct=(a,b)=>b>0?Math.round(a/b*100)+'%':'—';
  const bar=(a,b,c)=>b>0?`<span class="mbar${c?' '+c:''}" aria-hidden="true"><i style="width:${Math.min(100,a/b*100).toFixed(1)}%"></i></span>`:'';
  let cum=0, cumDo=0, rows='';
  for(let i=0;i<12;i++){ const fut=i>cur; if(fut&&!dO[i]) continue;
    if(!fut){ cum+=real[i]; cumDo+=i===cur?dO[i]*M.dayOfM/M.dim:dO[i]; }
    rows+=`<tr class="${i===cur?'cur':''}${fut?' fut':''}"><td>${MONTHS_L[i]}${i===cur?' <span class="chip">berjalan</span>':fut?' <span class="hint">rencana</span>':''}</td>
      <td class="r num">${fut?'—':f1(real[i])}</td><td class="r num">${dO[i]?f1(dO[i]):'—'}</td>
      <td class="r num">${fut?'':pct(real[i],dO[i])}${fut?'':bar(real[i],dO[i],i===cur?'run':real[i]>=dO[i]?'ok':'bad')}</td>
      <td class="r num">${fut?'':f1(cum)}</td><td class="r num">${fut?'':pct(cum,target)}${fut?'':bar(cum,target)}</td></tr>`; }
  $('#tbl-ym').innerHTML=`<thead><tr><th>Bulan</th><th class="r">Realisasi (MT)</th><th class="r">DO (MT)</th><th class="r">% thd DO</th><th class="r">Akumulasi (MT)</th><th class="r">% Target Waiver</th></tr></thead><tbody>${rows}</tbody>
    <tfoot><tr><td>Total s/d ${MONTHS[cur]}</td><td class="r num">${f1(cum)}</td><td class="r num" title="DO ${MONTHS_L[cur]} dihitung prorata s/d tanggal ${M.dayOfM}">${f1(cumDo)}*</td><td class="r num">${pct(cum,cumDo)}</td><td class="r num">${f1(cum)}</td><td class="r num">${pct(cum,target)}</td></tr>
    <tr><td>Sisa ke target</td><td class="r num" colspan="5">${target>cum?f1(target-cum)+' MT':'Target tercapai'}</td></tr></tfoot>`;
}
function renderMonth(){
  const M=S.M, ps=M.plants, sisaHari=Math.max(0,M.dim-M.dayOfM), fr=M.dayOfM/M.dim;
  $('#month-title').textContent=`Rekap ${MONTHS_L[M.curM]} ${M.asOf.slice(0,4)} per PLTU`;
  $('#month-sub').textContent=`Data s/d ${M.dayOfM} ${MONTHS_L[M.curM]} · ${sisaHari} hari tersisa · panjang bar = DO bulan ini`;
  const row=(name,real,dO,link)=>{
    const pctDo=dO>0?real/dO:null, base=Math.max(dO,real)||1;
    const wReal=Math.min(real,dO||real)/base*100, wOver=dO>0&&real>dO?(real-dO)/base*100:0;
    const st=dO<=0?'info':pctDo>=fr*0.95?'aman':pctDo>=fr*0.8?'waspada':'kritis';
    const stL=dO<=0?'DO belum ada':pctDo>=1?'DO tercapai':st==='aman'?'Sesuai jalur':st==='waspada'?'Sedikit tertinggal':'Tertinggal';
    const need=dO>real&&sisaHari>0?(dO-real)/sisaHari:0;
    const bar=`<div class="dobar" title="Realisasi ${f1(real)} MT dari DO ${f0(dO)} MT">${dO>0?`<i class="real" style="width:${wReal}%"></i>`:`<i class="real" style="width:${real>0?100:0}%"></i>`}${wOver?`<i class="over" style="left:${wReal}%;width:${wOver}%"></i>`:''}${dO>0?`<i class="exp" style="left:${Math.min(100,dO*fr/base*100)}%"></i>`:''}<div class="lbl"><span style="${(dO>0?wReal:(real>0?100:0))<14?'color:var(--ink);text-shadow:none':''}">${f0(real)}</span><span style="${(wReal+wOver)>86?'color:#fff;text-shadow:0 0 2px rgba(0,0,0,.35)':''}">${dO>0?pct(pctDo):''}</span></div></div>`;
    return `<tr ${link?`class="click" data-plant="${esc(name)}" tabindex="0"`:''}><td><strong>${esc(name)}</strong></td><td class="barcell">${bar}</td><td class="r num">${f0(real)}</td><td class="r num">${dO>0?f0(dO):'—'}</td><td class="r num">${dO>0?f0(Math.max(0,dO-real)):'—'}</td><td class="r num">${need?f1(need):'—'}</td><td><span class="pill ${st}">${stL}</span></td></tr>`;
  };
  const tr=ps.reduce((a,p)=>a+p.mtd,0), td=ps.reduce((a,p)=>a+p.doM,0);
  $('#tbl-month').innerHTML=`<thead><tr><th>PLTU</th><th>Realisasi terhadap DO</th><th class="r">Realisasi (MT)</th><th class="r">DO (MT)</th><th class="r">Sisa DO (MT)</th><th class="r">Butuh/hari</th><th>Status</th></tr></thead>
    <tbody>${ps.map(p=>row(p.name,p.mtd,p.doM,true)).join('')}</tbody>
    <tfoot>${row('Total Kalimantan',tr,td,false)}</tfoot>`;
  $('#tbl-month').querySelectorAll('tr.click').forEach(r=>{ const go=()=>{S.plant=r.dataset.plant;savePlant();location.hash='pltu';}; r.onclick=go; r.onkeydown=e=>{if(e.key==='Enter')go();}; });
}
function renderRingkasan(){
  const M=S.M, ps=M.plants;
  renderMonth();
  renderYearMonths();
  renderNotSubmitted();
  const akum=ps.reduce((a,p)=>a+p.akum,0), tg=ps.reduce((a,p)=>a+p.target,0);
  const proj=ps.reduce((a,p)=>a+p.proj,0), r30=ps.reduce((a,p)=>a+p.r30,0), need=Math.max(0,tg-akum)/M.rem;
  const mtd=ps.reduce((a,p)=>a+p.mtd,0), doM=ps.reduce((a,p)=>a+p.doM,0), doPro=ps.reduce((a,p)=>a+p.doPro,0);
  const cnt={aman:0,waspada:0,kritis:0}; ps.forEach(p=>cnt[p.status]++);
  $('#kpis').innerHTML=`
   <div class="kpi"><span class="eyebrow">Akumulasi 2026</span><span class="v num">${f0(akum)}<small>MT</small></span><span class="s">${pct(akum/tg)} dari target Waiver ${f0(tg)} MT</span><div class="meter"><i style="width:${Math.min(100,akum/tg*100)}%"></i></div><span class="s">Sisa ${f0(Math.max(0,tg-akum))} MT</span></div>
   <div class="kpi"><span class="eyebrow">Laju vs kebutuhan</span><span class="v num">${f0(r30)}<small>/ ${f0(need)} MT/hari</small></span><span class="s">Laju 30 hari terhadap kebutuhan harian ke target Waiver (${M.rem} hari tersisa)</span></div>
   <div class="kpi"><span class="eyebrow">Proyeksi 31 Desember</span><span class="v num">${f0(proj)}<small>MT</small></span><span class="s">${pct(proj/tg)} dari Waiver · ${proj>=tg?'surplus':'kurang'} ${f0(Math.abs(tg-proj))} MT</span></div>
   <div class="kpi"><span class="eyebrow">${MONTHS_L[M.curM]} s/d tgl ${M.dayOfM}</span><span class="v num">${f0(mtd)}<small>MT</small></span><span class="s">${doM?`${pct(mtd/doPro)} dari DO prorata · DO penuh ${f0(doM)} MT`:'DO bulan ini belum diisi'}</span><span class="s"><span class="pill aman">${cnt.aman} aman</span> <span class="pill waspada">${cnt.waspada} waspada</span> <span class="pill kritis">${cnt.kritis} kritis</span></span></div>`;
  renderMap();
  const tot=Array.from({length:12},(_,i)=>ps.reduce((a,p)=>a+p.monthly[i],0));
  const dos=Array.from({length:12},(_,i)=>ps.reduce((a,p)=>a+(p.do[i]||0),0));
  barChart($('#ch-month-all'),{labels:MONTHS,values:tot,refs:dos,highlight:i=>i===M.curM,
    tipFn:i=>`<b>${MONTHS_L[i]} 2026</b><br>Realisasi ${f0(tot[i])} MT<br>DO ${dos[i]?f0(dos[i])+' MT · '+pct(tot[i]/dos[i]):'belum ada'}${i===M.curM?'<br>Bulan berjalan s/d tgl '+M.dayOfM:''}`});
  const all=ps.flatMap(p=>p.alerts.filter(a=>a.sev==='critical'||a.sev==='warning'));
  const nReq=S.req.filter(r=>r.status==='menunggu').length;
  $('#alert-count').textContent=all.length+' peringatan aktif';
  $('#top-alerts').innerHTML=(nReq?`<div class="alert info"><div class="alert-h"><strong>${nReq} permintaan akses mitra menunggu persetujuan</strong><a class="btn sm" href="#akses">Tinjau</a></div></div>`:'')+
    (all.length ? all.slice(0,6).map(a=>alertHTML(a,true)).join('') : '<p class="empty">Tidak ada peringatan. Semua PLTU sesuai jalur.</p>');
  $('#tbl-plants').innerHTML=`<thead><tr><th>PLTU</th><th class="r">Akumulasi</th><th>Capaian target Waiver</th><th class="r">Laju 30 hr</th><th class="r">Butuh/hari</th><th class="r">Proyeksi 31 Des</th><th>Status</th><th class="r">Pasokan terakhir</th></tr></thead><tbody>${
    ps.map(p=>`<tr class="click" data-plant="${esc(p.name)}" tabindex="0"><td><strong>${esc(p.name)}</strong><br><span class="hint">${p.plist.filter(x=>x.status!=='nonaktif').length} mitra aktif</span></td>
      <td class="r num">${f0(p.akum)}</td>
      <td><div class="prog"><span class="num" style="font-size:12px">${pct(p.akum/p.target)} dari ${f0(p.target)} MT</span><div class="meter"><i style="width:${Math.min(100,p.akum/p.target*100)}%"></i></div></div></td>
      <td class="r num">${f1(p.r30)}</td><td class="r num">${p.need>0?f1(p.need):'—'}</td>
      <td class="r num">${f0(p.proj)}<br><span class="hint">${pct(p.proj/p.target)} Waiver</span></td>
      <td><span class="pill ${p.status}">${stLabel(p)}</span></td>
      <td class="r num">${p.lastDate?dLabel(p.lastDate):'—'}</td></tr>`).join('')}</tbody>`;
  $('#tbl-plants').querySelectorAll('tr.click').forEach(tr=>{ const go=()=>{S.plant=tr.dataset.plant; savePlant(); location.hash='pltu';}; tr.addEventListener('click',go); tr.addEventListener('keydown',e=>{if(e.key==='Enter')go();}); });
}
function renderDailyMatrix(P){
  const M=S.M, sel=$('#dm-month');
  if(!sel.options.length){ sel.innerHTML=Array.from({length:M.curM+1},(_,i)=>i).reverse().map(i=>`<option value="${i}">${MONTHS_L[i]} 2026</option>`).join(''); sel.value=String(M.curM); sel.onchange=()=>renderDailyMatrix(curPlant()); }
  const m=+sel.value, mm=String(m+1).padStart(2,'0'), days=new Date(2026,m+1,0).getDate();
  const dates=Array.from({length:days},(_,i)=>`2026-${mm}-${String(i+1).padStart(2,'0')}`);
  const cols=[...P.partners.values()].filter(X=>dates.some(d=>X.byDate.get(d)>0)).sort((a,b)=>{ const s=X=>dates.reduce((t,d)=>t+(X.byDate.get(d)||0),0); return s(b)-s(a); });
  const doM=+(P.do?.[m])||0;
  $('#dm-title').textContent=`Realisasi harian per mitra — PLTU ${P.name}`;
  $('#dm-sub').textContent=`${MONTHS_L[m]} 2026 · ${cols.length} mitra mengirim · DO ${doM?f0(doM)+' MT':'—'}`;
  if(m<3){ $('#tbl-dm').innerHTML=`<tbody><tr><td class="empty">Januari–Maret hanya tersedia sebagai total bulanan dari sheet Rekap (${f1(P.monthly[m])} MT). Data harian tersedia mulai April.</td></tr></tbody>`; $('#dm-csv').disabled=true; return; }
  $('#dm-csv').disabled=false;
  if(!cols.length){ $('#tbl-dm').innerHTML=`<tbody><tr><td class="empty">Belum ada pengiriman tercatat di ${MONTHS_L[m]}.</td></tr></tbody>`; return; }
  const today=M.asOf; let cum=0; const colTot=cols.map(()=>0);
  const body=dates.map((d,i)=>{ const dow=new Date(2026,m,i+1).getDay(); const fut=d>today; let tot=0;
    const cells=cols.map((X,j)=>{ const v=X.byDate.get(d)||0; tot+=v; colTot[j]+=v; const on=X.src.get(d)==='mitra'||X.src.get(d)==='online'; return `<td class="r num${on?' on':''}"${on?' title="Laporan online mitra"':''}>${v>0?f1(v):''}</td>`; }).join('');
    cum+=tot; const pctDo=doM?Math.round(cum/doM*100)+'%':'';
    return `<tr class="${dow===0?'wk':''}${fut?' fut':''}${d===today?' today':''}"><td>${i+1} <span class="hint">${DOW[dow]}</span></td>${cells}<td class="r num tot">${tot>0?f1(tot):fut?'':'0'}</td><td class="r num">${fut?'':f1(cum)}</td><td class="r num hint">${fut?'':pctDo}</td></tr>`; }).join('');
  const nDays=dates.filter(d=>d<=today).length||1;
  $('#tbl-dm').innerHTML=`<thead><tr><th>Tgl</th>${cols.map(X=>`<th class="r mt" title="${esc(X.name)}">${esc(X.name)}</th>`).join('')}<th class="r tot">Total</th><th class="r">Akumulasi</th><th class="r">% DO</th></tr></thead><tbody>${body}</tbody>
    <tfoot><tr><td>Total</td>${colTot.map(v=>`<td class="r num">${f1(v)}</td>`).join('')}<td class="r num tot">${f1(cum)}</td><td class="r num">${f1(cum)}</td><td class="r num">${doM?Math.round(cum/doM*100)+'%':'—'}</td></tr>
    <tr><td>Rata-rata/hari</td>${colTot.map(v=>`<td class="r num">${f1(v/nDays)}</td>`).join('')}<td class="r num tot">${f1(cum/nDays)}</td><td colspan="2" class="hint" style="font-weight:400">${doM?`perlu ${f1(doM/days)}/hari`:''}</td></tr></tfoot>`;
  $('#dm-csv').onclick=()=>{ const q=v=>`"${String(v).replace(/"/g,'""')}"`; const n=v=>String(Math.round(v*1000)/1000).replace('.',','); const SEP=';';
    const lines=[[`Tanggal`,...cols.map(X=>X.name),'Total','Akumulasi'].map(q).join(SEP)]; let c=0;
    for(const d of dates){ let t=0; const vs=cols.map(X=>{ const v=X.byDate.get(d)||0; t+=v; return v?n(v):''; }); c+=t; lines.push([d.split('-').reverse().join('/'),...vs,t?n(t):'',n(c)].map(q).join(SEP)); }
    lines.push([q('Total'),...colTot.map(v=>q(n(v))),q(n(c)),q('')].join(SEP));
    const blob=new Blob(['﻿'+lines.join('\r\n')],{type:'text/csv;charset=utf-8'}); const a=document.createElement('a'); a.href=URL.createObjectURL(blob); a.download=`Realisasi harian ${P.name} ${MONTHS_L[m]} 2026.csv`; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500); };
}
function renderPltu(){
  const M=S.M, P=curPlant();
  $('#plant-pick').innerHTML=M.plants.map(p=>`<button type="button" aria-pressed="${p===P}" data-plant="${esc(p.name)}"><span class="dot" style="background:var(--${p.status==='aman'?'good':p.status==='waspada'?'warn':'crit'})"></span>${esc(p.name)}</button>`).join('');
  $('#plant-pick').querySelectorAll('button').forEach(b=>b.onclick=()=>{S.plant=b.dataset.plant;savePlant();renderPltu();});
  $('#pkpis').innerHTML=`
   <div class="kpi"><span class="eyebrow">Akumulasi 2026</span><span class="v num">${f0(P.akum)}<small>MT</small></span><span class="s">Target Waiver ${f0(P.target)} MT${P.target!==P.targetXls?' (diubah)':''}</span><div class="meter"><i style="width:${Math.min(100,P.akum/P.target*100)}%"></i></div></div>
   <div class="kpi"><span class="eyebrow">Capaian</span><span class="v num">${pct(P.akum/P.target)}<small>Waiver</small></span><span class="s">${P.akum>=P.target?`Lebih ${f0(P.akum-P.target)} MT dari target`:`Sisa ${f0(P.target-P.akum)} MT ke target Waiver`}</span></div>
   <div class="kpi"><span class="eyebrow">Laju vs kebutuhan</span><span class="v num">${f1(P.r30)}<small>/ ${f1(P.need)} MT/hari</small></span><span class="s">Laju 30 hari terhadap kebutuhan harian ke target Waiver</span></div>
   <div class="kpi"><span class="eyebrow">Proyeksi 31 Des</span><span class="v num">${f0(P.proj)}<small>MT</small></span><span class="s"><span class="pill ${P.status}">${stLabel(P)}</span> ${pct(P.proj/P.target)} Waiver</span></div>`;
  cumChart($('#ch-cum'),P,M);
  dailyChart($('#ch-daily'),{rows:P.daily60,need:P.need});
  barChart($('#ch-month-plant'),{labels:MONTHS,values:P.monthly,refs:P.do,height:220,highlight:i=>i===M.curM,
    tipFn:i=>`<b>${MONTHS_L[i]}</b><br>Realisasi ${f1(P.monthly[i])} MT<br>DO ${P.do[i]?f0(P.do[i])+' MT · '+pct(P.monthly[i]/P.do[i]):'—'}`});
  const regBy=new Map(); const act=new Set(S.profiles.filter(p=>p.role==='mitra').map(p=>p.id)); for(const a of S.akses){ const pa=S.pById.get(a.partner_id); if(pa&&pa.plant===P.name&&act.has(a.user_id)) regBy.set(pa.name,a.user_id); }
  const rows=P.plist.filter(x=>x.ytd>0||x.isNew);
  $('#tbl-partners').innerHTML=`<thead><tr><th>Mitra</th><th class="r">30 hari</th><th class="r">Porsi</th><th>Tren 30 hari</th><th class="r">Terakhir</th><th>Status</th></tr></thead><tbody>${
    rows.map(x=>`<tr><td><strong>${esc(x.name)}</strong>${x.type?` <span class="chip">${esc(x.type)}</span>`:''}${regBy.has(x.name)?' <span class="chip" title="Punya akun pelapor">akun</span>':''}<br><span class="mono" style="color:var(--muted)">${esc(x.contracts.join(', '))||'&nbsp;'}</span></td>
     <td class="r num">${f0(x.s30)} MT</td><td class="r num">${pct(x.share)}</td><td>${spark(x.spark)}</td>
     <td class="r num">${x.lastDate?dLabel(x.lastDate):'—'}</td><td><span class="pill ${PSTAT_C[x.status]}">${PSTAT_L[x.status]}</span></td></tr>`).join('')}</tbody>`;
  renderDailyMatrix(P);
  const iss=M.issues.filter(i=>i.plant===P.name&&i.src!=='Peringatan sistem'&&diffDays(i.end,M.asOf)<=60);
  let h=P.alerts.map(a=>alertHTML(a,false)).join('');
  if(iss.length){ const byCat={}; iss.forEach(i=>{byCat[i.cat]=(byCat[i.cat]||0)+(i.days||1);});
    Object.keys(byCat).filter(c=>c!=='libur').sort((a,b)=>byCat[b]-byCat[a]).slice(0,2).forEach(c=>{ h+=alertHTML({sev:'info',title:`Kendala berulang: ${CATS[c].label}`,detail:`${byCat[c]} hari tercatat dalam 60 hari terakhir.`,act:CATS[c].act.slice(0,3)},false); }); }
  $('#plant-alerts').innerHTML=h||'<p class="empty">Tidak ada peringatan untuk PLTU ini.</p>';
}

/* ---------- input tabel bulanan ---------- */
const DOW=['Min','Sen','Sel','Rab','Kam','Jum','Sab'];
const B={key:'',edits:new Map(),orig:new Map(),focus:null};
const bulkDirty=()=>B.edits.size>0;
/* Angka dari mitra: titik maupun koma dianggap tanda desimal.
   "45,5" = "45.5" = 45,5 · bila keduanya dipakai, tanda TERAKHIR = desimal ("1.234,5" = "1,234.5" = 1234,5)
   · tanda yang sama berulang = pemisah ribuan ("1.234.567"). */
const parseNum=v=>{ v=String(v??'').trim().replace(/\s/g,''); if(!v) return null; if(/[^\d.,-]/.test(v)) return NaN;
  const lc=v.lastIndexOf(','), ld=v.lastIndexOf('.');
  if(lc>=0&&ld>=0){ const dec=lc>ld?',':'.'; const th=dec===','?'.':','; v=v.split(th).join('').replace(dec,'.'); }
  else { const sep=lc>=0?',':ld>=0?'.':''; if(sep){ const n=v.split(sep).length-1; v=n>1?v.split(sep).join(''):v.replace(sep,'.'); } }
  if(!/^-?\d*\.?\d+$|^-?\d+\.?$/.test(v)) return NaN;
  const n=Number(v); return isFinite(n)?n:NaN; };
const fmtID=n=>n==null||isNaN(n)?'':new Intl.NumberFormat('id-ID',{maximumFractionDigits:3}).format(n);
const fmtIn=v=>v==null||v===''?'':String(Math.round(+v*1000)/1000).replace('.',',');
function bulkPartner(){ const pl=$('#f-plant').value, pa=partnerName(); if(!pa||$('#f-partner').value==='__new') return null;
  if(isMgr()) return S.pByKey.get(pl+'|'+pa)||null; return mitraCtx()?.partners.find(x=>x.plant===pl&&x.name===pa)||null; }
function bulkRows(pid){ const src=(isMgr()||S.preview)?S.rows:S.my.rows; const m=new Map(); for(const r of src||[]) if(r.partner_id===pid) m.set(r.tanggal,r); return m; }
function initBulk(){
  let mode='bulk'; try{ mode=localStorage.getItem('rmk.mode')||'bulk'; }catch(e){}
  const setMode=(m,force)=>{ if(m==='day'&&bulkDirty()){ toast('Simpan atau batalkan perubahan di tabel dulu'); return; } mode=m; try{localStorage.setItem('rmk.mode',m);}catch(e){}
    $('#mode-bulk').setAttribute('aria-selected',String(m==='bulk')); $('#mode-day').setAttribute('aria-selected',String(m==='day'));
    $('#bulk').hidden=m!=='bulk'; $('#entry-form').hidden=m!=='day'; $('#input-grid').classList.toggle('solo',m==='bulk'); if(m==='bulk') renderBulk(force); };
  $('#mode-bulk').onclick=()=>setMode('bulk',true); $('#mode-day').onclick=()=>setMode('day');
  const t=todayLocal(), cm=t.slice(0,4)==='2026'?+t.slice(5,7):12; const sel=$('#b-month');
  if(!sel.options.length){ sel.innerHTML=Array.from({length:cm},(_,i)=>i+1).reverse().map(m=>`<option value="${m}">${MONTHS_L[m-1]} 2026</option>`).join(''); sel.value=String(cm); }
  sel.dataset.prev=sel.value; sel.onchange=()=>{ if(bulkDirty()){ sel.value=sel.dataset.prev; toast('Simpan atau batalkan perubahan di tabel dulu'); return; } sel.dataset.prev=sel.value; renderBulk(true); };
  $('#b-cancel').onclick=()=>{ B.edits.clear(); renderBulk(true); };
  $('#b-save').onclick=saveBulk;
  if(!B.unload){ B.unload=true; addEventListener('beforeunload',e=>{ if(bulkDirty()){ e.preventDefault(); e.returnValue=''; } }); }
  setMode(mode);
}
function renderBulk(force){
  if($('#bulk').hidden) return;
  const tb=$('#tbl-bulk'); const p=bulkPartner(); const m=+$('#b-month').value; const ro=!!S.preview;
  const key=(p?p.id:'new:'+$('#f-plant').value+'|'+partnerName())+'|'+m;
  if(!force&&key===B.key&&tb.contains(document.activeElement)) return;   // jangan ganggu yang sedang mengetik
  if(key!==B.key){ B.edits.clear(); B.key=key; const j=(p?.jenis||'').split('/')[0]; $('#b-jenis').value=['CS','WC','SD','PTK'].includes(j)?j:j?'Lain':$('#f-jenis').value; }
  const rows=p?bulkRows(p.id):new Map(); B.orig=rows;
  const days=new Date(2026,m,0).getDate(), today=todayLocal();
  const kOpts=['none',...CAT_ORDER];
  let html='';
  for(let d=1;d<=days;d++){ const ds=`2026-${String(m).padStart(2,'0')}-${String(d).padStart(2,'0')}`; const o=rows.get(ds); const e=B.edits.get(ds); const v=e||{vol:o?fmtIn(o.volume):'',rit:o?.ritase??'',kend:o?.kendala||'none',ket:o?.ket||''};
    const dow=new Date(2026,m-1,d).getDay(); const fut=ds>today; const dis=fut||ro?'disabled':'';
    html+=`<tr data-d="${ds}" class="${dow===0?'wk':''}${fut?' fut':''}${e?' dirty':''}">
      <td class="c-day">${d}<small>${DOW[dow]}</small></td>
      <td class="c-vol"><input data-f="vol" inputmode="decimal" autocomplete="off" aria-label="MT tanggal ${d}" value="${esc(v.vol)}" ${dis}></td>
      <td class="c-rit"><input data-f="rit" inputmode="numeric" autocomplete="off" aria-label="Ritase tanggal ${d}" value="${esc(v.rit)}" ${dis}></td>
      <td class="c-kend"><select data-f="kend" aria-label="Kendala tanggal ${d}" ${dis}>${kOpts.map(k=>`<option value="${k}" ${k===v.kend?'selected':''}>${esc(k==='none'?'—':CATS[k].label)}</option>`).join('')}</select></td>
      <td class="c-ket"><input data-f="ket" maxlength="500" autocomplete="off" aria-label="Keterangan tanggal ${d}" value="${esc(v.ket)}" ${dis}></td>
      <td>${o?`<span class="src ${o.sumber==='excel'?'excel':'online'}" title="${o.sumber==='excel'?'Dari file Excel PLN EPI; bila diubah, angka Anda yang dipakai':'Laporan online'}">${o.sumber==='excel'?'Excel':'Online'}</span>`:''}</td></tr>`; }
  tb.innerHTML=`<thead><tr><th>Tgl</th><th class="r">MT</th><th class="r">Ritase</th><th>Kendala</th><th>Keterangan</th><th>Sumber</th></tr></thead><tbody>${html}</tbody><tfoot><tr><td>Total</td><td class="r num" id="b-tot"></td><td class="r num" id="b-rit"></td><td colspan="3" class="hint" id="b-days" style="font-weight:400"></td></tr></tfoot>`;
  $('#b-err').hidden=true;
  tb.querySelectorAll('tbody tr').forEach(tr=>{
    tr.querySelectorAll('[data-f]').forEach(inp=>{
      inp.addEventListener(inp.tagName==='SELECT'?'change':'input',()=>bulkMark(tr));
      if(inp.dataset.f==='vol') inp.addEventListener('paste',ev=>{ const txt=(ev.clipboardData||window.clipboardData).getData('text'); if(!/[\n\t]/.test(txt.trim())) return; ev.preventDefault();
        const vals=txt.replace(/\r/g,'').replace(/\n+$/,'').split('\n').map(l=>l.split('\t')[0]); let r=tr, n=0;
        for(const val of vals){ while(r&&r.querySelector('[data-f=vol]').disabled) r=r.nextElementSibling; if(!r) break; r.querySelector('[data-f=vol]').value=val.trim(); bulkMark(r); n++; r=r.nextElementSibling; }
        toast(`${n} hari terisi dari tempelan`); });
      if(inp.dataset.f==='vol'||inp.dataset.f==='rit') inp.addEventListener('blur',()=>{ const n=parseNum(inp.value); if(n!=null&&!isNaN(n)){ const f=inp.dataset.f==='rit'?String(Math.round(n)):fmtIn(n); if(f!==inp.value){ inp.value=f; bulkMark(tr); } } else if(n!=null) inp.title='Bukan angka yang valid'; });
      if(inp.tagName==='INPUT') inp.addEventListener('keydown',ev=>{ if(ev.key!=='Enter'&&ev.key!=='ArrowDown'&&ev.key!=='ArrowUp') return; ev.preventDefault();
        let r=ev.key==='ArrowUp'?tr.previousElementSibling:tr.nextElementSibling; while(r&&r.querySelector(`[data-f=${inp.dataset.f}]`).disabled) r=ev.key==='ArrowUp'?r.previousElementSibling:r.nextElementSibling;
        if(r){ const x=r.querySelector(`[data-f=${inp.dataset.f}]`); x.focus(); x.select?.(); } });
    }); });
  bulkSummary();
}
function bulkVals(tr){ const g=f=>tr.querySelector(`[data-f=${f}]`).value; return {vol:g('vol').trim(),rit:g('rit').trim(),kend:g('kend'),ket:g('ket').trim()}; }
function bulkMark(tr){ const ds=tr.dataset.d, o=B.orig.get(ds), v=bulkVals(tr);
  const same=o? (parseNum(v.vol)===+o.volume && String(v.rit)===String(o.ritase??'') && v.kend===(o.kendala||'none') && v.ket===(o.ket||''))
             : (!v.vol&&!v.rit&&v.kend==='none'&&!v.ket);
  if(same) B.edits.delete(ds); else B.edits.set(ds,v);
  tr.classList.toggle('dirty',!same); tr.classList.remove('bad'); bulkSummary(); }
function bulkSummary(){
  let tot=0, rit=0, n=0; $('#tbl-bulk').querySelectorAll('tbody tr').forEach(tr=>{ const v=parseNum(tr.querySelector('[data-f=vol]').value); if(v!=null&&!isNaN(v)){ tot+=v; n++; } const r=parseNum(tr.querySelector('[data-f=rit]').value); if(r&&!isNaN(r)) rit+=r; });
  $('#b-tot').textContent=f1(tot); $('#b-rit').textContent=rit?String(Math.round(rit)):''; $('#b-days').textContent=`${n} hari terisi`;
  const k=B.edits.size; $('#b-status').textContent=S.preview?'Mode pratinjau: tabel hanya bisa dilihat':k?`${k} hari diubah, belum disimpan`:'Belum ada perubahan';
  $('#b-bar').classList.toggle('has',k>0); $('#b-save').disabled=!k||!!S.preview; $('#b-cancel').disabled=!k;
  $('#b-save').textContent=k?`Simpan ${k} perubahan`:'Simpan perubahan';
}
async function saveBulk(){
  if(S.preview||!bulkDirty()) return;
  const err=$('#b-err'); err.hidden=true; const bad=[]; const ups=[], dels=[];
  const jenis=$('#b-jenis').value;
  for(const [ds,v] of B.edits){ const o=B.orig.get(ds); const vol=parseNum(v.vol); const rit=parseNum(v.rit); const dd=dLabel(ds); let why='';
    if(vol==null){ if(!o) why='isi MT'; else if(o.sumber==='excel') why='angka dari Excel tidak bisa dikosongkan (isi 0 dan pilih kendala bila tidak ada pengiriman)'; else if(!isMgr()&&o.user_id&&o.user_id!==S.uid) why='laporan ini diinput akun lain'; else { dels.push(ds); continue; } }
    else if(isNaN(vol)||vol<0) why='MT harus angka 0 atau lebih';
    else if(vol>10000) why='MT di atas 10.000, periksa lagi';
    else if(v.rit&&(isNaN(rit)||rit<0)) why='ritase harus angka';
    else if(vol===0&&v.kend==='none') why='MT 0: pilih kendalanya';
    else if(v.kend!=='none'&&!v.ket) why='jelaskan kendala di kolom keterangan';
    if(why){ bad.push([ds,dd+': '+why]); continue; }
    ups.push({tanggal:ds,volume:Math.round(vol*1000)/1000,ritase:v.rit?Math.round(rit):null,jenis:o?.jenis||jenis,kendala:v.kend,ket:v.ket||null,rencana:o?.rencana??null,sumber:'online',user_id:S.uid,updated_at:nowIso()}); }
  $('#tbl-bulk').querySelectorAll('tbody tr').forEach(tr=>tr.classList.toggle('bad',bad.some(b=>b[0]===tr.dataset.d)));
  if(bad.length){ err.innerHTML='Perbaiki dulu baris yang ditandai merah:<br>'+bad.map(b=>esc(b[1])).join('<br>'); err.hidden=false; const f=$('#tbl-bulk').querySelector(`tr[data-d="${bad[0][0]}"] input`); f?.focus(); return; }
  const btn=$('#b-save'); btn.disabled=true; btn.textContent='Menyimpan…';
  try{
    let p=bulkPartner();
    if(!p&&isMgr()&&$('#f-partner').value==='__new'){ const pa=partnerName(); if(!pa) throw new Error('Isi nama mitra baru.');
      const {data,error}=await S.sb.from('partners').insert({plant:$('#f-plant').value,name:pa,jenis}).select().single(); if(error) throw error; p=data; }
    if(!p) throw new Error('Mitra tidak ditemukan.');
    if(ups.length){ const {error}=await S.sb.from('realisasi').upsert(ups.map(r=>({...r,partner_id:p.id})),{onConflict:'partner_id,tanggal'}); if(error) throw error; }
    if(dels.length){ const {error}=await S.sb.from('realisasi').delete().eq('partner_id',p.id).eq('sumber','online').in('tanggal',dels); if(error) throw error; }
    B.edits.clear(); B.key='';
    toast(`${ups.length} laporan tersimpan${dels.length?`, ${dels.length} dihapus`:''}`);
    await reload(); if($('#f-partner').value==='__new'){ fillPartners(p.name); } renderBulk(true);
  }catch(e){ err.textContent=errMsg(e); err.hidden=false; bulkSummary(); }
}

function bacaAngka(i){ const o=i.parentElement.querySelector('.read'); const el=o||Object.assign(document.createElement('span'),{className:'hint read'}); if(!o) i.after(el);
  const n=parseNum(i.value); el.textContent=n==null?'':isNaN(n)?'Bukan angka yang valid':`Terbaca: ${fmtID(n)} MT`; el.classList.toggle('bad',n!=null&&isNaN(n)); }
/* ---------- input form (both roles) ---------- */
function formScope(){
  if(isMgr()){
    return {plants:S.M.plants.map(p=>p.name), partnersOf:pl=>{const P=S.M.pm.get(pl); return P?P.plist.filter(x=>x.status!=='nonaktif'||x.ytd>0).map(x=>x.name):[];}, allowNew:true,
      typeOf:(pl,pa)=>S.pByKey.get(pl+'|'+pa)?.jenis||''};
  }
  const c=mitraCtx(); if(!c) return {plants:[],partnersOf:()=>[],allowNew:false,typeOf:()=>''};
  return {plants:c.plants, partnersOf:pl=>c.partners.filter(p=>p.plant===pl).map(p=>p.name), allowNew:false, typeOf:(pl,pa)=>c.partners.find(p=>p.plant===pl&&p.name===pa)?.jenis||''};
}
function initForm(){
  const sc=formScope();
  $('#f-plant').innerHTML=sc.plants.map(p=>`<option>${esc(p)}</option>`).join('');
  $('#f-plant').disabled=sc.plants.length<=1;
  $('#f-kendala').innerHTML=['none',...CAT_ORDER].map(k=>`<option value="${k}">${esc(CATS[k].label)}</option>`).join('');
  let saved={}; try{saved=JSON.parse(localStorage.getItem('rmk.form')||'{}');}catch(e){}
  const mp=!isMgr()&&S.mp?String(S.mp).split('|'):null;
  $('#f-plant').value=mp&&sc.plants.includes(mp[0])?mp[0]:sc.plants.includes(saved.plant)?saved.plant:(isMgr()&&S.M?curPlant().name:sc.plants[0]||'');
  fillPartners(mp&&mp[0]===$('#f-plant').value?mp[1]:saved.partner);
  const t=todayLocal(); $('#f-date').value=t>YEAR_END?YEAR_END:t; $('#f-date').max=t<YEAR_END?t:YEAR_END;
  const guard=(el,fn)=>{ el.dataset.prev=el.value; el.onfocus=()=>{el.dataset.prev=el.value;}; el.onchange=()=>{ if(bulkDirty()){ el.value=el.dataset.prev; toast('Simpan atau batalkan perubahan di tabel dulu'); return; } el.dataset.prev=el.value; fn(); }; };
  guard($('#f-plant'),()=>{fillPartners();onFormKey();});
  guard($('#f-partner'),()=>{ $('#wrap-new').hidden=$('#f-partner').value!=='__new'; setJenis(); onFormKey(); });
  $('#f-date').onchange=onFormKey;
  $('#entry-form').onsubmit=submitEntry;
  ['#f-vol','#f-rencana'].forEach(id=>{ const i=$(id); i.oninput=()=>bacaAngka(i); i.onblur=()=>{ const n=parseNum(i.value); if(n!=null&&!isNaN(n)) i.value=fmtIn(n); bacaAngka(i); }; });
  $('#in-title').textContent=isMgr()?'Input laporan harian (atas nama mitra)':'Laporan harian pasokan';
  $('#chk-panel').hidden=!isMgr();
  const g=$('#input-gate');
  if(S.preview){ g.textContent='Mode pratinjau: formulir ini tampil seperti di akun mitra, tetapi tidak bisa disimpan.'; g.hidden=false; } else g.hidden=true;
  $('#f-submit').disabled=!!S.preview;
  initBulk();
  onFormKey();
}
function fillPartners(sel){
  const sc=formScope(); const pl=$('#f-plant').value; const cur=sel||$('#f-partner').value; const list=sc.partnersOf(pl);
  $('#f-partner').innerHTML=list.map(n=>`<option>${esc(n)}</option>`).join('')+(sc.allowNew?'<option value="__new">+ Mitra baru…</option>':'');
  if(list.includes(cur)) $('#f-partner').value=cur;
  $('#f-partner').disabled=!sc.allowNew&&list.length<=1;
  $('#wrap-new').hidden=$('#f-partner').value!=='__new'; setJenis();
}
function setJenis(){ const t=(formScope().typeOf($('#f-plant').value,$('#f-partner').value)||'').split('/')[0]; if(t) $('#f-jenis').value=['CS','WC','SD','PTK'].includes(t)?t:'Lain'; }
function partnerName(){ return $('#f-partner').value==='__new' ? $('#f-partner-new').value.trim().replace(/\|/g,'/').replace(/\s+/g,' ') : $('#f-partner').value; }
function findEntry(pl,pa,d){
  if(isMgr()){ const p=S.pByKey.get(pl+'|'+pa); return p?S.entries.get(p.id+'-'+d)||null:null; }
  const c=mitraCtx(); const o=c?.series.get(pl+'|'+pa)?.get(d); return o&&o.src==='online'?o.e:null;
}
function onFormKey(){
  const pl=$('#f-plant').value, pa=partnerName(), d=$('#f-date').value;
  try{localStorage.setItem('rmk.form',JSON.stringify({plant:pl,partner:$('#f-partner').value}));}catch(e){}
  const ex=pa&&d?findEntry(pl,pa,d):null;
  if(ex){ $('#f-vol').value=fmtIn(ex.volume); $('#f-rit').value=ex.ritase??''; $('#f-kendala').value=ex.kendala||'none'; $('#f-ket').value=ex.ket||''; $('#f-rencana').value=fmtIn(ex.rencana); if(ex.jenis)$('#f-jenis').value=ex.jenis;
    $('#f-exist').textContent='Sudah ada laporan untuk tanggal ini. Simpan untuk memperbarui.'; $('#f-submit').textContent='Perbarui laporan'; }
  else { ['#f-vol','#f-rit','#f-ket','#f-rencana'].forEach(s=>$(s).value=''); $('#f-kendala').value='none';
    let k=null; if(isMgr()) k=S.M.daily.get(pl+'|'+pa+'|'+d); else { const o=mitraCtx()?.series.get(pl+'|'+pa)?.get(d); if(o) k={v:o.v,src:o.src}; }
    $('#f-exist').textContent=k&&k.src==='excel'?`Tercatat PLN EPI: ${f1(k.v)} MT. Laporan Anda akan menggantikannya.`:''; $('#f-submit').textContent='Simpan laporan'; }
  renderInputSide();
  renderBulk();
}
async function submitEntry(ev){
  ev.preventDefault(); const err=$('#f-err'); err.hidden=true;
  if(S.preview) return;
  const pl=$('#f-plant').value, pa=partnerName(), d=$('#f-date').value, vol=parseNum($('#f-vol').value);
  const kend=$('#f-kendala').value, ket=$('#f-ket').value.trim();
  const fail=m=>{err.textContent=m;err.hidden=false;};
  if(!pa) return fail('Isi nama mitra.');
  if(!d) return fail('Pilih tanggal pengiriman.');
  if(d>todayLocal()) return fail('Tanggal tidak boleh melewati hari ini.');
  if(!isFinite(vol)||vol<0) return fail('Isi realisasi dalam MT (angka 0 atau lebih). Isi 0 bila tidak ada pengiriman.');
  if(vol>10000) return fail('Volume di atas 10.000 MT per hari. Periksa kembali angkanya.');
  if(kend!=='none' && !ket) return fail('Jelaskan kendalanya di kolom keterangan.');
  if(vol===0 && kend==='none') return fail('Volume 0: pilih kendala yang menyebabkan tidak ada pengiriman.');
  const num=v=>{ const n=parseNum(v); return n==null||isNaN(n)?null:n; };
  if($('#f-rit').value.trim()&&isNaN(parseNum($('#f-rit').value))) return fail('Ritase harus angka.');
  if($('#f-rencana').value.trim()&&isNaN(parseNum($('#f-rencana').value))) return fail('Rencana kirim harus angka.');
  const btn=$('#f-submit'); btn.disabled=true;
  try{
    let p;
    if(isMgr()){ p=S.pByKey.get(pl+'|'+pa);
      if(!p){ const {data,error}=await S.sb.from('partners').insert({plant:pl,name:pa,jenis:$('#f-jenis').value}).select().single(); if(error) throw error; p=data; } }
    else p=mitraCtx()?.partners.find(x=>x.plant===pl&&x.name===pa);
    if(!p) throw new Error('Mitra tidak ditemukan.');
    const row={partner_id:p.id,tanggal:d,volume:Math.round(vol*1000)/1000,ritase:num($('#f-rit').value),jenis:$('#f-jenis').value,kendala:kend,ket:ket||null,rencana:num($('#f-rencana').value),sumber:'online',user_id:S.uid,updated_at:nowIso()};
    const {error}=await S.sb.from('realisasi').upsert(row,{onConflict:'partner_id,tanggal'}); if(error) throw error;
    toast('Laporan tersimpan'); await reload();
    if($('#f-partner').value==='__new') fillPartners(pa);
    onFormKey();
  }catch(e){ fail(errMsg(e)); }
  finally{ btn.disabled=!!S.preview; }
}
function renderInputSide(){
  const pl=$('#f-plant').value, d=$('#f-date').value, pa=partnerName();
  if(isMgr() && S.M){
    const P=S.M.pm.get(pl); if(P){
      $('#chk-title').textContent='Status laporan '+pl; $('#chk-sub').textContent=d?dLong(d):'';
      const act=P.plist.filter(x=>x.since<=30||x.isNew);
      $('#checklist').innerHTML=act.length?act.map(x=>{ const k=S.M.daily.get(pl+'|'+x.name+'|'+d); const pid=S.pByKey.get(pl+'|'+x.name)?.id; const e=S.entries.get(pid+'-'+d);
        return `<div><span>${esc(x.name)}</span>${k?`<span class="yes num">${f1(k.v)} MT · ${k.src==='mitra'?'online':'Excel'}${e&&e.kendala&&e.kendala!=='none'?' · '+esc(CATS[e.kendala]?.label):''}</span>`:'<span class="no">Belum lapor</span>'}</div>`; }).join(''):'<p class="empty">Belum ada mitra aktif.</p>';
    }
  }
  let hist=[];
  if(isMgr()) hist=[...S.entries.values()].filter(e=>e.plant===pl&&e.partner===pa);
  else { const c=mitraCtx(); const s=c?.series.get(pl+'|'+pa); if(s) for(const o of s.values()) if(o.src==='online') hist.push(o.e); }
  hist.sort((a,b)=>b.date.localeCompare(a.date)); hist=hist.slice(0,12);
  $('#hist-sub').textContent=pa?(pa+(formScope().plants.length>1?' · PLTU '+pl:'')):'';
  $('#tbl-history').innerHTML=hist.length?`<thead><tr><th>Tanggal</th><th class="r">MT</th><th>Kendala</th>${isMgr()?'<th>Oleh</th>':''}<th></th></tr></thead><tbody>${hist.map(e=>`<tr><td class="num">${dLabel(e.date)}</td><td class="r num">${f1(e.volume)}</td><td>${e.kendala&&e.kendala!=='none'?`<span class="chip">${esc(CATS[e.kendala]?.label)}</span>`:'—'}</td>${isMgr()?`<td><span data-uid="${esc(e.uid||'')}" data-pel="${esc(e.pel||'')}" class="hint">—</span></td>`:''}<td class="r" style="white-space:nowrap">${S.preview?'':`<button class="btn ghost sm" data-edit="${esc(e.date)}" type="button">Ubah</button> ${isMgr()||e.uid===S.uid?`<button class="btn danger sm" data-del="${esc(e.date)}" data-pid="${esc(e.pid)}" type="button">Hapus</button>`:''}`}</td></tr>`).join('')}</tbody>`:'<tbody><tr><td class="empty">Belum ada laporan online untuk mitra ini.</td></tr></tbody>';
  $('#tbl-history').querySelectorAll('[data-edit]').forEach(b=>b.onclick=()=>{$('#f-date').value=b.dataset.edit;onFormKey();$('#f-vol').focus();});
  $('#tbl-history').querySelectorAll('[data-del]').forEach(b=>b.onclick=async()=>{
    if(b.dataset.armed!=='1'){b.dataset.armed='1';b.textContent='Yakin hapus?';setTimeout(()=>{if(b.isConnected){b.dataset.armed='';b.textContent='Hapus';}},4000);return;}
    const {error}=await S.sb.from('realisasi').delete().eq('partner_id',+b.dataset.pid).eq('tanggal',b.dataset.del);
    if(error) toast(errMsg(error)); else { toast('Laporan dihapus'); await reload(); onFormKey(); } });
  resolveNames($('#tbl-history'));
}
function nameOf(uid,pel){ if(!uid) return pel?pel+' (akun dihapus)':'—'; if(uid===S.uid) return 'Anda'; const p=S.profiles.find(x=>x.id===uid); return p?(p.username||p.nama||'Pengguna'):'Pengguna'; }
function resolveNames(root){ root.querySelectorAll('span[data-uid]').forEach(e=>{ e.textContent=nameOf(e.dataset.uid,e.dataset.pel); }); }

/* ---------- manager: kendala ---------- */
function initKendalaFilters(){
  $('#flt-plant').innerHTML='<option value="">Semua PLTU</option>'+S.M.plants.map(p=>`<option>${esc(p.name)}</option>`).join('');
  $('#flt-cat').innerHTML='<option value="">Semua kategori</option>'+[...CAT_ORDER,'kinerja'].map(k=>`<option value="${k}">${esc(CATS[k].label)}</option>`).join('');
  ['#flt-plant','#flt-status','#flt-cat'].forEach(s=>$(s).onchange=renderKendala);
  const L=$('#issue-list');
  L.addEventListener('focusout',()=>setTimeout(()=>{ if(!L.contains(document.activeElement) && S.deferIssues){S.deferIssues=false;renderKendala();} },0));
}
const ST_L={open:'Belum ditangani',proses:'Dalam penanganan',selesai:'Selesai'};
function renderKendala(){
  const L=$('#issue-list');
  if(L.contains(document.activeElement) && ['INPUT','TEXTAREA','SELECT'].includes(document.activeElement.tagName)){ S.deferIssues=true; return; }
  const M=S.M, fp=$('#flt-plant').value, fs=$('#flt-status').value, fc=$('#flt-cat').value;
  const open=[...L.querySelectorAll('details[open]')].map(d=>d.dataset.id);
  let list=M.issues.filter(i=>(!fp||i.plant===fp)&&(!fc||i.cat===fc)&&(!fs||fuStatus(i)===fs));
  const so={open:0,proses:1,selesai:2}, sv={critical:0,warning:1,info:2};
  list.sort((a,b)=>so[fuStatus(a)]-so[fuStatus(b)]||sv[a.sev]-sv[b.sev]||b.end.localeCompare(a.end));
  $('#issue-count').textContent=`${list.length} kendala · ${list.filter(i=>fuStatus(i)==='open').length} belum ditangani`;
  L.innerHTML=list.length?list.map(i=>{
    const fid=slug(i.id), fu=S.followups.get(fid)||{}, st=fu.status||'open';
    const acts=i.act&&i.act.length?i.act:(CATS[i.cat]?.act||[]);
    const when=i.end!==i.date?`${dLabel(i.date)} – ${dLabel(i.end)}`:dLabel(i.date);
    return `<article class="issue"><div class="issue-h"><span class="pill ${st}">${ST_L[st]}</span><strong>${esc(i.plant)}${i.partner?' · '+esc(i.partner):''}</strong><span class="chip">${esc(CATS[i.cat]?.label||i.cat)}</span><span class="when">${esc(i.src)} · ${when}</span></div>
      ${i.title?`<p><strong>${esc(i.title)}</strong></p>`:''}<p style="color:var(--ink-2)">${esc(i.text)}${i.days>1?` <span class="hint">(${i.days} hari)</span>`:''}</p>
      ${fu.pesan?`<div class="fu-view"><strong>Pesan ke mitra:</strong> ${esc(fu.pesan)}</div>`:''}
      <details data-id="${esc(i.id)}" ${open.includes(i.id)?'open':''}><summary>Rekomendasi mitigasi &amp; tindak lanjut</summary>
        ${acts.length?`<ul>${acts.map(a=>`<li>${esc(a)}</li>`).join('')}</ul>`:''}
        <div class="fu" data-fid="${esc(fid)}" style="margin-top:10px">
            <select aria-label="Status" data-k="status"><option value="open">Belum ditangani</option><option value="proses">Dalam penanganan</option><option value="selesai">Selesai</option></select>
            <input data-k="pic" placeholder="PIC & tenggat, mis. Febri · 15 Nov" maxlength="80" value="${esc(fu.pic||'')}">
            <textarea data-k="tindak" style="grid-column:1/-1" maxlength="600" placeholder="Tindak lanjut internal (hanya tim PLN EPI)">${esc(fu.tindak||'')}</textarea>
            ${i.partner?`<textarea data-k="pesan" style="grid-column:1/-1" maxlength="400" placeholder="Pesan untuk ${esc(i.partner)} (tampil di halaman mitra)">${esc(fu.pesan||'')}</textarea>`:''}
            <div class="row" style="grid-column:1/-1"><button class="btn sm" type="button" data-save>Simpan</button></div></div>
      </details></article>`;
  }).join(''):'<p class="empty">Tidak ada kendala untuk filter ini.</p>';
  L.querySelectorAll('.fu').forEach(f=>{
    const fu=S.followups.get(f.dataset.fid)||{}; f.querySelector('[data-k=status]').value=fu.status||'open';
    f.querySelector('[data-save]').onclick=async()=>{
      const g=k=>f.querySelector(`[data-k=${k}]`)?.value.trim()||'';
      const I=list.find(x=>slug(x.id)===f.dataset.fid); if(!I) return;
      const row={issue_id:f.dataset.fid,status:f.querySelector('[data-k=status]').value,pic:g('pic')||null,tindak:g('tindak')||null,pesan:g('pesan')||null,judul:I.title||null,teks:I.text||null,kategori:I.cat,plant:I.plant,
        partner_id:I.partner?(S.pByKey.get(I.plant+'|'+I.partner)?.id||null):null,tanggal:I.date||null,tanggal_akhir:I.end||null,updated_by:S.uid,updated_at:nowIso()};
      const {error}=await S.sb.from('tindak_lanjut').upsert(row,{onConflict:'issue_id'});
      if(error){ toast(errMsg(error)); return; }
      S.followups.set(row.issue_id,row); toast('Tindak lanjut tersimpan'); S.deferIssues=false; document.activeElement?.blur(); renderKendala(); };
  });
  const cnt={}; M.issues.filter(i=>!fp||i.plant===fp).forEach(i=>{cnt[i.cat]=(cnt[i.cat]||0)+(i.days||1);});
  const ks=Object.keys(cnt).sort((a,b)=>cnt[b]-cnt[a]); const mx=Math.max(1,...Object.values(cnt));
  $('#catbars').innerHTML=ks.length?ks.map(k=>`<div><span>${esc(CATS[k]?.label||k)}</span><i style="width:${cnt[k]/mx*100}%"></i><span class="num r">${cnt[k]}</span></div>`).join('')+'<p class="hint" style="margin:6px 0 0">Satuan: hari kejadian</p>':'<p class="empty">Belum ada data.</p>';
}
function badges(){
  if(S.role!=='manager'||!S.M) return;
  const nOpen=S.M.issues.filter(i=>fuStatus(i)==='open'&&i.sev!=='info').length;
  const nReq=S.req.filter(r=>r.status==='menunggu').length;
  const set=(v,n)=>{const b=document.querySelector(`nav a[data-v="${v}"] .badge`); if(b){b.hidden=!n;b.textContent=n;}};
  set('kendala',nOpen); set('akses',nReq);
}

/* ---------- manager: akses ---------- */
function comp14(uid){
  const t=todayLocal(); const days=new Set([...S.entries.values()].filter(e=>e.uid===uid).map(e=>e.date));
  let n=0; for(let i=1;i<=14;i++) if(days.has(addDays(t,-i))) n++;
  let last=null; for(const d of days) if(!last||d>last) last=d; return {n,last};
}
const profOf=uid=>S.profiles.find(p=>p.id===uid)||{};
const pr0=profOf;
async function ensurePartner(plant,name){
  let p=S.pByKey.get(plant+'|'+name); if(p) return p;
  const {data,error}=await S.sb.from('partners').insert({plant,name}).select().single(); if(error) throw error; return data;
}
/* ---------- manager: sinkron Excel Online ---------- */
const jam=t=>{ const d=new Date(t); return d.toLocaleDateString('id-ID',{day:'numeric',month:'short'})+' '+d.toLocaleTimeString('id-ID',{hour:'2-digit',minute:'2-digit'}); };
function syncLabel(){ const l=S.sync?.log?.find(x=>x.status==='berhasil'); return l?' · Excel '+jam(l.waktu):''; }
function renderSync(){
  const y=S.sync||{ready:false,log:[]};
  $('#sync-setup').hidden=y.ready; $('#sync-form').hidden=!y.ready;
  const inp=$('#s-url'); if(document.activeElement!==inp) inp.value=y.url||'';
  const ok=y.log.find(x=>x.status==='berhasil');
  $('#sync-sub').textContent=!y.url?'Belum ada link':ok?'Terakhir berhasil '+jam(ok.waktu):'Belum pernah berhasil';
  $('#tbl-sync').innerHTML=y.log.length?`<thead><tr><th>Waktu</th><th>Status</th><th>Keterangan</th></tr></thead><tbody>${y.log.map(l=>`<tr><td class="num" style="white-space:nowrap">${jam(l.waktu)}</td><td><span class="pill ${l.status==='berhasil'?'good':l.status==='gagal'?'critical':'info'}">${esc(l.status)}</span></td><td style="font-size:12px;color:var(--ink-2)">${esc(l.pesan||'')}</td></tr>`).join('')}</tbody>`:'<tbody><tr><td class="empty">Belum ada riwayat sinkron.</td></tr></tbody>';
  $('#sync-form').onsubmit=async ev=>{ ev.preventDefault(); const e=$('#s-err'); e.hidden=true; const v=inp.value.trim();
    if(v&&!/^https:\/\/([a-z0-9-]+\.)*(sharepoint\.com|1drv\.ms|onedrive\.live\.com|live\.com)\//i.test(v)){ e.textContent='Gunakan link berbagi OneDrive atau SharePoint (diawali https://).'; e.hidden=false; return; }
    const {error}=await S.sb.from('pengaturan').upsert({kunci:'excel_url',nilai:v,updated_at:nowIso()}); if(error){ e.textContent=errMsg(error); e.hidden=false; return; }
    toast('Link tersimpan'); await reload(); };
  $('#s-run').onclick=async()=>{ const b=$('#s-run'); b.disabled=true; b.textContent='Menyinkronkan…';
    try{ const {data,error}=await S.sb.functions.invoke('sinkron-excel',{body:{}}); if(error) throw error; toast(data?.ok?'Sinkron selesai':'Sinkron gagal, lihat riwayat'); }
    catch(e){ toast('Fungsi sinkron belum terpasang atau tidak bisa dihubungi'); }
    finally{ b.disabled=false; b.textContent='Sinkron sekarang'; await reload(); } };
}
function renderAkses(){
  renderSync();
  renderInduk();
  const M=S.M;
  const reqs=S.req.filter(r=>r.status!=='disetujui').sort((a,b)=>String(b.created_at).localeCompare(String(a.created_at)));
  $('#req-count').textContent=reqs.filter(r=>r.status==='menunggu').length+' menunggu';
  $('#tbl-req').innerHTML=reqs.length?`<thead><tr><th>Akun</th><th>PIC / kontak</th><th>Diminta</th><th>Setujui sebagai</th><th></th></tr></thead><tbody>${reqs.map(r=>{
      const uid=r.user_id, pr=profOf(uid);
      const acct=`<td><strong>${esc(pr.username||'—')}</strong><br><span class="hint">${r.created_at?dLong(String(r.created_at).slice(0,10)):''}</span></td><td>${esc(r.pic||'-')}<br><span class="mono">${esc(r.hp||'')}</span></td>`;
      if(r.staf) return `<tr class="acc-row" data-uid="${esc(uid)}">${acct}<td><strong>Akses staf / manager</strong><br><span class="hint">Melihat & mengelola semua data</span>${r.status==='ditolak'?'<br><span class="pill kritis">Ditolak</span>':''}</td><td><span class="hint">Hanya untuk staf PLN EPI</span></td><td style="white-space:nowrap"><button class="btn sm" data-ok type="button">Jadikan staf</button> <button class="btn danger sm" data-no type="button">${r.status==='ditolak'?'Hapus':'Tolak'}</button>${pr.role==='pending'?' <button class="btn danger sm" data-delacc type="button">Hapus akun</button>':''}</td></tr>`;
      const cands=reqCands(r,uid);
      const have=[...new Set(S.akses.filter(a=>a.user_id===uid).map(a=>S.pById.get(a.partner_id)?.plant).filter(Boolean))];
      return `<tr class="acc-row" data-uid="${esc(uid)}">${acct}
        <td><strong>${esc(r.partner_name||'-')}</strong>${r.baru?' <span class="chip">baru</span>':''}${pr.role==='mitra'?' <span class="chip">PLTU tambahan</span>':''}${r.kontrak?`<br><span class="hint">Kontrak: <span class="mono">${esc(r.kontrak)}</span></span>`:''}<br><span class="hint">Minta ${cands.filter(c=>c.asked).length} PLTU: ${esc(cands.filter(c=>c.asked).map(c=>c.plant).join(', ')||'-')}${have.length?' · sudah memasok '+esc(have.join(', ')):''}</span>${r.status==='ditolak'?`<br><span class="pill kritis">Ditolak</span>`:''}</td>
        <td><div class="appr">${cands.map((c,i)=>{ const P=M.pm.get(c.plant); const ns=P?P.plist.map(x=>x.name):[];
            return `<div class="appr-row" data-i="${i}"><label><input type="checkbox" data-k="on" ${c.asked?'checked':''} style="width:auto"> <strong>${esc(c.plant)}</strong></label><select data-k="pa" aria-label="Nama mitra di PLTU ${esc(c.plant)}">${ns.map(n=>`<option ${n===c.match?'selected':''}>${esc(n)}</option>`).join('')}<option value="__new" ${c.match?'':'selected'}>+ Baru: ${esc(r.partner_name||'')}</option></select>${c.via?`<span class="via ${c.via}" title="${esc(c.hit?'Nomor kontrak '+c.hit:VIA[c.via])}">${esc(VIA[c.via])}</span>`:'<span class="via none">tidak ditemukan</span>'}${r.kontrak_pltu?.[c.plant]?`<span class="appr-k">Kontrak diisi mitra: <span class="mono">${esc(r.kontrak_pltu[c.plant].join(', '))}</span></span>`:''}</div>`;}).join('')}</div>
          <span class="hint">Centang PLTU yang disetujui; nama di kanan adalah kolom mitra di Excel PLTU tersebut.</span></td>
        <td style="white-space:nowrap"><button class="btn sm" data-ok type="button">Setujui</button> <button class="btn danger sm" data-no type="button">${r.status==='ditolak'?'Hapus':'Tolak'}</button>${pr.role==='pending'?' <button class="btn danger sm" data-delacc type="button">Hapus akun</button>':''}</td></tr>`;}).join('')}</tbody>`
    :'<tbody><tr><td class="empty">Belum ada permintaan. Mitra yang mendaftar akun di situs ini akan muncul di sini.</td></tr></tbody>';
  const orphans=S.profiles.filter(p=>p.role==='pending'&&!S.req.some(r=>r.user_id===p.id));
  $('#orphan-wrap').hidden=!orphans.length;
  $('#tbl-orphan').innerHTML=orphans.length?`<thead><tr><th>Nama pengguna</th><th>PIC / kontak</th><th>Dibuat</th><th></th></tr></thead><tbody>${orphans.map(p=>`<tr data-uid="${esc(p.id)}"><td><strong>${esc(p.username||'—')}</strong></td><td>${esc(p.nama&&p.nama!==p.username?p.nama:'-')}<br><span class="mono">${esc(p.hp||'')}</span></td><td class="hint">${p.created_at?dLong(String(p.created_at).slice(0,10)):''}</td><td style="white-space:nowrap"><button class="btn ghost sm" data-rp type="button">Reset password</button> <button class="btn danger sm" data-delacc type="button">Hapus akun</button></td></tr>`).join('')}</tbody>`:'';
  $('#tbl-orphan').querySelectorAll('tr[data-uid]').forEach(tr=>{ const uid=tr.dataset.uid; tr.querySelector('[data-rp]').onclick=ev=>resetPassword(uid,ev.currentTarget); tr.querySelector('[data-delacc]').onclick=ev=>hapusAkun(uid,ev.currentTarget); });
  $('#tbl-req').querySelectorAll('tr.acc-row').forEach(tr=>{
    const uid=tr.dataset.uid; const r=S.req.find(x=>x.user_id===uid);
    const run=async(fn,msg)=>{ try{ await fn(); toast(msg); await reload(); }catch(e){ toast(errMsg(e)); } };
    const da=tr.querySelector('[data-delacc]'); if(da) da.onclick=()=>hapusAkun(uid,da);
    const no=tr.querySelector('[data-no]');
    no.onclick=()=>{ if(r.status==='ditolak') return run(async()=>{ const {error}=await S.sb.from('permintaan').delete().eq('user_id',uid); if(error) throw error; },'Permintaan dihapus');
      if(no.dataset.armed!=='1'){ no.dataset.armed='1'; no.textContent='Yakin tolak?'; return; }
      run(async()=>{ const {error}=await S.sb.from('permintaan').update({status:'ditolak',alasan:'Tidak sesuai data mitra PLN EPI. Hubungi PIC PLN EPI Kalimantan.'}).eq('user_id',uid); if(error) throw error; },'Permintaan ditolak'); };
    if(r.staf){ tr.querySelector('[data-ok]').onclick=()=>run(async()=>{
        let {error}=await S.sb.from('profiles').update({role:'manager',nama:r.pic,hp:r.hp}).eq('id',uid); if(error) throw error;
        ({error}=await S.sb.from('permintaan').update({status:'disetujui'}).eq('user_id',uid)); if(error) throw error; },'Ditambahkan sebagai staf manager'); return; }
    const cands=reqCands(r,uid);
    tr.querySelector('[data-ok]').onclick=()=>{ const pick=[...tr.querySelectorAll('.appr-row')].filter(d=>d.querySelector('[data-k=on]').checked).map(d=>{ const c=cands[+d.dataset.i], v=d.querySelector('[data-k=pa]').value; return {plant:c.plant,name:v==='__new'?String(r.partner_name||'').trim():v}; }).filter(x=>x.name);
      if(!pick.length){ toast('Centang minimal satu PLTU'); return; }
      run(async()=>{ const ps=[]; for(const x of pick) ps.push(await ensurePartner(x.plant,x.name));
      let {error}=await S.sb.from('akses').upsert(ps.map(x=>({user_id:uid,partner_id:x.id}))); if(error) throw error;
      ({error}=await S.sb.from('profiles').update({role:'mitra',nama:r.pic||pr0(uid).nama,hp:r.hp||pr0(uid).hp}).eq('id',uid)); if(error) throw error;
      ({error}=await S.sb.from('permintaan').update({status:'disetujui'}).eq('user_id',uid)); if(error) throw error;
      try{ await pelajariNama(r,pick); }catch(e){ console.warn(e); } },`Akses disetujui untuk ${pick.length} PLTU`); };
  });
  const regs=S.profiles.filter(p=>p.role==='mitra'||p.role==='dicabut').map(p=>({...p,pids:S.akses.filter(a=>a.user_id===p.id).map(a=>a.partner_id)}));
  regs.sort((a,b)=>{const pa=S.pById.get(a.pids[0]),pb=S.pById.get(b.pids[0]); return ((pa?.plant||'')+(pa?.name||'')).localeCompare((pb?.plant||'')+(pb?.name||''));});
  $('#tbl-reg').innerHTML=regs.length?`<thead><tr><th>Akun</th><th>Mitra · PLTU</th><th class="r">Lapor 14 hari</th><th class="r">Lapor terakhir</th><th>Status</th><th></th></tr></thead><tbody>${regs.map(r=>{const c=comp14(r.id); const ps=r.pids.map(id=>S.pById.get(id)).filter(Boolean);
      return `<tr data-uid="${esc(r.id)}"><td><strong>${esc(r.username||'—')}</strong><br><span class="hint">PIC ${esc(r.nama||'-')}${r.hp?' · '+esc(r.hp):''}</span>${(S.pics||[]).filter(x=>x.user_id===r.id).map(x=>`<br><span class="hint">PIC ${esc(x.nama)}${x.hp?' · '+esc(x.hp):''}${x.jabatan?' · '+esc(x.jabatan):''}</span>`).join('')}</td><td>${ps.length?ps.map(p=>`<div><strong>${esc(p.plant)}</strong> <span class="hint">· ${esc(p.name)}</span></div>`).join(''):'—'}</td>
       <td class="r num">${c.n}/14</td><td class="r num">${c.last?dLabel(c.last):'—'}</td><td><span class="pill ${r.role==='dicabut'?'nonaktif':c.n>=10?'good':c.n>=5?'warning':'critical'}">${r.role==='dicabut'?'Dicabut':c.n>=10?'Rutin':c.n>=5?'Kurang rutin':'Jarang lapor'}</span></td>
       <td style="white-space:nowrap"><button class="btn ghost sm" data-mng type="button" aria-expanded="${S.openMng?.has(r.id)?'true':'false'}">Kelola PLTU</button> <button class="btn ghost sm" data-prev type="button">Pratinjau</button> <button class="btn ghost sm" data-rp type="button">Reset password</button> <button class="btn ${r.role==='dicabut'?'ghost':'danger'} sm" data-tog type="button">${r.role==='dicabut'?'Aktifkan':'Cabut akses'}</button> <button class="btn danger sm" data-delacc type="button">Hapus akun</button></td></tr>
       <tr class="mng-row" data-mng-for="${esc(r.id)}" ${S.openMng?.has(r.id)?'':'hidden'}><td colspan="6">${mngHtml(r,ps)}</td></tr>`;}).join('')}</tbody>`
    :'<tbody><tr><td class="empty">Belum ada mitra terdaftar.</td></tr></tbody>';
  $('#tbl-reg').querySelectorAll('tr.mng-row').forEach(tr=>bindMng(tr,tr.dataset.mngFor));
  $('#tbl-reg').querySelectorAll('tr[data-uid]').forEach(tr=>{
    const uid=tr.dataset.uid, r=regs.find(x=>x.id===uid);
    tr.querySelector('[data-mng]').onclick=ev=>{ S.openMng=S.openMng||new Set(); const open=!S.openMng.has(uid); if(open) S.openMng.add(uid); else S.openMng.delete(uid);
      ev.currentTarget.setAttribute('aria-expanded',String(open)); $('#tbl-reg').querySelector(`tr[data-mng-for="${CSS.escape(uid)}"]`).hidden=!open; };
    tr.querySelector('[data-rp]').onclick=ev=>resetPassword(uid,ev.currentTarget);
    tr.querySelector('[data-delacc]').onclick=ev=>hapusAkun(uid,ev.currentTarget);
    tr.querySelector('[data-prev]').onclick=()=>{ if(!r.pids.length){ toast('Akun ini belum punya mitra'); return; } S.preview=uid; S.mp=null; applyRole(); location.hash='beranda'; route(); };
    tr.querySelector('[data-tog]').onclick=async(ev)=>{ const b=ev.currentTarget;
      if(r.role!=='dicabut' && b.dataset.armed!=='1'){ b.dataset.armed='1'; b.textContent='Yakin cabut?'; return; }
      const {error}=await S.sb.from('profiles').update({role:r.role==='dicabut'?'mitra':'dicabut'}).eq('id',uid);
      if(error) toast(errMsg(error)); else { toast(r.role==='dicabut'?'Akses diaktifkan':'Akses dicabut'); await reload(); } };
  });
  const staff=S.profiles.filter(p=>p.role==='manager');
  $('#tbl-staff').innerHTML=staff.length?`<thead><tr><th>Akun</th><th></th></tr></thead><tbody>${staff.map(u=>`<tr><td>${esc(u.username||u.nama)}${u.id===S.uid?' <span class="chip">Anda</span>':''}<br><span class="hint">${esc(u.nama||'')}</span></td><td class="r">${u.id===S.uid?'':`<button class="btn danger sm" data-rm="${esc(u.id)}" type="button">Hapus dari staf</button> <button class="btn danger sm" data-delacc="${esc(u.id)}" type="button">Hapus akun</button>`}</td></tr>`).join('')}</tbody>`:'<tbody><tr><td class="empty">—</td></tr></tbody>';
  $('#tbl-staff').querySelectorAll('[data-rm]').forEach(b=>b.onclick=async()=>{ const {error}=await S.sb.from('profiles').update({role:'dicabut'}).eq('id',b.dataset.rm); if(error) toast(errMsg(error)); else { toast('Dihapus dari staf'); await reload(); } });
  $('#tbl-staff').querySelectorAll('[data-delacc]').forEach(b=>b.onclick=()=>hapusAkun(b.dataset.delacc,b));
  $('#a-plant').innerHTML=`<option value="">Semua mitra</option>`+M.plants.map(p=>`<option>${esc(p.name)}</option>`).join('');
  $('#ann-list').innerHTML=S.ann.length?S.ann.map(a=>`<div class="ann"><strong>${esc(a.judul)}</strong><p>${esc(a.isi)}</p><span class="meta">${a.plant?'PLTU '+esc(a.plant):'Semua mitra'} · ${dLong(String(a.created_at).slice(0,10))} <button class="btn danger sm" data-ann="${esc(a.id)}" type="button">Hapus</button></span></div>`).join(''):'<p class="empty">Belum ada pengumuman.</p>';
  $('#ann-list').querySelectorAll('[data-ann]').forEach(b=>b.onclick=async()=>{ const {error}=await S.sb.from('pengumuman').delete().eq('id',+b.dataset.ann); if(error) toast(errMsg(error)); else await reload(); });
}
function mngHtml(r,ps){
  const M=S.M, linked=new Set(ps.map(p=>p.id));
  const sug=S.partnersRaw.filter(p=>!linked.has(p.id)&&ps.some(x=>x.plant!==p.plant&&sameCo(x.name,p.name)));
  const pl0=M.plants.find(p=>!ps.some(x=>x.plant===p.name))?.name||M.plants[0].name;
  return `<div class="mng">
    <div><span class="eyebrow">PLTU yang bisa diisi akun ini</span><div class="chips">${ps.length?ps.map(p=>`<span class="chip lg">${esc(p.plant)} · ${esc(p.name)} <button type="button" class="x" data-unlink="${p.id}" aria-label="Lepas ${esc(p.plant)}">×</button></span>`).join(''):'<span class="hint">Belum ada</span>'}</div></div>
    ${sug.length?`<div><span class="eyebrow">Nama serupa di PLTU lain</span><div class="chips">${sug.map(p=>`<button type="button" class="btn ghost sm" data-link="${p.id}">+ ${esc(p.plant)} · ${esc(p.name)}</button>`).join('')}</div></div>`:''}
    <div class="row mng-add"><select data-k="plant" aria-label="PLTU">${M.plants.map(p=>`<option ${p.name===pl0?'selected':''}>${esc(p.name)}</option>`).join('')}</select><select data-k="partner" aria-label="Nama mitra di PLTU itu"></select><input data-k="new" placeholder="Nama mitra baru" maxlength="60" hidden><button type="button" class="btn sm" data-add>Tambah PLTU</button></div>
  </div>`;
}
function bindMng(tr,uid){
  const M=S.M; const ps=tr.querySelector('[data-k=plant]'), pa=tr.querySelector('[data-k=partner]'), nw=tr.querySelector('[data-k=new]');
  const mine=S.akses.filter(a=>a.user_id===uid).map(a=>S.pById.get(a.partner_id)).filter(Boolean);
  const fill=()=>{ const P=M.pm.get(ps.value); const ns=(P?P.plist.map(x=>x.name):[]).filter(n=>!mine.some(m=>m.plant===ps.value&&m.name===n));
    pa.innerHTML=ns.map(n=>`<option>${esc(n)}</option>`).join('')+'<option value="__new">+ Mitra baru…</option>';
    const m=ns.find(n=>mine.some(x=>sameCo(x.name,n))); pa.value=m||'__new'; nw.hidden=pa.value!=='__new'; if(!nw.value) nw.value=mine[0]?.name||profOf(uid).username||''; };
  ps.onchange=fill; pa.onchange=()=>{nw.hidden=pa.value!=='__new';}; fill();
  const run=async(fn,msg)=>{ try{ await fn(); toast(msg); await reload(); }catch(e){ toast(errMsg(e)); } };
  const link=pid=>S.sb.from('akses').upsert({user_id:uid,partner_id:pid}).then(({error})=>{ if(error) throw error; });
  tr.querySelector('[data-add]').onclick=()=>{ const name=(pa.value==='__new'?nw.value:pa.value).trim().replace(/\|/g,'/'); if(!name){ toast('Isi nama mitra'); return; }
    run(async()=>{ const p=await ensurePartner(ps.value,name); await link(p.id); },'PLTU '+ps.value+' ditambahkan'); };
  tr.querySelectorAll('[data-link]').forEach(b=>b.onclick=()=>run(()=>link(+b.dataset.link),'PLTU ditambahkan'));
  tr.querySelectorAll('[data-unlink]').forEach(b=>b.onclick=()=>{
    if(b.dataset.armed!=='1'){ b.dataset.armed='1'; b.textContent='Lepas?'; setTimeout(()=>{ if(b.isConnected){ b.dataset.armed=''; b.textContent='×'; } },4000); return; }
    run(async()=>{ const {error}=await S.sb.from('akses').delete().eq('user_id',uid).eq('partner_id',+b.dataset.unlink); if(error) throw error; },'Akses PLTU dilepas'); });
}
async function submitAnn(ev){
  ev.preventDefault(); const j=$('#a-judul').value.trim(), i=$('#a-isi').value.trim(), e=$('#a-err'); e.hidden=true;
  if(!j||!i){ e.textContent='Isi judul dan isi pengumuman.'; e.hidden=false; return; }
  const {error}=await S.sb.from('pengumuman').insert({judul:j,isi:i,plant:$('#a-plant').value||null,created_by:S.uid});
  if(error){ e.textContent=errMsg(error); e.hidden=false; return; }
  $('#a-judul').value=''; $('#a-isi').value=''; toast('Pengumuman terbit'); await reload();
}

/* ---------- mitra views ---------- */
const pkey=p=>p.plant+'|'+p.name;
function mitraCtx(){
  const mk=(partners,rows,pct,umpan,ann)=>{
    if(!partners.length) return null;
    const plants=[...new Set(partners.map(p=>p.plant))].sort((a,b)=>(S.plantOrder?.[a]??99)-(S.plantOrder?.[b]??99));
    partners=[...partners].sort((a,b)=>plants.indexOf(a.plant)-plants.indexOf(b.plant)||a.name.localeCompare(b.name));
    const series=new Map(partners.map(p=>[pkey(p),new Map()]));
    for(const r of rows){ const p=partners.find(x=>x.id===r.partner_id); if(!p) continue;
      series.get(pkey(p)).set(r.tanggal,{v:+r.volume,src:r.sumber,kendala:r.kendala,e:{pid:p.id,date:r.tanggal,volume:+r.volume,ritase:r.ritase,jenis:r.jenis,kendala:r.kendala,ket:r.ket,rencana:r.rencana,uid:r.user_id}}); }
    return {plants,plant:plants[0],partners,series,pct:pct||{},umpan,ann:ann.filter(a=>!a.plant||plants.includes(a.plant))};
  };
  if(S.preview){
    const pids=S.akses.filter(a=>a.user_id===S.preview).map(a=>a.partner_id);
    const partners=pids.map(id=>S.pById.get(id)).filter(Boolean); if(!partners.length) return null;
    const pct={}; for(const pa of partners){ const P=S.M?.pm.get(pa.plant); if(P&&P.target) pct[pa.plant]=Math.round(P.akum/P.target*100); }
    const umpan=[...S.followups.values()].filter(t=>pids.includes(t.partner_id)).map(t=>({...t,partner:S.pById.get(t.partner_id)?.name,plant:S.pById.get(t.partner_id)?.plant}));
    return mk(partners,S.rows.filter(r=>pids.includes(r.partner_id)),pct,umpan,S.ann);
  }
  if(S.role!=='mitra') return null;
  return mk(S.my.partners,S.my.rows,S.my.pct,S.my.umpan,S.ann);
}
function renderBeranda(){
  const ctx=mitraCtx(); if(!ctx) return;
  const keys=ctx.partners.map(pkey), multi=ctx.plants.length>1;
  if(!keys.includes(S.mp)) S.mp=keys[0];
  const P0=ctx.partners.find(p=>pkey(p)===S.mp), name=P0.name, plant=P0.plant, ser=ctx.series.get(S.mp)||new Map();
  const t=todayLocal(); let asOf='2026-01-01'; for(const d of ser.keys()) if(d>asOf&&d<=t) asOf=d; if(asOf==='2026-01-01') asOf=t;
  const sum=(from,to)=>{let s=0;for(const [d,o] of ser) if(d>=from&&d<=to) s+=o.v; return s;};
  const ym=asOf.slice(0,7), mo=+ym.slice(5)-1;
  const mtd=sum(ym+'-01',asOf), last30=sum(addDays(asOf,-29),asOf), prev30=sum(addDays(asOf,-59),addDays(asOf,-30));
  let last=null; for(const [d,o] of ser) if(o.v>0&&(!last||d>last)) last=d;
  $('#m-eyebrow').textContent='PLTU '+plant+(multi?` · Anda memasok ${ctx.plants.length} PLTU`:'');
  $('#m-title').textContent=name;
  $('#m-sub').textContent=`Data s/d ${dLong(asOf)}`+((P0?.kontrak||[]).length?' · Kontrak '+P0.kontrak.join(', '):'');
  const lbl=p=>multi?(new Set(ctx.partners.map(x=>x.name)).size>1?p.name+' · '+p.plant:p.plant):p.name;
  $('#m-partner-pick').innerHTML=keys.length>1?ctx.partners.map(p=>`<button type="button" aria-pressed="${pkey(p)===S.mp}" data-n="${esc(pkey(p))}">${esc(lbl(p))}</button>`).join(''):'';
  $('#m-partner-pick').querySelectorAll('button').forEach(b=>b.onclick=()=>{S.mp=b.dataset.n;renderBeranda();});
  let n14=0; const cells=[];
  for(let i=13;i>=0;i--){ const d=addDays(t,-i-1); const o=ser.get(d); const cls=o?(o.v>0?'ok':'kd'):''; if(o) n14++; cells.push(`<span class="${cls}" title="${dLong(d)}${o?': '+f1(o.v)+' MT':': belum ada laporan'}">${+d.slice(8)}</span>`); }
  $('#m-days').innerHTML=cells.join(''); $('#m-comp-sub').textContent=`${n14} dari 14 hari`;
  const pct_=ctx.pct[plant]??null;
  $('#m-kpis').innerHTML=`
    <div class="kpi"><span class="eyebrow">${MONTHS_L[mo]} s/d tgl ${+asOf.slice(8)}</span><span class="v num">${f1(mtd)}<small>MT</small></span><span class="s">Diterima PLTU ${esc(plant)}</span></div>
    <div class="kpi"><span class="eyebrow">30 hari terakhir</span><span class="v num">${f0(last30)}<small>MT</small></span><span class="s">${prev30>0?`${last30>=prev30?'Naik':'Turun'} ${pct(Math.abs(last30-prev30)/prev30)} dari 30 hari sebelumnya`:'Belum ada pembanding'}</span></div>
    <div class="kpi"><span class="eyebrow">Pengiriman terakhir</span><span class="v num">${last?dLabel(last):'—'}</span><span class="s">${last?(diffDays(last,t)<=1?'Terkirim kemarin/hari ini':`${diffDays(last,t)} hari lalu`):'Belum ada data'}</span></div>
    <div class="kpi"><span class="eyebrow">Progres PLTU ${esc(plant)}</span><span class="v num">${pct_!=null?Math.round(pct_)+'%':'—'}<small>target</small></span>${pct_!=null?`<div class="meter"><i style="width:${Math.min(100,pct_)}%"></i></div><span class="s">Capaian bersama semua mitra PLTU ini</span>`:''}</div>`;
  const rows=[]; for(let i=59;i>=0;i--){ const d=addDays(asOf,-i); rows.push({d,v:ser.get(d)?.v||0}); }
  dailyChart($('#m-daily'),{rows});
  const mon=new Array(12).fill(0); for(const [d,o] of ser) mon[+d.slice(5,7)-1]+=o.v;
  barChart($('#m-month'),{labels:MONTHS,values:mon,height:200,highlight:i=>i===mo,tipFn:i=>`<b>${MONTHS_L[i]}</b><br>${f1(mon[i])} MT`});
  $('#m-ann').innerHTML=ctx.ann.length?ctx.ann.slice(0,5).map(a=>`<div class="ann"><strong>${esc(a.judul)}</strong><p>${esc(a.isi)}</p><span class="meta">${dLong(String(a.created_at).slice(0,10))}</span></div>`).join(''):'<p class="empty" style="padding:0">Belum ada pengumuman.</p>';
  $('#m-cta').hidden=!!S.preview;
  renderMultiPlant(ctx);
  renderPic();
}
const normCo=s=>String(s||'').toLowerCase().replace(/\b(pt|cv|ud|kud|koperasi|tbk)\b/g,'').replace(/[^a-z0-9]/g,'');
const sameCo=(a,b)=>{ a=normCo(a); b=normCo(b); if(a.length<2||b.length<2) return false; return a===b||(Math.min(a.length,b.length)>=5&&(a.includes(b)||b.includes(a))); };
const plantRank=p=>S.plantOrder?.[p]??99;
const bestMatch=(names,co)=>names.find(n=>n===co)||names.find(n=>normCo(n)===normCo(co))||names.find(n=>sameCo(n,co))||'';
/* katalog: satu nama perusahaan bisa tercatat di beberapa PLTU */
function coLabel(n){ const k=S.katalog.find(x=>x.partner===n&&x.nama_lengkap); return k?`${n} — ${k.nama_lengkap}`:n; }
function coList(){ const seen=new Map(); for(const k of S.katalog){ const key=normCo(k.partner)||k.partner; if(!seen.has(key)) seen.set(key,k.partner); } return [...seen.values()].sort((a,b)=>normCo(a).localeCompare(normCo(b))); }
const katPlants=()=>[...new Set(S.katalog.map(k=>k.plant))].sort((a,b)=>plantRank(a)-plantRank(b));
const coPlants=co=>new Set(S.katalog.filter(k=>bestMatch([k.partner],co)||namaHit(co,{name:k.partner,nama_lengkap:k.nama_lengkap,alias:k.alias||[]})==='nama').map(k=>k.plant));
function pickHtml(plants,checked,reg,disabled){ return plants.map(p=>`<label class="pick"><input type="checkbox" value="${esc(p)}" ${checked.has(p)?'checked':''} ${disabled?.has(p)?'disabled':''}> ${esc(p)}${disabled?.has(p)?' <small>sudah terhubung</small>':reg.has(p)?' <small>tercatat</small>':''}</label>`).join(''); }
const picked=el=>[...el.querySelectorAll('input:checked:not(:disabled)')].map(i=>i.value);
/* kandidat PLTU untuk persetujuan manager */
/* ---------- pencocokan mitra: nomor kontrak, nama lengkap, singkatan ---------- */
const kontrakKeys=txt=>String(txt||'').split(/[,;\n]+/).map(t=>{ const m=t.match(/(\d{3,6})\s*[.\-\/ ]?\s*(PJ|SPK)?/i); return m?{raw:t.trim(),d:m[1],k:m[1]+(m[2]||'').toUpperCase()}:null; }).filter(Boolean);
const pKontrak=p=>[...(p.kontrak||[]),...(p.kontrak_tambahan||[])].map(k=>kontrakKeys(k)[0]).filter(Boolean);
const kontrakHit=(typed,p)=>{ const pk=pKontrak(p); for(const t of typed) for(const q of pk) if(t.k===q.k||(t.k===t.d&&t.d===q.d)) return q.raw; return ''; };
/* nomor kontrak per PLTU di formulir pendaftaran */
/* satu kotak isian = satu nomor kontrak; tombol "+ Tambah kontrak" untuk kontrak berikutnya di PLTU yang sama */
const kpRead=box=>{ const o={}; box.querySelectorAll('input[data-pl]').forEach(i=>{ const v=i.value.trim(); if(v) (o[i.dataset.pl]=o[i.dataset.pl]||[]).push(v); }); return o; };
function kpRender(box,plants,init){
  const cur=box.querySelector('input[data-pl]')?kpRead(box):{...(init||{})};
  const one=(pl,v,j,first)=>`<div class="kp-in"><input data-pl="${esc(pl)}" maxlength="80" autocomplete="off" placeholder="${first?'contoh: 0680.PJ':'kontrak berikutnya'}" aria-label="Nomor kontrak ${j+1} PLTU ${esc(pl)}" value="${esc(v)}">${first?'':`<button type="button" class="kp-x" aria-label="Hapus kontrak ${j+1} PLTU ${esc(pl)}" title="Hapus">×</button>`}</div>`;
  box.innerHTML=plants.length?plants.map(pl=>{ const vals=(cur[pl]&&cur[pl].length?cur[pl]:['']).slice(0,10);
      return `<div class="kp-row" data-plant="${esc(pl)}"><span class="kp-l">PLTU ${esc(pl)}</span><div class="kp-ins">${vals.map((v,j)=>one(pl,v,j,j===0)).join('')}<button type="button" class="kp-add">+ Tambah kontrak di PLTU ${esc(pl)}</button></div></div>`; }).join('')
    :'<p class="hint" style="margin:0">Centang PLTU di atas, lalu isi nomor kontraknya di sini.</p>';
  box.querySelectorAll('.kp-row').forEach(row=>{ const pl=row.dataset.plant, ins=row.querySelector('.kp-ins');
    row.querySelector('.kp-add').onclick=()=>{ const n=ins.querySelectorAll('input').length; if(n>=10) return; const t=document.createElement('div'); t.innerHTML=one(pl,'',n,false); const el=t.firstElementChild; ins.insertBefore(el,row.querySelector('.kp-add')); el.querySelector('.kp-x').onclick=()=>el.remove(); el.querySelector('input').focus(); };
    row.querySelectorAll('.kp-x').forEach(x=>x.onclick=()=>x.parentElement.remove()); });
}
const kpMissing=(box,plants)=>{ const kp=kpRead(box); return plants.find(pl=>!(kp[pl]||[]).some(x=>kontrakKeys(x).length)); };
const kpPack=(box,plants)=>{ const kp=kpRead(box); const o={}; plants.forEach(pl=>{ if(kp[pl]) o[pl]=kp[pl].slice(0,10); }); return {kontrak_pltu:o,kontrak:Object.entries(o).map(([pl,a])=>`${pl}: ${a.join(', ')}`).join('; ').slice(0,300)||null}; };
const kpFail=(box,pl)=>{ const i=[...box.querySelectorAll('input[data-pl]')].find(x=>x.dataset.pl===pl); i?.focus(); return `Isi nomor kontrak untuk PLTU ${pl} (contoh: 0680.PJ).`; };
const kpBad=box=>[...box.querySelectorAll('input[data-pl]')].find(i=>i.value.trim()&&!kontrakKeys(i.value).length);
const STOP=new Set(['pt','cv','ud','kud','kso','tbk','persero','koperasi','dan','&']);
const akronim=n=>String(n||'').toLowerCase().replace(/[().,]/g,' ').split(/\s+/).filter(w=>w&&!STOP.has(w)).map(w=>w[0]).join('');
function namaHit(typed,p){ if(!typed) return ''; const t=normCo(typed); if(!t) return '';
  const names=[p.name,p.nama_lengkap,...(p.alias||[])].filter(Boolean);
  if(names.some(n=>normCo(n)===t)) return 'nama';
  const ak=akronim(typed), pn=normCo(p.name);
  if(ak.length>=2&&ak===pn) return 'singkatan';
  if(p.nama_lengkap&&akronim(p.nama_lengkap)===t&&t.length>=2) return 'singkatan';
  if(names.some(n=>sameCo(n,typed))) return 'mirip';
  return ''; }
const VIA={kontrak:'cocok nomor kontrak',nama:'cocok nama',singkatan:'cocok singkatan',mirip:'nama mirip'};
const VIA_RANK={kontrak:4,nama:3,singkatan:2,mirip:1};
function reqCands(r,uid){
  const asked=new Set((r.plants&&r.plants.length?r.plants:[r.plant]).filter(Boolean));
  const linked=new Set(S.akses.filter(a=>a.user_id===uid).map(a=>a.partner_id));
  const kp=r.kontrak_pltu&&typeof r.kontrak_pltu==='object'?r.kontrak_pltu:null;
  const typedK=kontrakKeys(kp?Object.values(kp).flat().join(','):r.kontrak);
  const best=new Map();   // plant -> {match, via, hit}
  for(const p of S.partnersRaw){ if(linked.has(p.id)) continue;
    const own=kp&&kp[p.plant]?kontrakKeys(kp[p.plant].join(',')):[];
    const hit=(own.length&&kontrakHit(own,p))||(typedK.length&&kontrakHit(typedK,p))||''; const via=hit?'kontrak':namaHit(r.partner_name,p); if(!via) continue;
    const o=best.get(p.plant); if(!o||VIA_RANK[via]>VIA_RANK[o.via]) best.set(p.plant,{match:p.name,via,hit}); }
  const plants=new Set([...asked,...best.keys()]);
  const out=[];
  for(const pl of plants){ if(!S.M.pm.get(pl)) continue; const b=best.get(pl);
    if(!b&&[...linked].some(id=>S.pById.get(id)?.plant===pl)) continue;
    out.push({plant:pl,match:b?.match||'',via:b?.via||'',hit:b?.hit||'',asked:asked.has(pl)||b?.via==='kontrak'}); }
  return out.sort((a,b)=>plantRank(a.plant)-plantRank(b.plant));
}
/* ---------- data induk mitra (manager) ---------- */
function renderInduk(){
  const tb=$('#tbl-induk'); if(tb.contains(document.activeElement)) return;
  const by=new Map(); for(const p of S.partnersRaw){ const g=by.get(p.name)||[]; g.push(p); by.set(p.name,g); }
  const q=normCo($('#induk-q').value);
  const names=[...by.keys()].sort((a,b)=>normCo(a).localeCompare(normCo(b))).filter(n=>{ if(!q) return true; const g=by.get(n)[0]; return [n,g.nama_lengkap,...(g.alias||[])].some(x=>normCo(x).includes(q)); });
  const ak=n=>{ const g=by.get(n); return g.find(x=>x.nama_lengkap)?.nama_lengkap||''; };
  tb.innerHTML=`<thead><tr><th>Singkatan EPI</th><th>PLTU · nomor kontrak</th><th>Nama lengkap perusahaan</th><th>Nama lain (pisah koma)</th><th></th></tr></thead><tbody>${names.map(n=>{ const g=by.get(n).sort((a,b)=>plantRank(a.plant)-plantRank(b.plant)); const al=[...new Set(g.flatMap(x=>x.alias||[]))];
    return `<tr data-n="${esc(n)}"><td><strong>${esc(n)}</strong></td><td class="hint">${g.map(x=>`${esc(x.plant)}${[...(x.kontrak||[]),...(x.kontrak_tambahan||[])].length?' · <span class="mono">'+esc([...(x.kontrak||[]),...(x.kontrak_tambahan||[])].join(', '))+'</span>':''}`).join('<br>')}</td>
      <td><input data-f="nl" maxlength="120" value="${esc(ak(n))}" placeholder="belum diisi" aria-label="Nama lengkap ${esc(n)}"></td>
      <td><input data-f="al" maxlength="300" placeholder="—" value="${esc(al.join(', '))}" aria-label="Nama lain ${esc(n)}"></td>
      <td style="white-space:nowrap"><button class="btn sm" data-save type="button" disabled>Simpan</button> <button class="btn ghost sm" data-merge type="button">Ubah / gabung singkatan</button></td></tr>`; }).join('')}</tbody><datalist id="dl-singkatan">${[...by.keys()].sort().map(n=>`<option value="${esc(n)}">`).join('')}</datalist>`;
  $('#induk-q').oninput=()=>renderInduk();
  tb.querySelectorAll('tr[data-n]').forEach(tr=>{ const b=tr.querySelector('[data-save]'); const o0=[tr.querySelector('[data-f=nl]').value,tr.querySelector('[data-f=al]').value].join('|');
    tr.querySelectorAll('input').forEach(i=>i.oninput=()=>{ const ch=[tr.querySelector('[data-f=nl]').value,tr.querySelector('[data-f=al]').value].join('|')!==o0; b.disabled=!ch; tr.classList.toggle('dirty',ch); });
    tr.querySelector('[data-merge]').onclick=()=>gabungUI(tr,by);
    b.onclick=async()=>{ b.disabled=true; const n=tr.dataset.n; const nl=tr.querySelector('[data-f=nl]').value.trim()||null; const al=[...new Set(tr.querySelector('[data-f=al]').value.split(',').map(x=>x.trim()).filter(Boolean))].slice(0,10);
      const bentrok=al.filter(a=>[...by.keys()].some(k=>k!==n&&normCo(k)===normCo(a)));
      if(bentrok.length){ toast(`"${bentrok[0]}" adalah singkatan mitra lain. Pakai tombol "Ubah / gabung singkatan" untuk menyatukannya.`); b.disabled=false; return; }
      const {error}=await S.sb.from('partners').update({nama_lengkap:nl,alias:al}).eq('name',n);
      if(error){ toast(errMsg(error)); b.disabled=false; return; } toast('Data '+n+' disimpan'); tr.classList.remove('dirty'); document.activeElement?.blur?.(); await reload(); }; });
}
function gabungUI(tr,by){
  const n=tr.dataset.n; const cell=tr.lastElementChild; if(cell.querySelector('.gb')) return;
  const g=by.get(n)||[]; const w=document.createElement('div'); w.className='gb';
  w.innerHTML=`<label class="hint" for="gb-${g[0]?.id}">Singkatan baru atau singkatan mitra yang sama</label>
    <input id="gb-${g[0]?.id}" list="dl-singkatan" maxlength="60" placeholder="contoh: PT MTS" autocomplete="off">
    <div class="hint gb-info" aria-live="polite"></div>
    <div class="row"><button class="btn sm" type="button" data-go disabled>Terapkan</button><button class="btn ghost sm" type="button" data-x>Batal</button></div>`;
  cell.appendChild(w); const inp=w.querySelector('input'), info=w.querySelector('.gb-info'), go=w.querySelector('[data-go]'); inp.focus();
  const desc=()=>{ const ke=inp.value.trim().replace(/\s+/g,' '); go.dataset.armed=''; go.textContent='Terapkan';
    if(!ke||ke===n){ info.textContent=''; go.disabled=true; return; } go.disabled=false;
    const tgt=by.get(ke);
    if(tgt){ const sama=g.filter(x=>tgt.some(t=>t.plant===x.plant)).map(x=>x.plant); const pindah=g.filter(x=>!tgt.some(t=>t.plant===x.plant)).map(x=>x.plant);
      info.innerHTML=`<strong>Gabungkan ${esc(n)} ke ${esc(ke)}.</strong> ${sama.length?`Data di ${esc(sama.join(', '))} disatukan (tanggal yang sama dijumlahkan). `:''}${pindah.length?`${esc(pindah.join(', '))} pindah ke nama ${esc(ke)}. `:''}Akses mitra & kendala ikut pindah.`; }
    else info.innerHTML=`<strong>Ganti singkatan ${esc(n)} menjadi ${esc(ke)}</strong> di ${g.length} PLTU.`;
    info.innerHTML+=` Nama "${esc(n)}" disimpan sebagai nama lain, jadi kolom Excel bernama "${esc(n)}" tetap masuk ke ${esc(ke)}.`; };
  inp.oninput=desc;
  w.querySelector('[data-x]').onclick=()=>w.remove();
  go.onclick=async()=>{ const ke=inp.value.trim().replace(/\s+/g,' ');
    if(go.dataset.armed!=='1'){ go.dataset.armed='1'; go.textContent='Yakin? Klik lagi'; return; }
    go.disabled=true; go.textContent='Memproses…';
    const {data,error}=await S.sb.rpc('gabung_mitra',{p_dari:n,p_ke:ke});
    if(error){ toast(errMsg(error)); go.disabled=false; go.dataset.armed=''; go.textContent='Terapkan'; return; }
    toast(data?.digabung?`${n} digabung ke ${ke} (${data.laporan_dipindah} laporan dipindah)`:`Singkatan ${n} diganti menjadi ${ke}`);
    w.remove(); await reload(); };
}
/* nama lengkap & nama lain belajar dari persetujuan */
async function pelajariNama(r,picks){
  const typed=String(r.partner_name||'').trim();
  const done=new Set();
  if(typed) for(const x of picks){ const p=S.pByKey.get(x.plant+'|'+x.name); if(!p||done.has(p.name)) continue; done.add(p.name);
    if(normCo(typed)===normCo(p.name)) continue;
    const upd={}; const known=[p.nama_lengkap,...(p.alias||[])].filter(Boolean).map(normCo);
    if(known.includes(normCo(typed))) continue;
    if(!p.nama_lengkap&&normCo(typed).length>normCo(p.name).length+2) upd.nama_lengkap=typed.slice(0,120);
    else upd.alias=[...(p.alias||[]),typed].slice(-10);
    await S.sb.from('partners').update(upd).eq('name',p.name); }
  // nomor kontrak yang belum dikenal: simpan ke mitra bila hanya satu PLTU disetujui
  if(r.kontrak_pltu&&typeof r.kontrak_pltu==='object'){
    for(const x of picks){ const p=S.pByKey.get(x.plant+'|'+x.name); const typed=r.kontrak_pltu[x.plant]; if(!p||!typed) continue;
      const baru=typed.filter(t=>{ const k=kontrakKeys(t); return k.length&&!kontrakHit(k,p); });
      if(baru.length) await S.sb.from('partners').update({kontrak_tambahan:[...new Set([...(p.kontrak_tambahan||[]),...baru])].slice(-10)}).eq('id',p.id); }
    return; }
  const baruK=kontrakKeys(r.kontrak).filter(t=>!S.partnersRaw.some(p=>kontrakHit([t],p)));
  const ex=picks.map(x=>S.pByKey.get(x.plant+'|'+x.name)).filter(Boolean);
  if(baruK.length&&ex.length===1){ const p=ex[0]; await S.sb.from('partners').update({kontrak_tambahan:[...new Set([...(p.kontrak_tambahan||[]),...baruK.map(t=>t.raw)])].slice(-10)}).eq('id',p.id); }
}
const fullName=p=>p?.nama_lengkap?`${p.name} — ${p.nama_lengkap}`:(p?.name||'');

/* ---------- mitra: PIC ---------- */
function renderPic(){
  const box=$('#m-pic'); const ro=!!S.preview; box.hidden=false;
  const prof=ro?(S.profiles||[]).find(p=>p.id===S.preview)||{}:S.profile||{};
  const extra=ro?(S.pics||[]).filter(x=>x.user_id===S.preview):(S.my.pics||[]);
  const card=(k,nama,hp,jab,utama)=>`<div class="pic" data-k="${k}"><div class="who"><strong>${esc(nama||'—')}${utama?' <span class="chip">PIC utama</span>':''}</strong><span class="hint">${esc(hp||'No. HP belum diisi')}${jab?' · '+esc(jab):''}</span></div>${ro?'':`<div class="act"><button class="btn ghost sm" data-ed type="button">Ubah</button>${utama?'':`<button class="btn ghost sm" data-main type="button">Jadikan utama</button><button class="btn danger sm" data-del type="button">Hapus</button>`}</div>`}</div>`;
  $('#m-pic-list').innerHTML=card('u',prof.nama,prof.hp,'',true)+extra.map(x=>card(x.id,x.nama,x.hp,x.jabatan,false)).join('');
  $('#m-pic-add').hidden=ro; if(ro) return;
  const run=async(fn,msg)=>{ try{ await fn(); toast(msg); await reload(); }catch(e){ toast(errMsg(e)); } };
  const chk=e=>{ if(e) throw e; };
  $('#m-pic-list').querySelectorAll('.pic').forEach(el=>{ const k=el.dataset.k, x=k==='u'?null:extra.find(p=>String(p.id)===k);
    el.querySelector('[data-ed]').onclick=()=>{ const v=x||{nama:prof.nama,hp:prof.hp,jabatan:''};
      el.innerHTML=`<form novalidate><div class="field"><label>Nama PIC</label><input data-f="nama" maxlength="60" value="${esc(v.nama||'')}"></div><div class="field"><label>No. HP / WhatsApp</label><input data-f="hp" maxlength="20" inputmode="tel" value="${esc(v.hp||'')}"></div>${x?`<div class="field"><label>Jabatan / tugas</label><input data-f="jab" maxlength="40" value="${esc(v.jabatan||'')}"></div>`:''}<div class="row"><button class="btn sm" type="submit">Simpan</button><button class="btn ghost sm" type="button" data-cancel>Batal</button></div></form>`;
      const f=el.querySelector('form'); f.querySelector('input').focus();
      el.querySelector('[data-cancel]').onclick=renderPic;
      f.onsubmit=ev=>{ ev.preventDefault(); const g=n=>f.querySelector(`[data-f=${n}]`)?.value.trim()||'';
        if(g('nama').length<2){ toast('Isi nama PIC'); return; }
        run(async()=>{ if(!x){ const {error}=await S.sb.rpc('ubah_pic_utama',{p_nama:g('nama'),p_hp:g('hp')}); chk(error); }
          else { const {error}=await S.sb.from('pic_tambahan').update({nama:g('nama'),hp:g('hp')||null,jabatan:g('jab')||null}).eq('id',x.id); chk(error); } },'PIC disimpan'); }; };
    const del=el.querySelector('[data-del]'); if(del) del.onclick=()=>{ if(del.dataset.armed!=='1'){ del.dataset.armed='1'; del.textContent='Yakin hapus?'; return; }
      run(async()=>{ const {error}=await S.sb.from('pic_tambahan').delete().eq('id',x.id); chk(error); },'PIC dihapus'); };
    const mn=el.querySelector('[data-main]'); if(mn) mn.onclick=()=>{ const old={nama:prof.nama,hp:prof.hp}; run(async()=>{
      let {error}=await S.sb.rpc('ubah_pic_utama',{p_nama:x.nama,p_hp:x.hp||''}); chk(error);
      if(old.nama){ ({error}=await S.sb.from('pic_tambahan').update({nama:old.nama,hp:old.hp||null,jabatan:null}).eq('id',x.id)); }
      else ({error}=await S.sb.from('pic_tambahan').delete().eq('id',x.id)); chk(error); },x.nama+' menjadi PIC utama'); };
  });
  $('#m-pic-add').onsubmit=async ev=>{ ev.preventDefault(); const e=$('#pa-err'); e.hidden=true;
    const nama=$('#pa-nama').value.trim(), hp=$('#pa-hp').value.trim(), jab=$('#pa-jab').value.trim();
    if(nama.length<2||!hp){ e.textContent='Isi nama dan nomor HP PIC.'; e.hidden=false; return; }
    if(extra.length>=10){ e.textContent='Maksimal 10 PIC tambahan.'; e.hidden=false; return; }
    const {error}=await S.sb.from('pic_tambahan').insert({user_id:S.uid,nama,hp,jabatan:jab||null});
    if(error){ e.textContent=errMsg(error); e.hidden=false; return; }
    $('#pa-nama').value=''; $('#pa-hp').value=''; $('#pa-jab').value=''; toast('PIC ditambahkan'); await reload(); };
}
function renderMultiPlant(ctx){
  const box=$('#m-multi');
  if(ctx.partners.length>1){
    const t=todayLocal(), ym=t.slice(0,7);
    const rows=ctx.partners.map(p=>{ const ser=ctx.series.get(pkey(p))||new Map(); let mtd=0,l30=0,last=null;
      for(const [d,o] of ser){ if(d.startsWith(ym)) mtd+=o.v; if(d>addDays(t,-30)&&d<=t) l30+=o.v; if(o.v>0&&(!last||d>last)) last=d; }
      const pc=ctx.pct[p.plant];
      return `<tr class="click" data-k="${esc(pkey(p))}" tabindex="0"><td><strong>${esc(p.plant)}</strong><br><span class="hint">${esc(p.name)}</span></td><td class="r num">${f1(mtd)}</td><td class="r num">${f0(l30)}</td><td class="r num">${last?dLabel(last):'—'}</td><td>${pc!=null?`<div class="meter" style="min-width:80px"><i style="width:${Math.min(100,pc)}%"></i></div><span class="hint">${Math.round(pc)}% target PLTU</span>`:'—'}</td><td class="r">${S.preview?'':`<a class="btn ghost sm" href="#lapor" data-lapor="${esc(pkey(p))}">Lapor</a>`}</td></tr>`; });
    $('#tbl-multi').innerHTML=`<thead><tr><th>PLTU · nama mitra</th><th class="r">Bulan ini (MT)</th><th class="r">30 hari (MT)</th><th class="r">Kirim terakhir</th><th>Progres PLTU</th><th></th></tr></thead><tbody>${rows.join('')}</tbody>`;
    $('#m-multi-sub').textContent=`${ctx.plants.length} PLTU · ${ctx.partners.length} kontrak pasokan`;
    $('#tbl-multi').querySelectorAll('tr.click').forEach(tr=>{ const go=()=>{S.mp=tr.dataset.k;renderBeranda();scrollTo({top:0,behavior:'smooth'});}; tr.onclick=e=>{ if(e.target.closest('[data-lapor]')) return; go(); }; tr.onkeydown=e=>{if(e.key==='Enter')go();}; });
    $('#tbl-multi').querySelectorAll('[data-lapor]').forEach(a=>a.onclick=()=>{S.mp=a.dataset.lapor;});
    box.hidden=false;
  } else box.hidden=true;
  const wrap=$('#m-add'); if(S.preview){ wrap.hidden=true; return; } wrap.hidden=false;
  const r=S.my.req, st=$('#m-add-status');
  const linked=new Set(ctx.partners.map(pkey));
  const pend=r&&!r.staf&&r.status==='menunggu'&&(r.plants&&r.plants.length?r.plants:[r.plant]).some(p=>!ctx.plants.includes(p));
  st.innerHTML=pend?`<div class="notice">Permintaan tambahan <strong>PLTU ${esc((r.plants&&r.plants.length?r.plants:[r.plant]).filter(p=>!ctx.plants.includes(p)).join(', '))}</strong> sedang menunggu persetujuan manager PLN EPI.</div>`
    :r&&r.status==='ditolak'?`<div class="notice warn">Permintaan PLTU ${esc(r.plant||'')} tidak disetujui. ${esc(r.alasan||'')}</div>`:'';
  const abox=$('#m-add-plants'); const co=ctx.partners[0]?.name||S.profile?.username||'';
  const mineP=new Set(ctx.plants); const reg=coPlants(co);
  const key=S.katalog.length+'|'+ctx.plants.join(',');
  if(abox.dataset.init!==key){ abox.dataset.init=key; abox.innerHTML=pickHtml(katPlants(),new Set(pend?(r.plants||[r.plant]).filter(p=>!mineP.has(p)):[]),reg,mineP); kpRender($('#m-kp'),picked(abox),pend?r.kontrak_pltu:null); }
  abox.onchange=()=>kpRender($('#m-kp'),picked(abox));
  $('#m-add-form').onsubmit=async ev=>{ ev.preventDefault(); const e=$('#m-add-err'); e.hidden=true;
    const plants=picked(abox); if(!plants.length){ e.textContent='Centang minimal satu PLTU tambahan.'; e.hidden=false; return; }
    const miss=kpMissing($('#m-kp'),plants); if(miss){ e.textContent=kpFail($('#m-kp'),miss); e.hidden=false; return; }
    const bad=kpBad($('#m-kp')); if(bad){ e.textContent=`"${bad.value.trim()}" bukan nomor kontrak yang dikenali (contoh: 0680.PJ).`; e.hidden=false; bad.focus(); return; }
    const partner=co.trim().replace(/\|/g,'/'); const baru=!plants.every(p=>reg.has(p));
    const {error}=await S.sb.from('permintaan').upsert({user_id:S.uid,plant:plants[0],plants,partner_name:partner,...kpPack($('#m-kp'),plants),baru,staf:false,pic:r?.pic||S.profile?.nama||null,hp:r?.hp||S.profile?.hp||null,status:'menunggu',alasan:null},{onConflict:'user_id'});
    if(error){ e.textContent=errMsg(error); e.hidden=false; return; }
    toast('Permintaan PLTU tambahan terkirim'); await reload(); };
}
function renderIsu(){
  const ctx=mitraCtx(); if(!ctx) return;
  const U=ctx.umpan.map(u=>({id:u.issue_id,title:u.judul||'',text:u.teks||'',cat:u.kategori,date:u.tanggal||'',end:u.tanggal_akhir||u.tanggal||'',status:u.status||'open',pesan:u.pesan||'',partner:u.partner,plant:u.plant,src:String(u.issue_id).startsWith('mitra-')?'Laporan Anda':'Pemantauan PLN EPI'}));
  for(const p of ctx.partners) for(const [d,o] of ctx.series.get(pkey(p))||[]) if(o.src==='online'&&o.kendala&&o.kendala!=='none'){ const id=slug('mitra-'+p.id+'-'+d); if(!U.some(u=>u.id===id)) U.push({id,title:'',text:o.e.ket||'',cat:o.kendala,date:d,end:d,status:'open',pesan:'',partner:p.name,plant:p.plant,src:'Laporan Anda'}); }
  U.sort((a,b)=>String(b.end).localeCompare(String(a.end)));
  $('#m-isu-count').textContent=`${U.length} catatan · ${U.filter(u=>u.status!=='selesai').length} masih terbuka`;
  $('#m-isu').innerHTML=U.length?U.map(u=>`<article class="issue"><div class="issue-h"><span class="pill ${u.status}">${ST_L[u.status]||'Belum ditangani'}</span><span class="chip">${esc(CATS[u.cat]?.label||'')}</span>${ctx.partners.length>1?`<strong>${esc((u.partner||'')+(ctx.plants.length>1&&u.plant?' · '+u.plant:''))}</strong>`:''}<span class="when">${esc(u.src)}${u.date?' · '+(u.end&&u.end!==u.date?dLabel(u.date)+' – '+dLabel(u.end):dLabel(u.date)):''}</span></div>
     ${u.title?`<p><strong>${esc(u.title)}</strong></p>`:''}${u.text?`<p style="color:var(--ink-2)">${esc(u.text)}</p>`:''}
     ${u.pesan?`<div class="fu-view"><strong>Tanggapan PLN EPI:</strong> ${esc(u.pesan)}</div>`:''}
     ${(CATS[u.cat]?.mitra||[]).length?`<details><summary>Saran langkah untuk Anda</summary><ul>${CATS[u.cat].mitra.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></details>`:''}</article>`).join('')
    :'<p class="empty">Belum ada kendala. Laporkan kendala lewat formulir Lapor Harian agar PLN EPI bisa membantu.</p>';
  $('#m-guide').innerHTML=CAT_ORDER.filter(k=>k!=='lainnya').map(k=>`<div class="alert info"><div class="alert-h"><strong>${esc(CATS[k].label)}</strong></div><ul>${CATS[k].mitra.map(x=>`<li>${esc(x)}</li>`).join('')}</ul></div>`).join('');
}
function renderDaftar(){
  const r=S.my.req, st=$('#daftar-status'), form=$('#reg-form');
  if(S.role==='dicabut'){ $('#daftar-title').textContent='Akses dicabut'; st.innerHTML='<div class="notice warn">Akses untuk akun ini telah dicabut oleh PLN EPI. Hubungi PIC PLN EPI Kalimantan bila perlu dibuka kembali.</div>'; form.hidden=true; return; }
  if(r&&r.status==='ditolak'){ $('#daftar-title').textContent='Permintaan ditolak'; st.innerHTML=`<div class="notice warn">${esc(r.alasan||'Permintaan tidak disetujui.')} Anda dapat memperbaiki data dan mengirim ulang.</div>`; }
  else if(r&&r.status==='menunggu'){ $('#daftar-title').textContent='Menunggu persetujuan'; st.innerHTML=`<div class="notice">Permintaan untuk <strong>${esc(r.staf?'akses staf PLN EPI':r.partner_name)}</strong>${r.staf?'':` (PLTU ${esc((r.plants&&r.plants.length?r.plants:[r.plant]).join(', '))})`} sudah terkirim ${r.created_at?dLong(String(r.created_at).slice(0,10)):''}. Halaman akan terbuka otomatis setelah disetujui manager PLN EPI.</div>`; $('#r-submit').textContent='Perbarui permintaan'; }
  else if(r&&r.status==='disetujui'){ $('#daftar-title').textContent='Menyiapkan akses'; st.innerHTML='<div class="notice">Permintaan Anda sudah disetujui. Muat ulang halaman bila tampilan belum berubah.</div>'; }
  else { $('#daftar-title').textContent='Daftarkan akun mitra'; st.innerHTML=''; $('#r-submit').textContent='Kirim permintaan akses'; }
  form.hidden=false;
  const pa=$('#r-partner'), box=$('#r-plants'), stf=$('#r-staf');
  if(pa.dataset.init===String(S.katalog.length)) return;
  pa.dataset.init=String(S.katalog.length);
  pa.innerHTML='<option value="">— pilih perusahaan —</option>'+coList().map(n=>`<option value="${esc(n)}">${esc(coLabel(n))}</option>`).join('')+'<option value="__new">Perusahaan lain (belum ada di daftar)…</option>';
  const coName=()=>pa.value==='__new'?$('#r-new').value.trim():pa.value;
  const draw=keep=>{ const reg=pa.value&&pa.value!=='__new'?coPlants(pa.value):new Set(); box.innerHTML=pickHtml(katPlants(),keep||reg,reg); };
  pa.onchange=()=>{ $('#r-new-wrap').hidden=stf.checked||pa.value!=='__new'; draw(); };
  const tog=()=>{ $('#r-partner-wrap').hidden=stf.checked; $('#r-plants-wrap').hidden=stf.checked; $('#r-kontrak-wrap').hidden=stf.checked; $('#r-new-wrap').hidden=stf.checked||pa.value!=='__new'; }; stf.onchange=tog;
  draw();
  if(r&&r.staf){ stf.checked=true; }
  else if(r){ const v=bestMatch(coList(),r.partner_name||''); if(v) pa.value=v; else { pa.value='__new'; $('#r-new').value=r.partner_name||''; } draw(new Set((r.plants&&r.plants.length?r.plants:[r.plant]).filter(Boolean))); }
  tog();
  if(r){ $('#r-pic').value=r.pic||''; $('#r-hp').value=r.hp||''; }
  kpRender($('#r-kp'),picked(box),r?.kontrak_pltu||null); box.onchange=()=>kpRender($('#r-kp'),picked(box));
  pa.addEventListener('change',()=>kpRender($('#r-kp'),picked(box)));
  form.onsubmit=async ev=>{ ev.preventDefault(); const e=$('#r-err'); e.hidden=true;
    const staf=stf.checked; const baru=!staf&&pa.value==='__new'; const partner=staf?null:coName().replace(/\|/g,'/').replace(/\s+/g,' '); const plants=staf?[]:picked(box); const pic=$('#r-pic').value.trim(), hp=$('#r-hp').value.trim();
    const miss=staf?null:kpMissing($('#r-kp'),plants); const pk=staf?{kontrak:null,kontrak_pltu:null}:kpPack($('#r-kp'),plants);
    if((!staf&&(!partner||!plants.length))||!pic||!hp){ e.textContent=staf?'Isi nama dan nomor HP Anda.':!partner?'Pilih nama perusahaan Anda.':!plants.length?'Centang minimal satu PLTU yang Anda pasok.':'Lengkapi nama PIC dan nomor HP.'; e.hidden=false; return; }
    if(miss){ e.textContent=kpFail($('#r-kp'),miss); e.hidden=false; return; }
    const bad=staf?null:kpBad($('#r-kp')); if(bad){ e.textContent=`"${bad.value.trim()}" bukan nomor kontrak yang dikenali (contoh: 0680.PJ).`; e.hidden=false; bad.focus(); return; }
    const {error}=await S.sb.from('permintaan').upsert({user_id:S.uid,plant:staf?null:plants[0],plants,partner_name:partner,...pk,baru,staf,pic,hp,status:'menunggu',alasan:null},{onConflict:'user_id'});
    if(error){ e.textContent=errMsg(error); e.hidden=false; return; }
    toast('Permintaan terkirim'); await reload(); };
}

/* ---------- roles, routing ---------- */
const MGR_TABS=[['ringkasan','Ringkasan'],['pltu','Per PLTU'],['input','Input Harian'],['kendala','Kendala & Mitigasi'],['akses','Mitra & Akses']];
const MIT_TABS=[['beranda','Beranda'],['lapor','Lapor Harian'],['isu','Kendala & Tanggapan']];
const SEC={ringkasan:'v-ringkasan',pltu:'v-pltu',input:'v-input',kendala:'v-kendala',akses:'v-akses',beranda:'v-beranda',lapor:'v-input',isu:'v-isu',daftar:'v-daftar',guest:'v-guest',loading:'v-loading',login:'v-login'};
function tabsFor(){
  if(isMgr()) return MGR_TABS;
  if(mitraCtx()) return MIT_TABS;
  return [];
}
let lastTabsKey='';
function applyRole(){
  const tabs=tabsFor(); const key=tabs.map(t=>t[0]).join()+'|'+S.preview;
  if(key!==lastTabsKey){ lastTabsKey=key;
    $('#tabs').innerHTML=tabs.map(([v,l])=>`<a href="#${v}" data-v="${v}">${esc(l)}${v==='kendala'||v==='akses'?'<span class="badge" hidden></span>':''}</a>`).join(''); }
  const chip=$('#role-chip');
  if(isMgr()){ chip.textContent='Manager · akses penuh'; chip.hidden=false; }
  else { const c=mitraCtx(); if(c){ chip.textContent='Mitra · '+[...new Set(c.partners.map(p=>p.name))].join(', ')+(c.plants.length>1?` · ${c.plants.length} PLTU`:''); chip.hidden=false; } else chip.hidden=true; }
  $('#user-box').hidden=!S.uid; $('#user-email').textContent=S.profile?.username||S.email||'';
  const pb=$('#preview-bar'); pb.hidden=!S.preview;
  if(S.preview){ const r=profOf(S.preview); $('#preview-text').textContent=`Pratinjau: halaman ini persis seperti yang dilihat ${r.username||r.nama||'mitra'}.`; }
  $('#foot').textContent = isMgr()
    ? 'Sumber: file “2026 REALISASI MITRA KALIMANTAN” (Rekap Jan–Mar, harian per mitra Apr–3 Nov 2026) ditambah laporan harian mitra. Target Waiver dapat diubah manager. Data hanya terbuka untuk akun yang login sesuai perannya.'
    : 'Data pengiriman Anda bersumber dari pencatatan PLN EPI dan laporan harian Anda. Hubungi PIC PLN EPI Kalimantan bila ada selisih.';
}
function route(){
  const tabs=tabsFor().map(t=>t[0]); let v=location.hash.slice(1);
  if(!S.role||(S.role==='manager'&&!S.M)) v='loading'; else if(S.role==='login') v='login'; else if(S.role==='guest') v='guest'; else if(!tabs.length) v='daftar'; else if(!tabs.includes(v)) v=tabs[0];
  S.view=v;
  Object.values(SEC).forEach(id=>{ const el=$('#'+id); if(el) el.hidden=true; }); $('#'+SEC[v]).hidden=false;
  document.querySelectorAll('nav a').forEach(a=>{ if(a.dataset.v===v) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current'); });
  if(v==='input'||v==='lapor') initForm();
  renderView();
}
function renderView(){ hideTip(); const v=S.view;
  try{
    if(isMgr()&&S.M){ if(v==='ringkasan') renderRingkasan(); else if(v==='pltu') renderPltu(); else if(v==='input') renderInputSide(); else if(v==='kendala') renderKendala(); else if(v==='akses') renderAkses(); badges(); }
    else if(v==='beranda') renderBeranda(); else if(v==='isu') renderIsu(); else if(v==='lapor') renderInputSide(); else if(v==='daftar') renderDaftar();
  }catch(e){ console.error(e); }
}
function refresh(){
  if(S.role==='manager'){ prepBase(); S.M=build(); $('#asof-text').textContent='Data s/d '+dLong(S.M.asOf)+syncLabel(); if(!S.filtersReady){ S.filtersReady=true; initKendalaFilters(); } }
  const before=S.view; applyRole();
  const tabs=tabsFor().map(t=>t[0]);
  if(before==='loading'||before==='daftar'||(tabs.length&&!tabs.includes(before))) route(); else renderView();
}
let rt; addEventListener('resize',()=>{clearTimeout(rt);rt=setTimeout(renderView,150);});
addEventListener('hashchange',route);
function toast(m){ const t=$('#toast'); t.textContent=m; t.hidden=false; clearTimeout(toast.t); toast.t=setTimeout(()=>t.hidden=true,2600); }

/* ---------- csv ---------- */
function exportCSV(){
  const rows=[['Tanggal','PLTU','Mitra','Realisasi (MT)','Sumber','Kendala','Keterangan']];
  const keys=[...S.M.daily.keys()].sort((a,b)=>a.split('|')[2].localeCompare(b.split('|')[2])||a.localeCompare(b));
  for(const k of keys){ const [pl,pa,d]=k.split('|'); const o=S.M.daily.get(k); rows.push([d,pl,pa,String(o.v).replace('.',','),o.src==='mitra'?'Input online':'Excel',o.e?CATS[o.e.kendala]?.label||'':'',o.e?.ket||'']); }
  const csv='﻿'+rows.map(r=>r.map(c=>/[;"\n]/.test(c)?'"'+String(c).replace(/"/g,'""')+'"':c).join(';')).join('\n');
  const a=document.createElement('a'); a.href=URL.createObjectURL(new Blob([csv],{type:'text/csv'})); a.download=`realisasi-mitra-kalimantan-${S.M.asOf}.csv`; document.body.appendChild(a); a.click(); setTimeout(()=>{URL.revokeObjectURL(a.href);a.remove();},500);
}

/* ---------- data loading ---------- */
async function fetchAll(table,select,orders){
  let out=[],from=0;
  for(;;){ let q=S.sb.from(table).select(select); for(const o of orders) q=q.order(o,{ascending:true}); const {data,error}=await q.range(from,from+999); if(error) throw error; out=out.concat(data); if(data.length<1000) break; from+=1000; }
  return out;
}
const must=async p=>{ const {data,error}=await p; if(error) throw error; return data; };
async function loadManager(){
  const [plants,partners,rows,cat,tl,profiles,akses,req,ann,pics]=await Promise.all([
    must(S.sb.from('plants').select('*').order('urut')), fetchAll('partners','*',['id']), fetchAll('realisasi','*',['tanggal','partner_id']),
    fetchAll('catatan','*',['id']), fetchAll('tindak_lanjut','*',['issue_id']), fetchAll('profiles','*',['created_at','id']),
    fetchAll('akses','*',['user_id','partner_id']), fetchAll('permintaan','*',['created_at','user_id']),
    must(S.sb.from('pengumuman').select('*').order('created_at',{ascending:false}).limit(50)),
    (async()=>{ const r=await S.sb.from('pic_tambahan').select('*').order('created_at'); return r.data||[]; })()]);
  Object.assign(S,{plantsRaw:plants,partnersRaw:partners,rows,catatan:cat,profiles,akses,req,ann,pics});
  S.plantOrder=Object.fromEntries(plants.map((p,i)=>[p.name,i]));
  S.followups=new Map(tl.map(t=>[t.issue_id,t]));
  S.pById=new Map(partners.map(p=>[p.id,p])); S.pByKey=new Map(partners.map(p=>[p.plant+'|'+p.name,p]));
  const [st,lg]=await Promise.all([S.sb.from('pengaturan').select('*').eq('kunci','excel_url').maybeSingle(), S.sb.from('sinkron_log').select('*').order('waktu',{ascending:false}).limit(8)]);
  S.sync={ready:!st.error&&!lg.error, url:st.data?.nilai||'', log:lg.data||[]};
}
async function loadMitra(){
  const [partners,rows,prog,umpan,ann,req,kat,pics]=await Promise.all([
    fetchAll('partners','*',['id']), fetchAll('realisasi','*',['tanggal','partner_id']), must(S.sb.rpc('progres_pltu')), must(S.sb.rpc('umpan_saya')),
    must(S.sb.from('pengumuman').select('*').order('created_at',{ascending:false}).limit(20)),
    must(S.sb.from('permintaan').select('*').eq('user_id',S.uid).maybeSingle()), (async()=>{ const a=await S.sb.rpc('katalog_lengkap'); if(!a.error&&a.data) return a.data; return must(S.sb.rpc('katalog')); })(),
    (async()=>{ const r=await S.sb.from('pic_tambahan').select('*').order('created_at'); return r.data||[]; })()]);
  S.my.pics=pics;
  S.my.partners=S.role==='mitra'?partners:[]; S.my.rows=rows; S.my.umpan=umpan; S.my.req=req; S.katalog=kat; S.ann=ann;
  S.my.pct=Object.fromEntries((prog||[]).filter(x=>x.pct!=null).map(x=>[x.plant,+x.pct]));
  S.plantOrder=Object.fromEntries([...new Set(kat.map(k=>k.plant))].map((p,i)=>[p,i]));
}
let loading=null, lastLoad=0;
async function reload(){
  if(loading) return loading;
  loading=(async()=>{
    try{
      const prof=await must(S.sb.from('profiles').select('*').eq('id',S.uid).maybeSingle());
      S.profile=prof; const role=prof?.role||'pending';
      if(role==='manager'){ S.role='manager'; await loadManager(); }
      else { if(S.role==='manager'){ S.preview=null; } S.role=role==='mitra'?'mitra':role==='dicabut'?'dicabut':'pending'; await loadMitra(); }
      lastLoad=Date.now(); refresh();
    }catch(e){ console.error(e); toast('Gagal memuat data: '+errMsg(e)); }
    finally{ loading=null; }
  })();
  return loading;
}
let rtT=null;
function subscribeRealtime(){
  const kick=()=>{ clearTimeout(rtT); rtT=setTimeout(reload,1500); };
  S.sb.channel('rmk').on('postgres_changes',{event:'*',schema:'public',table:'realisasi'},kick).on('postgres_changes',{event:'*',schema:'public',table:'permintaan'},kick).subscribe();
  addEventListener('focus',()=>{ if(Date.now()-lastLoad>60000) reload(); });
  setInterval(()=>{ if(document.visibilityState==='visible') reload(); },180000);
}

/* ---------- login ---------- */
const AKUN_DOMAIN='akun.realisasi-biomassa-kalimantan.netlify.app';
const toLoginEmail=u=>{ u=String(u||'').trim(); if(u.includes('@')) return u.toLowerCase();
  const s=u.toLowerCase().normalize('NFKD').replace(/[^a-z0-9]+/g,'.').replace(/^\.+|\.+$/g,'').slice(0,40); return s?s+'@'+AKUN_DOMAIN:''; };
function initLogin(){
  const busy=(b,on,txt)=>{ b.disabled=on; if(txt) b.textContent=txt; };
  const setTab=t=>{ $('#auth-in').setAttribute('aria-selected',String(t==='in')); $('#auth-up').setAttribute('aria-selected',String(t==='up'));
    $('#login-form').hidden=t!=='in'; $('#signup-form').hidden=t!=='up'; if(t==='up') loadPltu(); try{ history.replaceState(null,'',t==='up'?'#daftar':'#'); }catch(e){} };
  $('#auth-in').onclick=()=>setTab('in'); $('#auth-up').onclick=()=>setTab('up');
  $('#go-signup').onclick=ev=>{ ev.preventDefault(); const n=$('#l-email').value.trim(); if(n&&!$('#s-co').value){ $('#s-co').value=n; $('#s-user').value=n; } setTab('up'); $('#s-co').focus(); };
  document.querySelectorAll('[data-eye]').forEach(b=>b.onclick=()=>{ const i=$('#'+b.dataset.eye); const show=i.type==='password'; i.type=show?'text':'password'; b.textContent=show?'Sembunyikan':'Lihat'; if(b.dataset.eye==='s-pass') $('#s-pass2').type=i.type; });
  setTab(location.hash==='#daftar'?'up':'in');

  /* ---- masuk ---- */
  const le=$('#login-err');
  $('#login-form').onsubmit=async ev=>{ ev.preventDefault(); le.hidden=true; const btn=$('#l-go'); if(btn.disabled) return;
    const nama=$('#l-email').value.trim().replace(/\s+/g,' '), pw=$('#l-pass').value;
    const fail=h=>{ le.innerHTML=h; le.hidden=false; busy(btn,false,'Masuk'); const a=le.querySelector('a'); if(a) a.onclick=e=>{ e.preventDefault(); $('#go-signup').click(); }; };
    if(!nama||!pw) return fail('Isi nama pengguna dan password.');
    busy(btn,true,'Memeriksa…');
    const {error}=await S.sb.auth.signInWithPassword({email:toLoginEmail(nama),password:pw});
    if(!error){ location.hash=''; location.reload(); return; }
    if(/invalid/i.test(error.message)){ const {data:free}=await S.sb.rpc('nama_tersedia',{nama});
      return fail(free===true?`Nama pengguna <strong>${esc(nama)}</strong> belum terdaftar. Periksa ejaannya, atau <a href="#">daftar akun baru</a>.`:'Password salah. Coba lagi, atau minta manager PLN EPI Kalimantan mereset password Anda.'); }
    fail(/rate|many/i.test(error.message)?'Terlalu banyak percobaan. Tunggu beberapa menit lalu coba lagi.':esc(error.message)); };

  /* ---- daftar ---- */
  const se=$('#signup-err'); let userEdited=false;
  $('#s-user').oninput=()=>{ userEdited=true; };
  $('#s-co').oninput=()=>{ if(!userEdited){ const v=$('#s-co').value.replace(/\s+/g,' ').trim(); $('#s-user').value=v.length>40?v.slice(0,40).trim():v; } };
  const tog=()=>{ document.querySelectorAll('#signup-form [data-mitra]').forEach(x=>x.hidden=$('#s-staf').checked); }; $('#s-staf').onchange=tog; tog();
  $('#signup-form').onsubmit=async ev=>{ ev.preventDefault(); se.hidden=true; const btn=$('#s-go'); if(btn.disabled) return;
    const fail=(m,f)=>{ se.textContent=m; se.hidden=false; busy(btn,false,'Daftar & kirim permintaan akses'); if(f) $(f).focus(); };
    const staf=$('#s-staf').checked, co=$('#s-co').value.trim().replace(/\s+/g,' ').replace(/\|/g,'/'), plants=staf?[]:picked($('#s-plants'));
    const pic=$('#s-pic').value.trim(), hp=$('#s-hp').value.trim(), user=$('#s-user').value.trim().replace(/\s+/g,' '), pw=$('#s-pass').value, pw2=$('#s-pass2').value;
    if(!staf&&co.length<2) return fail('Isi nama perusahaan.','#s-co');
    if(!staf&&!plants.length) return fail('Centang minimal satu PLTU yang Anda pasok.');
    const miss=staf?null:kpMissing($('#s-kp'),plants); if(miss) return fail(kpFail($('#s-kp'),miss));
    const bad=staf?null:kpBad($('#s-kp')); if(bad){ bad.focus(); return fail(`"${bad.value.trim()}" bukan nomor kontrak yang dikenali (contoh: 0680.PJ).`); }
    const pk=staf?{kontrak:null,kontrak_pltu:null}:kpPack($('#s-kp'),plants);
    if(pic.length<2) return fail('Isi nama PIC.','#s-pic');
    if(!/\d{6,}/.test(hp.replace(/\D/g,''))) return fail('Isi nomor HP yang bisa dihubungi.','#s-hp');
    if(user.length<3) return fail('Nama pengguna minimal 3 karakter.','#s-user');
    if(!/[a-z0-9]/i.test(user)||user.includes('@')) return fail('Nama pengguna hanya boleh huruf, angka, spasi, titik, atau tanda hubung.','#s-user');
    if(pw.length<8) return fail('Password minimal 8 karakter.','#s-pass');
    if(pw!==pw2) return fail('Ulangi password belum sama.','#s-pass2');
    busy(btn,true,'Mendaftarkan…');
    const {data:free}=await S.sb.rpc('nama_tersedia',{nama:user});
    if(free===false){ const alt=plants[0]?`${user} ${plants[0]}`:`${user} 2`; userEdited=true; $('#s-user').value=alt;
      $('#s-user-hint').textContent=`"${user}" sudah dipakai, kami sarankan "${alt}". Boleh diubah.`;
      return fail(`Nama pengguna "${user}" sudah dipakai. Sudah pernah daftar? Gunakan tab Masuk. Kalau belum, pakai nama pengguna yang kami sarankan lalu klik Daftar lagi.`,'#s-user'); }
    const {data,error}=await S.sb.auth.signUp({email:toLoginEmail(user),password:pw,options:{data:{username:user,pic,hp}}});
    if(error) return fail(/registered|exists|duplicate/i.test(error.message)?'Nama pengguna sudah dipakai. Ganti nama pengguna lalu coba lagi.':/rate|many/i.test(error.message)?'Terlalu banyak pendaftaran dari jaringan ini. Tunggu beberapa menit lalu coba lagi.':'Pendaftaran gagal: '+error.message);
    if(!data.session) return fail('Akun dibuat tetapi belum aktif. Hubungi manager PLN EPI Kalimantan.');
    busy(btn,true,'Mengirim permintaan…');
    const {error:e2}=await S.sb.from('permintaan').upsert({user_id:data.session.user.id,plant:staf?null:plants[0],plants,partner_name:staf?null:co,...pk,baru:false,staf,pic,hp,status:'menunggu',alasan:null},{onConflict:'user_id'});
    if(e2) console.error(e2);   // akun sudah ada; halaman berikut tetap menampilkan formulir permintaan
    location.hash=''; location.reload(); };
}
let pltuLoaded=false;
async function loadPltu(){ if(pltuLoaded) return; const box=$('#s-plants');
  const {data,error}=await S.sb.rpc('daftar_pltu');
  if(error||!data){ box.innerHTML='<span class="err">Daftar PLTU gagal dimuat. Muat ulang halaman.</span>'; return; }
  pltuLoaded=true; box.innerHTML=pickHtml(data.map(x=>x.name),new Set(),new Set()); kpRender($('#s-kp'),[]); box.onchange=()=>kpRender($('#s-kp'),picked(box)); }

/* ---------- reset password oleh manager ---------- */
async function resetPassword(uid,btn){
  const box=btn.closest('td'); if(box.querySelector('.rp')) return;
  const w=document.createElement('div'); w.className='rp row'; w.style.marginTop='6px';
  w.innerHTML='<input type="text" placeholder="Password baru (min. 8)" maxlength="40" style="width:170px" aria-label="Password baru"><button class="btn sm" type="button">Simpan</button>';
  box.appendChild(w); const inp=w.querySelector('input'); inp.focus();
  w.querySelector('button').onclick=async()=>{ const p=inp.value; if(p.length<8){ toast('Password minimal 8 karakter'); return; }
    const {data,error}=await S.sb.functions.invoke('reset-password',{body:{user_id:uid,password:p}});
    if(error||!data?.ok){ toast(data?.pesan||'Gagal mereset password'); return; }
    toast('Password diganti. Sampaikan ke mitra secara langsung.'); w.remove(); };
}

async function hapusAkun(uid,btn){
  const pr=profOf(uid); const nm=pr.username||pr.nama||'akun ini';
  if(btn.dataset.armed!=='1'){ btn.dataset.armed='1'; const n=[...S.entries.values()].filter(e=>e.uid===uid).length;
    btn.textContent='Yakin hapus akun?'; btn.title=`Akun ${nm} tidak bisa login lagi. ${n} laporan yang sudah diinput tetap tersimpan.`;
    toast(`Klik sekali lagi untuk menghapus akun ${nm}. ${n} laporannya tetap tersimpan.`);
    setTimeout(()=>{ if(btn.isConnected&&btn.dataset.armed==='1'){ btn.dataset.armed=''; btn.textContent='Hapus akun'; } },6000); return; }
  btn.disabled=true; btn.textContent='Menghapus…';
  try{ const {data,error}=await S.sb.functions.invoke('hapus-akun',{body:{user_id:uid}});
    if(error||!data?.ok) throw new Error(data?.pesan||'Gagal menghapus akun');
    S.openMng?.delete(uid); toast(data.pesan); await reload(); }
  catch(e){ toast(errMsg(e)); btn.disabled=false; btn.dataset.armed=''; btn.textContent='Hapus akun'; }
}

/* ---------- boot ---------- */
async function boot(){
  route();
  const C=window.RMK_CONFIG||{};
  if(!window.supabase||!C.SUPABASE_URL||/ISI_/.test(C.SUPABASE_URL+C.SUPABASE_ANON_KEY)){ S.role='guest'; $('#guest-text').textContent='Situs belum dihubungkan ke database. Isi SUPABASE_URL dan SUPABASE_ANON_KEY di file config.js (lihat PANDUAN).'; route(); return; }
  S.sb=supabase.createClient(C.SUPABASE_URL,C.SUPABASE_ANON_KEY);
  fetch('kalimantan.json').then(r=>r.json()).then(g=>{ S.geo=g; if(S.view==='ringkasan') renderMap(); }).catch(()=>{});
  $('#coord-edit').onclick=openCoordForm; $('#tgt-edit').onclick=openTargetForm; $('#ann-form').onsubmit=submitAnn;
  $('#btn-csv').hidden=false; $('#btn-csv').onclick=exportCSV;
  $('#preview-exit').onclick=()=>{ S.preview=null; applyRole(); location.hash='akses'; route(); };
  $('#logout').onclick=async()=>{ await S.sb.auth.signOut(); location.replace(location.pathname); };
  let recovering=false;
  
  const {data:{session}}=await S.sb.auth.getSession();
  if(recovering) return;
  if(!session){ S.role='login'; initLogin(); route(); return; }
  S.uid=session.user.id; S.email=session.user.email||'';
  await reload(); subscribeRealtime();
}
boot();
})();

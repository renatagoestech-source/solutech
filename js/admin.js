(() => {
  const $ = (s, root=document) => root.querySelector(s);
  const DB_KEY = 'solutech_demo_orders_v1';
  const COMPANY_KEY = 'solutech_demo_company_v1';
  const SESSION_KEY = 'solutech_demo_session_v1';
  const STATUSES = ['Aberta','Aguardando diagnóstico','Aguardando aprovação','Aguardando cliente','Em andamento','Aguardando peça','Concluída','Entregue','Cancelada'];
  const INSPECTION_ITEMS = ['Tela / display','Carcaça / tampa','Teclado','Touchpad / mouse integrado','Dobradiças','Portas USB','Conector de energia / carga','Alto-falantes / áudio','Câmera','Conexões / portas adicionais'];
  const REQUIRED_FIELDS = ['customer','customerDocument','phone','address','receivedAt','equipment','model','problem','powersOn','technician','clientSignerName'];
  const OS_TERMS = [
    'O equipamento deve ser retirado em até 10 (dez) dias corridos após a comunicação de que está pronto / após o cliente receber a confirmação. Após esse prazo, poderá ser cobrada taxa de armazenamento de R$ 5,00 por dia.',
    'Decorridos 60 (sessenta) dias da recusa do orçamento ou da comunicação de conclusão, sem retirada e sem solução acordada, o item poderá ser considerado abandonado e destinado a descarte, doação ou aproveitamento de peças, conforme a legislação aplicável e após tentativa de contato.',
    'A retirada do equipamento será feita mediante apresentação desta ordem de serviço/documento e conferência do responsável.',
    'Nenhum reparo ou serviço será executado sem aprovação prévia do cliente. Diagnóstico ou avaliação também depende de autorização quando houver cobrança ou intervenção.',
    'A Solutech não se responsabiliza por perda de dados, arquivos ou programas quando não houver solicitação de backup. O backup depende de viabilidade técnica e autorização específica.',
    'Serviços de limpeza e manutenção preventiva não têm garantia. Peças e mão de obra de reparo têm garantia de 90 (noventa) dias, observadas as condições legais e excluídos danos por mau uso, intervenção de terceiros ou causa diversa.',
    'Se, durante o diagnóstico/reparo, for constatado problema diferente do relatado ou defeito adicional, será apresentado novo orçamento e nenhuma etapa adicional será realizada sem aprovação.'
  ];
  const LEGACY_OS_TERMS_V1 = [
    'O cliente declara que as informações acima correspondem ao equipamento entregue para avaliação.',
    'O diagnóstico e o orçamento devem ser aprovados antes da execução de serviços adicionais.',
    'Recomenda-se manter cópia de segurança dos dados.',
    'A Solutech deve registrar alterações de escopo e combinar previamente prazos, garantia e condições de retirada.'
  ];
  const demoUser = 'admin', demoPassword = 'solutech2026';
  let signatureData = {client:'', technician:''};
  let orders = loadOrders();
  let editingId = null;
  const loginWrap = $('#loginWrap'), dashboard = $('#dashboard');
  const escapeHtml = (value='') => String(value).replace(/[&<>"']/g, ch => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[ch]));
  function loadOrders(){try{return JSON.parse(localStorage.getItem(DB_KEY)||'[]')}catch{return []}}
  function saveOrders(){localStorage.setItem(DB_KEY,JSON.stringify(orders))}
  function loadCompany(){try{return {...defaultCompany,...JSON.parse(localStorage.getItem(COMPANY_KEY)||'{}')}}catch{return {...defaultCompany}}}
  const defaultCompany={company:'Solutech — Assistência Técnica',address:'Rua Joaquim Godoy, 145 — Centro, Serra Talhada - PE',phone:'(87) 99999-0101',email:'contato@solutech.example',cnpj:'00.000.000/0001-00'};
  function toast(message){const el=$('#toast');el.textContent=message;el.hidden=false;setTimeout(()=>el.hidden=true,2800)}
  const localDateTimeValue=()=>{const now=new Date();return new Date(now.getTime()-now.getTimezoneOffset()*60000).toISOString().slice(0,16)};
  const formatDate=value=>{if(!value)return'—';if(!/^\d{4}-\d{2}-\d{2}$/.test(String(value)))return String(value);const date=new Date(`${value}T12:00:00`);return Number.isNaN(date.getTime())?String(value):date.toLocaleDateString('pt-BR')};
  const formatDateTime=value=>{if(!value)return'—';const date=new Date(value);return Number.isNaN(date.getTime())?String(value):date.toLocaleString('pt-BR')};
  const formatMoney=value=>{if(value===''||value===null||value===undefined)return'Não informado';const text=String(value).trim();if(!text)return'Não informado';if(/^\d+(?:[.,]\d{1,2})?$/.test(text)){const amount=Number(text.replace(',','.'));if(Number.isFinite(amount))return amount.toLocaleString('pt-BR',{style:'currency',currency:'BRL'})}return text};
  function renderInspectionFields(){
    $('#osInspectionGrid').innerHTML=INSPECTION_ITEMS.map((item,index)=>`<div class="os-inspection-row"><strong>${escapeHtml(item)}</strong><label>Condição<select data-inspection-state="${index}"><option>Não avaliado</option><option>OK</option><option>Avaria</option><option>Outro</option></select></label><label>Observação<input data-inspection-note="${index}" maxlength="180" placeholder="Detalhe, se necessário"></label></div>`).join('');
    $('#osTermsCopy').innerHTML=`<ol>${OS_TERMS.map(term=>`<li>${escapeHtml(term)}</li>`).join('')}</ol>`;
  }
  function clearSignature(kind){
    const canvas=$(`#${kind==='client'?'client':'technician'}SignatureCanvas`);if(!canvas)return;
    canvas.getContext('2d').clearRect(0,0,canvas.width,canvas.height);signatureData[kind]='';
  }
  function paintSignature(kind,data){
    clearSignature(kind);if(!/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(String(data||'')))return;
    signatureData[kind]=data;const canvas=$(`#${kind==='client'?'client':'technician'}SignatureCanvas`);const image=new Image();
    image.onload=()=>canvas.getContext('2d').drawImage(image,0,0,canvas.width,canvas.height);image.src=data;
  }
  function setupSignaturePads(){
    for(const kind of ['client','technician']){
      const canvas=$(`#${kind==='client'?'client':'technician'}SignatureCanvas`),context=canvas.getContext('2d');let drawing=false;
      const point=event=>{const rect=canvas.getBoundingClientRect();return{x:(event.clientX-rect.left)*canvas.width/rect.width,y:(event.clientY-rect.top)*canvas.height/rect.height}};
      canvas.addEventListener('pointerdown',event=>{event.preventDefault();drawing=true;canvas.setPointerCapture(event.pointerId);const p=point(event);context.beginPath();context.arc(p.x,p.y,1.5,0,Math.PI*2);context.fillStyle='#09243f';context.fill();context.beginPath();context.moveTo(p.x,p.y)});
      canvas.addEventListener('pointermove',event=>{if(!drawing)return;const p=point(event);context.lineWidth=3;context.lineCap='round';context.lineJoin='round';context.strokeStyle='#09243f';context.lineTo(p.x,p.y);context.stroke();context.beginPath();context.moveTo(p.x,p.y)});
      const finish=()=>{if(!drawing)return;drawing=false;signatureData[kind]=canvas.toDataURL('image/png')};
      canvas.addEventListener('pointerup',finish);canvas.addEventListener('pointercancel',finish);
      $(`[data-clear-signature="${kind}"]`).addEventListener('click',()=>clearSignature(kind));
    }
  }
  function resetOrderForm(){
    const form=$('#osForm');for(const name of REQUIRED_FIELDS)form.elements[name].required=true;form.reset();editingId=null;form.elements.id.value='';
    form.elements.receivedAt.value=localDateTimeValue();form.elements.status.value='Aberta';form.elements.priority.value='Normal';
    const terms=form.elements.termsAccepted;terms.disabled=false;terms.required=true;terms.checked=false;
    $('#osTermsEditNote').hidden=true;$('#osTermsEditNote').textContent='';
    $('#saveOsBtn').innerHTML='Salvar ordem de serviço <span>✓</span>';
    for(const kind of ['client','technician'])clearSignature(kind);
    form.elements.clientSignerName.dataset.touched='';
  }
  function collectInspection(){return INSPECTION_ITEMS.map((item,index)=>({item,state:$(`[data-inspection-state="${index}"]`).value,notes:$(`[data-inspection-note="${index}"]`).value.trim()}))}
  function applyInspection(entries){
    for(const [index,item] of INSPECTION_ITEMS.entries()){
      const entry=Array.isArray(entries)?entries.find(row=>row.item===item):null;
      $(`[data-inspection-state="${index}"]`).value=entry?.state||'Não avaliado';
      $(`[data-inspection-note="${index}"]`).value=entry?.notes||'';
    }
  }
  function showDashboard(){loginWrap.style.display='none';dashboard.classList.add('visible');render();populateCompany();$('#todayLabel').textContent=new Intl.DateTimeFormat('pt-BR',{dateStyle:'full'}).format(new Date())+' · Visão geral dos atendimentos.'}
  function showLogin(){loginWrap.style.display='block';dashboard.classList.remove('visible')}
  $('#loginForm').addEventListener('submit',e=>{e.preventDefault();const d=new FormData(e.currentTarget);if(d.get('username')===demoUser&&d.get('password')===demoPassword){sessionStorage.setItem(SESSION_KEY,'1');$('#loginError').textContent='';showDashboard()}else{$('#loginError').textContent='Usuário ou senha incorretos. Tente novamente.'}});
  $('#logoutBtn').addEventListener('click',()=>{sessionStorage.removeItem(SESSION_KEY);showLogin();$('#loginForm').reset()});
  $('#osForm').addEventListener('submit',e=>{
    e.preventDefault();const form=e.currentTarget;const raw=Object.fromEntries(new FormData(form).entries());
    const requiredNow=editingId?['customer','equipment','problem']:REQUIRED_FIELDS;if(requiredNow.some(name=>!String(raw[name]||'').trim())){toast('Preencha os dados obrigatórios da OS.');return}
    if(!editingId&&!form.elements.termsAccepted.checked){toast('O aceite dos termos é obrigatório para novas OS.');return}
    const now=new Date().toISOString(),old=editingId?orders.find(order=>order.id===editingId):null;
    const data={...raw,title:`${raw.equipment} — ${raw.problem.slice(0,75)}`,backupRequested:form.elements.backupRequested.checked,serviceApproved:form.elements.serviceApproved.checked,inspection:collectInspection(),clientSignature:signatureData.client,technicianSignature:signatureData.technician,termsAccepted:old?!!old.termsAccepted:form.elements.termsAccepted.checked,termsAcceptedAt:old?(old.termsAcceptedAt||''):(form.elements.termsAccepted.checked?now:''),termsVersion:old?(old.termsVersion||''):(form.elements.termsAccepted.checked?'solutech-os-v2':''),termsText:old?(old.termsText||''):(form.elements.termsAccepted.checked?OS_TERMS.join('\n'):'')};
    if(editingId&&old){orders=orders.map(order=>order.id===editingId?{...old,...data,id:old.id,number:old.number,createdAt:old.createdAt,updatedAt:now}:order);toast(`OS #${old.number} atualizada!`)}
    else{const nextNo=orders.reduce((max,order)=>Math.max(max,Number(order.number)||0),1000)+1;orders.unshift({...data,id:crypto.randomUUID?crypto.randomUUID():String(Date.now()),number:nextNo,createdAt:now,updatedAt:now});toast('OS cadastrada com sucesso!')}
    saveOrders();render();resetOrderForm();
  });
  $('#clearFormBtn').addEventListener('click',resetOrderForm);
  $('#searchOs').addEventListener('input',render);
  $('#osStatusFilter').addEventListener('change',render);
  $('#osForm').elements.customer.addEventListener('input',event=>{const signer=$('#osForm').elements.clientSignerName;if(!signer.dataset.touched)signer.value=event.currentTarget.value});
  $('#osForm').elements.clientSignerName.addEventListener('input',event=>{event.currentTarget.dataset.touched='1'});
  $('#companyForm').addEventListener('submit',e=>{e.preventDefault();const data=Object.fromEntries(new FormData(e.currentTarget).entries());localStorage.setItem(COMPANY_KEY,JSON.stringify(data));toast('Dados da empresa salvos para impressão.')});
  function populateCompany(){const data=loadCompany();const f=$('#companyForm');Object.entries(data).forEach(([key,value])=>{if(f.elements[key])f.elements[key].value=value})}
  function statusClass(status){if(['Concluída','Entregue'].includes(status))return'done';if(['Em andamento','Aguardando peça'].includes(status))return'progress';if(status==='Cancelada')return'cancelled';return''}
  function render(){
    orders=loadOrders();$('#statTotal').textContent=orders.length;$('#statProgress').textContent=orders.filter(o=>['Em andamento','Aguardando peça'].includes(o.status)).length;$('#statWaiting').textContent=orders.filter(o=>['Aberta','Aguardando diagnóstico','Aguardando aprovação','Aguardando cliente'].includes(o.status)).length;$('#statDone').textContent=orders.filter(o=>['Concluída','Entregue'].includes(o.status)).length;
    const q=($('#searchOs').value||'').trim().toLocaleLowerCase('pt-BR'),status=$('#osStatusFilter').value;
    const searchable=order=>[order.number,order.customer,order.customerDocument,order.phone,order.address,order.equipment,order.model,order.serial,order.problem,order.diagnosis,order.service,order.technician,order.status].some(value=>String(value||'').toLocaleLowerCase('pt-BR').includes(q));
    const filtered=orders.filter(order=>(!q||searchable(order))&&(!status||order.status===status));
    $('#osCountLabel').textContent=`${filtered.length} DE ${orders.length} OS`;
    $('#emptyState').style.display=filtered.length?'none':'block';
    $('#osTableBody').innerHTML=filtered.map(order=>{const current=order.status||'Aguardando diagnóstico';const options=[...new Set([current,...STATUSES])].map(value=>`<option${value===current?' selected':''}>${escapeHtml(value)}</option>`).join('');return`<tr><td><strong>#OS-${escapeHtml(order.number)}</strong><span class="table-muted">${escapeHtml(order.customer)}</span><span class="table-muted">${escapeHtml(order.customerDocument||'Documento não informado')}</span></td><td>${escapeHtml(order.equipment)}<span class="table-muted">${escapeHtml(order.model||'Modelo não informado')}${order.serial?' · '+escapeHtml(order.serial):''}</span></td><td><select class="os-status-select ${statusClass(current)}" data-status-id="${escapeHtml(order.id)}" aria-label="Alterar status da OS ${escapeHtml(order.number)}">${options}</select></td><td><div class="table-actions"><button class="mini-btn" data-action="print" data-id="${escapeHtml(order.id)}">Ver / imprimir</button><button class="mini-btn" data-action="whatsapp" data-id="${escapeHtml(order.id)}">WhatsApp</button><button class="mini-btn" data-action="edit" data-id="${escapeHtml(order.id)}">Editar</button><button class="mini-btn danger" data-action="delete" data-id="${escapeHtml(order.id)}">Excluir</button></div></td></tr>`}).join('');
  }
  $('#osTableBody').addEventListener('change',event=>{const select=event.target.closest('select[data-status-id]');if(!select)return;const now=new Date().toISOString();orders=orders.map(order=>order.id===select.dataset.statusId?{...order,status:select.value,updatedAt:now}:order);saveOrders();render();toast('Status da OS atualizado.')});
  $('#osTableBody').addEventListener('click',event=>{const btn=event.target.closest('button[data-action]');if(!btn)return;const order=orders.find(item=>item.id===btn.dataset.id);if(!order)return;if(btn.dataset.action==='edit')editOrder(order);if(btn.dataset.action==='delete'&&confirm(`Excluir a OS #OS-${order.number} de ${order.customer}?`)){orders=orders.filter(item=>item.id!==order.id);saveOrders();render();toast('OS excluída.')}if(btn.dataset.action==='print')printOrder(order);if(btn.dataset.action==='whatsapp')sendWhatsApp(order)});
  function editOrder(order){
    resetOrderForm();const form=$('#osForm');editingId=order.id;
    for(const [key,value] of Object.entries(order)){const field=form.elements[key];if(!field)continue;if(field.type==='checkbox')field.checked=value===true;else if(field.type!=='hidden')field.value=value??''}
    form.elements.id.value=order.id;for(const name of REQUIRED_FIELDS)form.elements[name].required=!!String(order[name]||'').trim();form.elements.status.value=order.status||'Aguardando diagnóstico';form.elements.priority.value=order.priority||'Normal';
    form.elements.termsAccepted.checked=!!order.termsAccepted;form.elements.termsAccepted.disabled=true;form.elements.termsAccepted.required=false;
    $('#osTermsEditNote').hidden=false;$('#osTermsEditNote').textContent=order.termsAccepted?'O aceite original e seu registro foram preservados; esta edição não altera o aceite.':'OS antiga sem registro de aceite; editar não registra aceite retroativo.';
    form.elements.clientSignerName.dataset.touched='1';applyInspection(order.inspection);paintSignature('client',order.clientSignature);paintSignature('technician',order.technicianSignature);
    $('#saveOsBtn').innerHTML='Salvar alterações <span>✓</span>';form.scrollIntoView({behavior:'smooth',block:'start'});toast(`Editando OS #${order.number}`)
  }
  function sendWhatsApp(order){
    const digits=String(order.phone||'').replace(/\D/g,'');if(digits.length<10||digits.length>13){toast('Informe um telefone válido na OS para usar o WhatsApp.');return}
    const phone=digits.length<=11?`55${digits}`:digits;const message=`Olá, ${order.customer}. Atualização da sua ordem de serviço #OS-${order.number}: status ${order.status||'Aguardando diagnóstico'}${order.equipment?` (${order.equipment}${order.model?` — ${order.model}`:''})`:''}. Solutech.`;
    const opened=window.open(`https://wa.me/${phone}?text=${encodeURIComponent(message)}`,'_blank');if(opened)opened.opener=null;else toast('Permita pop-ups para abrir o WhatsApp.')
  }
  $('#exportBtn').addEventListener('click',()=>{const safeOrders=orders.map(order=>({...order,deviceAccess:order.deviceAccess?'[REMOVIDO DA EXPORTAÇÃO — informação restrita]':''}));const blob=new Blob([JSON.stringify(safeOrders,null,2)],{type:'application/json'});const url=URL.createObjectURL(blob);const a=document.createElement('a');a.href=url;a.download='solutech-ordens-de-servico.json';a.click();URL.revokeObjectURL(url);toast('Arquivo de OS exportado; credenciais foram removidas.')});
  function printOrder(o){
    const company=loadCompany(),safe=escapeHtml;
    const inspectionRows=INSPECTION_ITEMS.map(item=>{const entry=Array.isArray(o.inspection)?o.inspection.find(row=>row.item===item):null;return`<tr><td>${safe(item)}</td><td>${safe(entry?.state||'Não avaliado')}</td><td>${safe(entry?.notes||'—')}</td></tr>`}).join('');
    const signature=(data,label,name)=>{const valid=/^data:image\/png;base64,[A-Za-z0-9+/=]+$/.test(String(data||''));return`<div class="signature-card">${valid?`<img class="signature-image" src="${safe(data)}" alt="Assinatura de ${safe(label)}">`:'<div class="signature-blank"></div>'}<div class="signature-rule"></div><strong>${safe(name||label)}</strong><small>${safe(label)}</small></div>`};
    const hasTermsSnapshot=typeof o.termsText==='string'&&!!o.termsText.trim();
    const termsForPrint=hasTermsSnapshot?o.termsText.split(/\n+/).filter(Boolean):(o.termsVersion==='solutech-os-v1'?LEGACY_OS_TERMS_V1:['Texto dos termos não preservado nesta OS.']);
    const termsAvailable=hasTermsSnapshot||o.termsVersion==='solutech-os-v1';
    const termsStatus=o.termsAccepted?`Aceito${o.termsAcceptedAt?` em ${safe(formatDateTime(o.termsAcceptedAt))}`:''}${o.termsVersion?` · versão ${safe(o.termsVersion)}`:''}${termsAvailable?'':' · texto dos termos não preservado'}`:'Não registrado nesta OS';
    const printedTerms=termsForPrint.map(term=>`<li>${safe(term)}</li>`).join('');
    const safeAccess=o.deviceAccess?'Informação registrada (restrita; não reproduzida neste documento)':'Não informado';
    const printWindow=window.open('','_blank','width=1000,height=800');if(!printWindow){toast('Permita pop-ups para imprimir a OS.');return}
    printWindow.document.write(`<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>OS-${safe(o.number)} | Solutech</title><style>
      *{box-sizing:border-box}body{font:11px Arial,sans-serif;color:#17202b;margin:0;padding:22px;background:#eef3f6}.sheet{max-width:900px;margin:auto;background:#fff;border:1px solid #ccd7df;padding:26px}.head{display:flex;justify-content:space-between;align-items:flex-start;gap:18px;border-bottom:3px solid #04b8df;padding-bottom:15px}.brand{font-size:25px;font-weight:800;color:#09243f}.brand span{color:#00a9d9}.brand-sub{font-size:9px;letter-spacing:2px}.company{font-size:9px;line-height:1.55;text-align:right}.os-title{display:flex;justify-content:space-between;align-items:center;gap:12px;margin:18px 0}.os-title h1{font-size:18px;margin:0}.document-guidance{font-size:10px;color:#425466;margin:-8px 0 12px}.signature-consent{padding:8px 10px;background:#f3f7fa;border-left:3px solid #04b8df;font-size:9px;line-height:1.5;margin:8px 10px}.number{background:#09243f;color:#fff;padding:8px 12px;font-weight:bold}.meta{display:flex;flex-wrap:wrap;gap:6px;margin:-8px 0 12px}.meta span{border:1px solid #d7e0e8;padding:4px 7px;border-radius:3px}.section{border:1px solid #d7e0e8;margin:10px 0;break-inside:avoid}.section h2{font-size:10px;text-transform:uppercase;letter-spacing:.08em;background:#edf5f9;padding:8px 10px;margin:0;border-bottom:1px solid #d7e0e8}.fields{display:grid;grid-template-columns:1fr 1fr;gap:0}.field{padding:8px 10px;border-bottom:1px solid #e2e8ef;min-height:38px;white-space:pre-wrap;overflow-wrap:anywhere}.field:nth-child(odd){border-right:1px solid #e2e8ef}.field b{display:block;color:#5a6b7c;font-size:8px;text-transform:uppercase;margin-bottom:4px}.full{grid-column:1/-1;border-right:0!important}.terms{font-size:8px;line-height:1.55;color:#4d5b69;padding:9px 12px}.terms ol{padding-left:17px;margin:4px 0}.inspection-table{width:100%;border-collapse:collapse;font-size:8px}.inspection-table th,.inspection-table td{border:1px solid #dbe3e9;padding:5px 7px;text-align:left}.inspection-table th{background:#f3f7fa;text-transform:uppercase;font-size:7px}.signatures{display:grid;grid-template-columns:1fr 1fr;gap:32px;margin:18px 12px 10px}.signature-card{text-align:center;display:flex;flex-direction:column;align-items:center;min-height:90px}.signature-image{height:54px;width:100%;object-fit:contain}.signature-blank{height:54px}.signature-rule{width:90%;border-top:1px solid #657687;margin:3px auto 5px}.signature-card strong{font-size:9px}.signature-card small{font-size:8px;color:#657687}.foot{margin-top:12px;border-top:1px solid #d7e0e8;padding-top:8px;color:#718092;font-size:8px;display:flex;justify-content:space-between;gap:10px}.no-print{display:flex;justify-content:flex-end;gap:8px;margin:0 auto 10px;max-width:900px}.no-print button{border:0;border-radius:4px;background:#09243f;color:#fff;padding:9px 13px;cursor:pointer}@media print{body{padding:0;background:#fff}.sheet{max-width:none;border:0;padding:0}.no-print{display:none}@page{size:A4;margin:12mm}}@media(max-width:600px){.head{flex-direction:column}.company{text-align:left}.fields{grid-template-columns:1fr}.field:nth-child(odd){border-right:0}.full{grid-column:auto}.signatures{gap:14px}}
      </style></head><body><div class="no-print"><button onclick="window.print()">Imprimir / salvar PDF</button><button onclick="window.close()">Fechar</button></div><main class="sheet"><header class="head"><div><div class="brand">SOLU<span>TECH</span></div><div class="brand-sub">ASSISTÊNCIA TÉCNICA</div></div><div class="company"><b>${safe(company.company)}</b><br>${safe(company.address)}<br>Telefone: ${safe(company.phone)}<br>E-mail: ${safe(company.email)}<br>CNPJ: ${safe(company.cnpj)}</div></header>
      <div class="os-title"><h1>ORDEM DE SERVIÇO</h1><div class="number">OS Nº ${safe(o.number)}</div></div><p class="document-guidance">Apresente este documento para a retirada do equipamento.</p><div class="meta"><span>Status: ${safe(o.status||'Aguardando diagnóstico')}</span><span>Prioridade: ${safe(o.priority||'Normal')}</span><span>Abertura: ${safe(formatDateTime(o.createdAt))}</span><span>Atualizada: ${safe(formatDateTime(o.updatedAt||o.createdAt))}</span></div>
      <section class="section"><h2>01 · Cliente e recebimento</h2><div class="fields"><div class="field"><b>Cliente / razão social</b>${safe(o.customer||'—')}</div><div class="field"><b>CPF / CNPJ</b>${safe(o.customerDocument||'Não informado')}</div><div class="field"><b>Telefone / WhatsApp</b>${safe(o.phone||'Não informado')}</div><div class="field"><b>Endereço</b>${safe(o.address||'Não informado')}</div><div class="field"><b>Data e hora de recebimento</b>${safe(formatDateTime(o.receivedAt))}</div><div class="field"><b>Prazo informado ao cliente</b>${safe(formatDate(o.deadline))}</div></div></section>
      <section class="section"><h2>02 · Equipamento e relato</h2><div class="fields"><div class="field"><b>Tipo</b>${safe(o.equipment||'—')}</div><div class="field"><b>Fabricante / modelo</b>${safe(o.model||'Não informado')}</div><div class="field"><b>Nº de série / IMEI</b>${safe(o.serial||'Não informado')}</div><div class="field"><b>Cor / identificação</b>${safe(o.color||'Não informado')}</div><div class="field"><b>Equipamento liga?</b>${safe(o.powersOn||'Não informado')}</div><div class="field"><b>Senha / PIN</b>${safe(safeAccess)}</div><div class="field full"><b>Problema relatado</b>${safe(o.problem||'—')}</div><div class="field"><b>Acessórios recebidos</b>${safe(o.accessories||'Não informado')}</div><div class="field"><b>Condição dos acessórios</b>${safe(o.accessoriesNotes||'Não informado')}</div><div class="field full"><b>Observações complementares</b>${safe(o.notes||'Não informado')}</div></div></section>
      <section class="section"><h2>03 · Inspeção física</h2><table class="inspection-table"><thead><tr><th>Item</th><th>Condição</th><th>Observação</th></tr></thead><tbody>${inspectionRows}</tbody></table><div class="field full"><b>Observações gerais da inspeção</b>${safe(o.inspectionNotes||'Não informado')}</div></section>
      <section class="section"><h2>04 · Diagnóstico, orçamento e autorização</h2><div class="fields"><div class="field"><b>Diagnóstico técnico</b>${safe(o.diagnosis||'A realizar')}</div><div class="field"><b>Serviço executado</b>${safe(o.service||'A definir')}</div><div class="field"><b>Orçamento / valor informado</b>${safe(formatMoney(o.price))}</div><div class="field"><b>Prazo de execução informado</b>${safe(formatDate(o.repairDeadline))}</div><div class="field"><b>Técnico responsável</b>${safe(o.technician||'Não informado')}</div><div class="field"><b>Backup solicitado</b>${o.backupRequested?'Sim — solicitação registrada':'Não'}</div><div class="field"><b>Serviço aprovado</b>${o.serviceApproved?'Sim':'Não — aguardar aprovação'}</div><div class="field"><b>Referência da aprovação</b>${safe(o.approvalReference||'Não informado')}</div><div class="field full"><b>Autorização / instruções</b>${safe(o.authorizationNotes||'Não informado')}</div></div></section>
      <section class="section"><h2>05 · Termos do atendimento</h2><div class="terms"><ol>${printedTerms}</ol><b>Aceite do cliente:</b> ${termsStatus}</div></section>
      <section class="section"><h2>06 · Responsáveis e assinaturas</h2><p class="signature-consent">As assinaturas registram a entrega, as condições observadas e a ciência/autorizações descritas nesta ficha. A assinatura não substitui a aprovação específica de orçamento para reparos.</p><div class="signatures">${signature(o.clientSignature,'Assinatura do cliente',o.clientSignerName||o.customer)}${signature(o.technicianSignature,'Assinatura do técnico',o.technician||'Técnico responsável')}</div></section>
      <footer class="foot"><span>Solutech · Documento gerado pelo painel demonstrativo.</span><span>OS ${safe(o.number)} · ${safe(formatDateTime(o.createdAt))}</span></footer></main></body></html>`);
    printWindow.document.close();
  }

  renderInspectionFields();setupSignaturePads();resetOrderForm();
  if(sessionStorage.getItem(SESSION_KEY)==='1')showDashboard();else showLogin();
})();

import 'dotenv/config';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import type { AddressInfo } from 'node:net';
import type { Server } from 'node:http';
import { markRegressionLabReady } from './orchestrator-test-helpers.js';

interface ApiResult { response: Response; payload: Record<string, any>; }

async function main(): Promise<void> {
  if (!process.env.DATABASE_URL?.trim()) throw new Error('DATABASE_URL is required for the lab HTTP regression suite');
  const suffix = randomUUID().replaceAll('-', '').slice(0, 12);
  process.env.NODE_ENV = 'test';
  process.env.JWT_SECRET = `${randomUUID()}${randomUUID()}`;

  const adminEmail = `lab-admin-${suffix}@example.invalid`;
  const editorEmail = `lab-editor-${suffix}@example.invalid`;
  const password = `Lab-${randomUUID()}!`;

  const [
    { default: express }, { default: cookieParser }, { default: bcrypt }, { default: authRoutes }, { default: labRoutes },
    { errorHandler }, { prisma },
  ] = await Promise.all([
    import('express'), import('cookie-parser'), import('bcryptjs'), import('../routes/auth.routes.js'), import('../routes/labs.routes.js'),
    import('../middlewares/error.middleware.js'), import('../lib/prisma.js'),
  ]);

  const passwordHash = await bcrypt.hash(password, 12);
  const userIds: string[] = [];
  let labId: string | undefined;
  let server: Server | null = null;
  try {
    const [admin, editor] = await Promise.all([
      prisma.user.create({ data: { email: adminEmail, displayName: 'Lab HTTP Admin', passwordHash, role: 'ADMIN', isActive: true } }),
      prisma.user.create({ data: { email: editorEmail, displayName: 'Lab HTTP Editor', passwordHash, role: 'EDITOR', isActive: true } }),
    ]);
    userIds.push(admin.id, editor.id);
    const project = await prisma.project.findUnique({ where: { slug: 'cisco-enterprise-wan-bgp-hsrp' } });
    assert.ok(project);

    const app = express(); app.use(express.json({ limit: '1mb' })); app.use(cookieParser());
    app.use('/api/auth', authRoutes); app.use('/api/labs', labRoutes); app.use('/api', errorHandler);
    server = await new Promise<Server>((resolve, reject) => { const listener=app.listen(0,'127.0.0.1',()=>resolve(listener)); listener.once('error',reject); });
    const baseUrl = `http://127.0.0.1:${(server.address() as AddressInfo).port}`;
    async function request(path: string, init?: RequestInit): Promise<ApiResult> { const response=await fetch(`${baseUrl}${path}`,init); return { response, payload: await response.json() as Record<string,any> }; }
    async function expect(path:string,status:number,init?:RequestInit){ const result=await request(path,init); assert.equal(result.response.status,status,`${init?.method??'GET'} ${path}`); return result; }
    const cookie = (result:ApiResult) => { const raw=result.response.headers.get('set-cookie'); assert.ok(raw); return raw.split(';',1)[0]; };
    const login = async (email:string) => cookie(await expect('/api/auth/login',200,{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({email,password})}));
    const adminCookie=await login(adminEmail); const editorCookie=await login(editorEmail);
    const adminHeaders={Cookie:adminCookie,'Content-Type':'application/json'}; const editorHeaders={Cookie:editorCookie,'Content-Type':'application/json'};

    const registry=await expect('/api/labs/registry/NETWORKING',200); assert.ok(registry.payload.data.some((entry:{type:string})=>entry.type==='NETWORK_TOPOLOGY'));
    await expect('/api/labs',401,{method:'POST',headers:{'Content-Type':'application/json'},body:'{}'});
    await expect('/api/labs',403,{method:'POST',headers:editorHeaders,body:'{}'});
    await expect('/api/labs',400,{method:'POST',headers:adminHeaders,body:JSON.stringify({slug:`bad-${suffix}`,title:'Bad',domain:'LINUX',kind:'LINUX_SYSTEM',projectId:project.id})});

    const created=await expect('/api/labs',201,{method:'POST',headers:adminHeaders,body:JSON.stringify({
      slug:`http-lab-${suffix}`,title:'HTTP Lab',summary:'HTTP fixture',domain:'NETWORKING',kind:'NETWORK_TOPOLOGY',projectId:project.id,
      status:'DRAFT',capabilities:['topology'],normalizedState:{baseline:true},
    })});
    labId=created.payload.data.id;
    const publicBefore=await expect('/api/labs',200); assert.equal(publicBefore.payload.data.some((lab:{id:string})=>lab.id===labId),false);

    await expect(`/api/labs/${labId}/inputs`,201,{method:'POST',headers:adminHeaders,body:JSON.stringify({inputKey:'topology',inputType:'NETWORK_TOPOLOGY',label:'Topology',sourceKind:'INLINE',payload:{nodes:2},isPrimary:true})});
    await expect(`/api/labs/${labId}/topology`,200,{method:'PUT',headers:adminHeaders,body:JSON.stringify({nodes:[{nodeKey:'r1',label:'R1',kind:'router'},{nodeKey:'r2',label:'R2',kind:'router'}],links:[{linkKey:'r1-r2',sourceNodeKey:'r1',targetNodeKey:'r2'}]})});
    await expect(`/api/labs/${labId}/scenarios`,201,{method:'POST',headers:adminHeaders,body:JSON.stringify({slug:`failover-${suffix}`,title:'Failover',summary:'Failure fixture'})});
    await expect(`/api/labs/${labId}/runbook`,201,{method:'POST',headers:adminHeaders,body:JSON.stringify({order:1,title:'Inspect'})});
    await expect(`/api/labs/${labId}/evidence`,201,{method:'POST',headers:adminHeaders,body:JSON.stringify({kind:'TOPOLOGY',title:'Topology evidence',content:{verified:true},isPublic:true})});

    const aggregate=await expect(`/api/labs/admin/${labId}`,200,{headers:{Cookie:adminCookie}}); assert.equal(aggregate.payload.data.inputs.length,1); assert.equal(aggregate.payload.data.nodes.length,2);
    const preview=await expect(`/api/labs/admin/${labId}/manifest`,200,{headers:{Cookie:adminCookie}}); assert.equal(preview.payload.data.lab.status,'DRAFT');
    await expect(`/api/labs/${labId}/manifest`,404);

    await expect(`/api/labs/${labId}`,400,{method:'PUT',headers:adminHeaders,body:JSON.stringify({status:'READY'})});
    await markRegressionLabReady(labId);
    const publicLab=await expect(`/api/labs/${created.payload.data.slug}`,200); assert.equal(publicLab.payload.data.status,'READY');
    const manifest=await expect(`/api/labs/${created.payload.data.slug}/manifest`,200); assert.equal(manifest.payload.data.inputs.length,1); assert.equal(manifest.payload.data.topology.nodes.length,2);

    console.log('Lab platform HTTP regression: PASS');
  } finally {
    if (server) await new Promise<void>((resolve)=>server!.close(()=>resolve()));
    if (labId) await prisma.lab.deleteMany({where:{id:labId}});
    if (userIds.length) await prisma.user.deleteMany({where:{id:{in:userIds}}});
    await prisma.$disconnect();
  }
}

main().catch((error)=>{ console.error(`Lab platform HTTP regression: FAIL (${error instanceof Error ? error.stack ?? error.message : String(error)})`); process.exitCode=1; });

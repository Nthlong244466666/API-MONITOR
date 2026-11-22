// Add-only schema patch. Backup first. Idempotent and refuses ambiguous markers.
import {readFileSync,writeFileSync,copyFileSync} from 'node:fs';
import {join} from 'node:path';
const path=join(process.cwd(),'prisma','schema.prisma');
let schema=readFileSync(path,'utf8');
if(schema.includes('model IncidentAnalysis {')){console.log('Schema already contains IncidentAnalysis.');process.exit(0);}
function addRelation(model,relation){
 const re=new RegExp(`(model ${model} \\{)`);
 if(!re.test(schema))throw new Error(`Missing model ${model}`);
 schema=schema.replace(re,`$1\n  ${relation}`);
}
copyFileSync(path,`${path}.before-ai-v3.bak`);
addRelation('Incident','analyses IncidentAnalysis[]');
schema+=`\n// AI v3.0: saved diagnostic metadata only, never raw request secrets.\nmodel IncidentAnalysis {\n  id         String   @id @default(uuid()) @db.Uuid\n  incidentId String   @map("incident_id") @db.Uuid\n  model      String   @db.VarChar(100)\n  diagnosis  Json\n  createdAt  DateTime @default(now()) @map("created_at") @db.Timestamptz(3)\n\n  incident Incident @relation(fields:[incidentId],references:[id],onDelete:Cascade)\n  @@index([incidentId,createdAt])\n  @@map("incident_analyses")\n}\n`;
writeFileSync(path,schema);
console.log('Schema updated; backup:',`${path}.before-ai-v3.bak`);

const prisma=require('../config/db'); const {ok,fail}=require('../utils/api'); const v=require('../utils/validate'); const {recordHistory}=require('../services/history');
const models={
  emergency:{model:'emergencyContact',validator:v.emergencyContact,label:'Emergency Contact'}, bp:{model:'bloodPressureRecord',validator:v.bp,label:'Blood Pressure'}, glucose:{model:'glucoseRecord',validator:v.glucose,label:'Blood Glucose'}, period:{model:'periodRecord',validator:v.period,label:'Period'}, appointment:{model:'appointment',validator:v.appointment,label:'Appointment'}, reminder:{model:'reminder',validator:v.reminder,label:'Reminder'}, medicine:{model:'medicine',validator:v.medicine,label:'Medicine'}, mood:{model:'moodRecord',validator:v.mood,label:'Mood'}, water:{model:'waterIntake',validator:v.water,label:'Water Intake'}, fitness:{model:'fitnessRecord',validator:v.fitness,label:'Fitness'}
};
function idParam(req){return req.params.id;}
function historyTitle(type,item){
  const cfg=models[type];
  if(type==='bp') return `Blood pressure recorded: ${item.systolic}/${item.diastolic} mmHg`;
  if(type==='glucose') return `Blood glucose recorded: ${item.value} (${item.readingType})`;
  if(type==='period') return 'Period record saved';
  if(type==='mood') return `Mood recorded: ${item.mood}`;
  if(type==='water') return `Water intake recorded: ${item.amount}`;
  if(type==='fitness') return `Fitness activity recorded: ${item.activity}`;
  if(type==='medicine') return `Medicine saved: ${item.name}`;
  if(type==='appointment') return `Appointment saved: ${item.doctor}`;
  if(type==='reminder') return `Reminder saved: ${item.title}`;
  if(type==='emergency') return `Emergency contact saved: ${item.name}`;
  return `${cfg.label} saved`;
}
function actionDetails(type,item){
  if(type==='bp') return `Systolic ${item.systolic}, diastolic ${item.diastolic}${item.pulse!=null?`, pulse ${item.pulse}`:''}`;
  if(type==='glucose') return `Reading ${item.value}, type ${item.readingType}`;
  if(type==='period') return `Start date ${new Date(item.periodStart).toLocaleDateString()}`;
  if(type==='mood') return item.mood;
  if(type==='water') return `${item.amount} ml`;
  if(type==='fitness') return `${item.activity}${item.duration?` for ${item.duration} minutes`:''}`;
  if(type==='medicine') return item.dosage || item.frequency || null;
  if(type==='appointment') return `${item.doctor}${item.date?` on ${new Date(item.date).toLocaleDateString()}`:''}`;
  if(type==='reminder') return item.description || item.reminderTime || null;
  if(type==='emergency') return item.phone || null;
  return null;
}
function createHandler(type){return async(req,res)=>{const cfg=models[type];const p=cfg.validator.parse(req.body);const data={...p,userId:req.userId};const item=await prisma[cfg.model].create({data});await recordHistory({userId:req.userId,action:'CREATE',module:cfg.label,title:historyTitle(type,item),details:actionDetails(type,item),entityId:item.id});return ok(res,item,201)}}
function listHandler(type){return async(req,res)=>{const cfg=models[type];let orderBy;if(type==='period')orderBy={periodStart:'desc'};else if(type==='reminder'||type==='appointment'||type==='emergency'||type==='medicine')orderBy={createdAt:'desc'};else orderBy={recordedAt:'desc'};const item=await prisma[cfg.model].findMany({where:{userId:req.userId},orderBy});return ok(res,item)}}
function updateHandler(type){return async(req,res)=>{const cfg=models[type];const p=cfg.validator.partial().parse(req.body);const exists=await prisma[cfg.model].findFirst({where:{id:idParam(req),userId:req.userId}});if(!exists)return fail(res,404,'Record not found.');const item=await prisma[cfg.model].update({where:{id:idParam(req)},data:p});await recordHistory({userId:req.userId,action:'UPDATE',module:cfg.label,title:`${cfg.label} updated`,details:historyTitle(type,item),entityId:item.id});return ok(res,item)}}
function deleteHandler(type){return async(req,res)=>{const cfg=models[type];const exists=await prisma[cfg.model].findFirst({where:{id:idParam(req),userId:req.userId}});if(!exists)return fail(res,404,'Record not found.');await prisma[cfg.model].delete({where:{id:idParam(req)}});await recordHistory({userId:req.userId,action:'DELETE',module:cfg.label,title:`${cfg.label} deleted`,details:historyTitle(type,exists),entityId:exists.id});return ok(res,{deleted:true})}}
module.exports={createHandler,listHandler,updateHandler,deleteHandler};

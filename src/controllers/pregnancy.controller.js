const prisma=require('../config/db'); const {ok}=require('../utils/api'); const v=require('../utils/validate'); const {recordHistory}=require('../services/history');
async function get(req,res){return ok(res,await prisma.pregnancyRecord.findUnique({where:{userId:req.userId}}));}
async function save(req,res){const p=v.pregnancy.parse(req.body);const data={...p,userId:req.userId};const item=await prisma.pregnancyRecord.upsert({where:{userId:req.userId},create:data,update:p});await recordHistory({userId:req.userId,action:'SAVE',module:'Pregnancy',title:'Pregnancy information saved',details:item.estimatedDueDate?`Estimated due date ${new Date(item.estimatedDueDate).toLocaleDateString()}`:'Pregnancy information updated.',entityId:item.id});return ok(res,item);}
module.exports={get,save};

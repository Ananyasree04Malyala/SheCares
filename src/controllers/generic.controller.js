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
const memoryRecords = new Map();

function getMemKey(type, userId) {
  return `${type}_${userId || 'default'}`;
}

function getMemList(type, userId) {
  const key = getMemKey(type, userId);
  if (!memoryRecords.has(key)) {
    memoryRecords.set(key, []);
  }
  return memoryRecords.get(key);
}

function createHandler(type) {
  return async (req, res) => {
    const cfg = models[type];
    const p = cfg.validator.parse(req.body);
    const data = { ...p, userId: req.userId };
    let item = null;

    try {
      item = await prisma[cfg.model].create({ data });
    } catch (err) {
      console.warn(`[GENERIC ${type}] Database unavailable for create, saving to memory:`, err.message);
      item = {
        id: `mem_${Date.now()}_${Math.random().toString(36).substring(2, 6)}`,
        ...data,
        createdAt: new Date(),
        updatedAt: new Date(),
        recordedAt: data.recordedAt || new Date()
      };
    }

    const list = getMemList(type, req.userId);
    list.unshift(item);

    try {
      await recordHistory({
        userId: req.userId,
        action: 'CREATE',
        module: cfg.label,
        title: historyTitle(type, item),
        details: actionDetails(type, item),
        entityId: item.id
      });
    } catch {}

    return ok(res, item, 201);
  };
}

function listHandler(type) {
  return async (req, res) => {
    const cfg = models[type];
    let orderBy;
    if (type === 'period') orderBy = { periodStart: 'desc' };
    else if (type === 'reminder' || type === 'appointment' || type === 'emergency' || type === 'medicine')
      orderBy = { createdAt: 'desc' };
    else orderBy = { recordedAt: 'desc' };

    try {
      const items = await prisma[cfg.model].findMany({ where: { userId: req.userId }, orderBy });
      if (Array.isArray(items)) {
        memoryRecords.set(getMemKey(type, req.userId), items);
        return ok(res, items);
      }
    } catch (err) {
      console.warn(`[GENERIC ${type}] Database unavailable for list, returning memory cache:`, err.message);
    }

    const cached = getMemList(type, req.userId);
    return ok(res, cached);
  };
}

function updateHandler(type) {
  return async (req, res) => {
    const cfg = models[type];
    const p = cfg.validator.partial().parse(req.body);
    const targetId = idParam(req);
    let item = null;

    try {
      const exists = await prisma[cfg.model].findFirst({ where: { id: targetId, userId: req.userId } });
      if (exists) {
        item = await prisma[cfg.model].update({ where: { id: targetId }, data: p });
      }
    } catch (err) {
      console.warn(`[GENERIC ${type}] Database unavailable for update, updating memory:`, err.message);
    }

    const list = getMemList(type, req.userId);
    const idx = list.findIndex(i => i.id === targetId);
    if (idx !== -1) {
      list[idx] = { ...list[idx], ...p, updatedAt: new Date() };
      if (!item) item = list[idx];
    }

    if (!item) return fail(res, 404, 'Record not found.');

    try {
      await recordHistory({
        userId: req.userId,
        action: 'UPDATE',
        module: cfg.label,
        title: `${cfg.label} updated`,
        details: historyTitle(type, item),
        entityId: item.id
      });
    } catch {}

    return ok(res, item);
  };
}

function deleteHandler(type) {
  return async (req, res) => {
    const cfg = models[type];
    const targetId = idParam(req);
    let deleted = false;

    try {
      const exists = await prisma[cfg.model].findFirst({ where: { id: targetId, userId: req.userId } });
      if (exists) {
        await prisma[cfg.model].delete({ where: { id: targetId } });
        deleted = true;
      }
    } catch (err) {
      console.warn(`[GENERIC ${type}] Database unavailable for delete, removing from memory:`, err.message);
    }

    const list = getMemList(type, req.userId);
    const idx = list.findIndex(i => i.id === targetId);
    if (idx !== -1) {
      list.splice(idx, 1);
      deleted = true;
    }

    return ok(res, { deleted: true });
  };
}

module.exports = { createHandler, listHandler, updateHandler, deleteHandler };

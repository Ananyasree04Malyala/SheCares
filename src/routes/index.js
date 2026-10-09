const router=require('express').Router(); const {authRequired, authOptional}=require('../middleware/auth'); const g=require('../controllers/generic.controller'); const p=require('../controllers/profile.controller'); const preg=require('../controllers/pregnancy.controller'); const sos=require('../controllers/sos.controller'); const chat=require('../controllers/chat.controller'); const history=require('../controllers/history.controller');
router.get('/profile',authRequired,p.get);router.put('/profile',authRequired,p.put);router.delete('/profile',authRequired,p.del);
function crud(path,type){router.get(path,authRequired,g.listHandler(type));router.post(path,authRequired,g.createHandler(type));router.put(`${path}/:id`,authRequired,g.updateHandler(type));router.delete(`${path}/:id`,authRequired,g.deleteHandler(type));}
crud('/emergency-contacts','emergency');crud('/blood-pressure','bp');crud('/glucose','glucose');crud('/periods','period');crud('/appointments','appointment');crud('/reminders','reminder');crud('/medicines','medicine');crud('/mood','mood');crud('/water','water');crud('/fitness','fitness');
router.get('/pregnancy',authRequired,preg.get);router.post('/pregnancy',authRequired,preg.save);router.put('/pregnancy',authRequired,preg.save);
router.post('/sos',authRequired,sos.create);router.post('/chat',authOptional,chat.create);router.get('/chat/conversations',authRequired,chat.conversations);
router.get('/history',authRequired,history.list);
const hospVisit=require('../controllers/hospital-visit.controller');
router.get('/hospital-visits',authRequired,hospVisit.list);
router.post('/hospital-visits',authRequired,hospVisit.create);
router.delete('/hospital-visits/:id',authRequired,hospVisit.deleteVisit);
const hospCtrl=require('../controllers/hospital.controller');
router.get('/hospitals/nearby',authOptional,hospCtrl.getNearbyHospitals);
const dev=require('../controllers/device.controller');
router.get('/device/endpoints',dev.getEndpoints);
router.post('/device/sync',authOptional,dev.syncReading);

const realtime = require('../services/realtimeService');
router.get('/realtime/stream', authOptional, (req, res) => realtime.registerClient(req, res, req.userId || null));
router.get('/events', authOptional, (req, res) => realtime.registerClient(req, res, req.userId || null));

const wearableRoutes = require('./wearable.routes');
router.use('/wearables', wearableRoutes);

const yoga = require('../controllers/yoga.controller');
router.get('/yoga/poses', authOptional, yoga.getPoses);
router.get('/yoga/poses/:id', authOptional, yoga.getPoseById);
router.post('/yoga/sessions', authRequired, yoga.logSession);
router.post('/yoga/assess', authOptional, yoga.assessSession);

router.get('/info',(req,res)=>res.json({success:true,message:'SheCare Healthcare API is online',version:'3.2.0',endpoints:['/api/health','/api/realtime/stream','/api/yoga/poses','/api/yoga/sessions','/api/yoga/assess']}));


module.exports=router;


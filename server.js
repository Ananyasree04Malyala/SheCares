require('express-async-errors');
const path=require('path');const express=require('express');const cookieParser=require('cookie-parser');const prisma=require('./src/config/db');const env=require('./src/config/env');const authRoutes=require('./src/routes/auth.routes');const apiRoutes=require('./src/routes');const {helmetMiddleware,corsMiddleware,apiLimiter,authLimiter}=require('./src/middleware/security');
const app=express();app.disable('x-powered-by');app.use(helmetMiddleware);app.use(corsMiddleware);app.use(express.json({limit:'100kb'}));app.use(cookieParser());
app.use((req, _res, next) => {
  if (req.query && req.query.path) {
    const p = String(req.query.path).replace(/^\//, '');
    delete req.query.path;
    req.url = `/api/${p}`;
  }
  next();
});
app.use('/api',apiLimiter);
app.use('/api/auth',authLimiter,authRoutes);app.use('/auth',authLimiter,authRoutes);
app.use('/api',apiRoutes);
app.get(['/api/health','/health'],async(_req,res)=>{let database='disconnected';try{await prisma.$queryRaw`SELECT 1`;database='connected';}catch{}res.json({ok:true,database,aiConfigured:Boolean(env.OPENAI_API_KEY)});});

app.get('/fitness.html', (req, res) => res.redirect('/pages/fitness.html'));
app.get('/yoga.html', (req, res) => res.redirect('/pages/fitness.html'));
const modulePages = ['emergency', 'pregnancy', 'period', 'mental', 'diabetic', 'food', 'caretaker', 'help', 'contact', 'hospitals', 'reminders', 'appointments', 'bp', 'history', 'profile', 'wearables'];
modulePages.forEach(p => {
  app.get([`/${p}.html`, `/${p}`], (req, res) => res.redirect(`/pages/${p}.html`));
});

app.use('/css', express.static(path.join(__dirname, 'css')));
app.use('/js', express.static(path.join(__dirname, 'js')));
app.use('/assets', express.static(path.join(__dirname, 'assets')));
app.use('/pages', express.static(path.join(__dirname, 'pages')));
app.use(express.static(path.join(__dirname)));
app.get('*', (req, res) => {
  if (req.path.startsWith('/api/')) return res.status(404).json({ success: false, error: 'API route not found.' });
  const ext = path.extname(req.path).toLowerCase();
  if (['.jpg', '.jpeg', '.png', '.gif', '.svg', '.webp', '.ico', '.css', '.js', '.woff', '.woff2', '.ttf', '.eot'].includes(ext)) {
    return res.status(404).send('Asset not found');
  }

  const fs = require('fs');
  const rawPath = req.path.replace(/^\//, '');
  if (!rawPath) return res.sendFile(path.join(__dirname, 'index.html'));

  const targetFile = rawPath.endsWith('.html') ? rawPath : `${rawPath}.html`;
  
  const rootPath = path.join(__dirname, targetFile);
  if (fs.existsSync(rootPath)) return res.sendFile(rootPath);

  const pagePath = path.join(__dirname, 'pages', targetFile);
  if (fs.existsSync(pagePath)) return res.sendFile(pagePath);

  res.sendFile(path.join(__dirname, 'index.html'));
});

app.use((err,_req,res,_next)=>{
  console.error('Unhandled server error:', err.stack || err.message);
  if(err.name==='ZodError') return res.status(400).json({success:false,error:'Please check the submitted information.', details: err.errors});
  if(err.code==='P2002') return res.status(409).json({success:false,error:'A record with one of these unique values already exists.'});
  res.status(500).json({success:false,error: err.message || 'An unexpected server error occurred.', stack: err.stack});
});
if (require.main === module) {
  const server = app.listen(env.PORT, () => console.log(`SheCare running at http://localhost:${env.PORT} and http://127.0.0.1:${env.PORT}`));
  process.on('SIGINT', async () => { await prisma.$disconnect(); server.close(() => process.exit(0)); });
  process.on('SIGTERM', async () => { await prisma.$disconnect(); server.close(() => process.exit(0)); });
}
module.exports = app;


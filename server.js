const express = require('express');
const path = require('path');
const multer = require('multer');
const fs = require('fs');
const mongoose = require('mongoose');

const app = express();
const PORT = process.env.PORT || 5000;

// 设置 EJS 作为模板引擎
app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, 'templates'));

// 设置静态文件目录
app.use(express.static(path.join(__dirname, 'static')));
app.use(express.urlencoded({ extended: true }));
app.use(express.json());

// 配置 Multer 存储
const storage = multer.diskStorage({
    destination: function (req, file, cb) {
        if (file.fieldname === 'image') {
            cb(null, 'static/uploads/images');
        } else if (file.fieldname === 'video') {
            cb(null, 'static/uploads/videos');
        } else if (file.fieldname === 'document') {
            cb(null, 'static/uploads/documents');
        } else {
            cb(null, 'static/uploads/others');
        }
    },
    filename: function (req, file, cb) {
        const uniqueSuffix = Date.now() + path.extname(file.originalname);
        cb(null, uniqueSuffix);
    }
});

const upload = multer({ storage: storage });

// 确保上传文件夹存在
const uploadFolders = ['images', 'videos', 'documents', 'others'];
uploadFolders.forEach(folder => {
    const dir = path.join(__dirname, 'static', 'uploads', folder);
    if (!fs.existsSync(dir)) {
        fs.mkdirSync(dir, { recursive: true });
    }
});

// 连接到 MongoDB（可选，如果不使用 MongoDB，请注释掉此部分）
//mongoose.connect(process.env.MONGODB_URI || 'your_mongodb_atlas_uri', {
//   // useNewUrlParser: true,
//    useUnifiedTopology: true
//})
.then(() => console.log('Connected to MongoDB'))
.catch(err => console.error('MongoDB connection error:', err));

// 定义记事 Schema 和模型
const noteSchema = new mongoose.Schema({
    title: String,
    content: String,
    image: String,
    video: String,
    document: String,
    upload_time: String
});

const Note = mongoose.model('Note', noteSchema);

// 渲染主页
app.get('/', async (req, res) => {
    let notes;
    try {
        notes = await Note.find();
    } catch (err) {
        console.error(err);
        notes = [];
    }
    res.render('index', { notes });
});

// 处理上传
app.post('/upload', upload.fields([
    { name: 'image', maxCount: 1 },
    { name: 'video', maxCount: 1 },
    { name: 'document', maxCount: 1 }
]), async (req, res) => {
    const { title, content } = req.body;
    const image = req.files['image'] ? `/uploads/images/${req.files['image'][0].filename}` : '';
    const video = req.files['video'] ? `/uploads/videos/${req.files['video'][0].filename}` : '';
    const document = req.files['document'] ? `/uploads/documents/${req.files['document'][0].filename}` : '';

    const note = new Note({
        title,
        content,
        image,
        video,
        document,
        upload_time: new Date().toLocaleString()
    });

    try {
        await note.save();
        res.redirect('/');
    } catch (err) {
        console.error(err);
        res.status(500).send('Error saving note');
    }
});

// 删除单个记事
app.post('/delete/:id', async (req, res) => {
    const id = req.params.id;
    try {
        const note = await Note.findById(id);
        if (note) {
            if (note.image) {
                fs.unlink(path.join(__dirname, 'static', note.image), err => {
                    if (err) console.error(err);
                });
            }
            if (note.video) {
                fs.unlink(path.join(__dirname, 'static', note.video), err => {
                    if (err) console.error(err);
                });
            }
            if (note.document) {
                fs.unlink(path.join(__dirname, 'static', note.document), err => {
                    if (err) console.error(err);
                });
            }

            await Note.findByIdAndDelete(id);
            res.json({ status: 'success' });
        } else {
            res.json({ status: 'failure', message: 'Note not found' });
        }
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'failure', message: 'Server error' });
    }
});

// 删除所有记事
app.post('/delete_all', async (req, res) => {
    try {
        const allNotes = await Note.find();
        allNotes.forEach(note => {
            if (note.image) {
                fs.unlink(path.join(__dirname, 'static', note.image), err => {
                    if (err) console.error(err);
                });
            }
            if (note.video) {
                fs.unlink(path.join(__dirname, 'static', note.video), err => {
                    if (err) console.error(err);
                });
            }
            if (note.document) {
                fs.unlink(path.join(__dirname, 'static', note.document), err => {
                    if (err) console.error(err);
                });
            }
        });

        await Note.deleteMany({});
        res.json({ status: 'success' });
    } catch (err) {
        console.error(err);
        res.status(500).json({ status: 'failure', message: 'Server error' });
    }
});

// 全局错误处理（可选）
app.use((err, req, res, next) => {
    console.error(err.stack);
    res.status(500).send('Something broke!');
});

// 启动服务器
app.listen(PORT, () => {
    console.log(`Server is running on http://localhost:${PORT}`);
});

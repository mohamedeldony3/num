// server.js

// 📚 توثيق: استدعاء المكتبات المطلوبة وملف الإعدادات
const express = require('express');
const axios = require('axios'); 
const mongoose = require('mongoose');
const bcrypt = require('bcrypt'); // لتشفير كلمات المرور
const config = require('./config'); 

const app = express();
const PORT = 3000;

// ⚠️ توثيق: استخدام الثوابت من ملف config
const API_NAME = config.API_CONFIG.NAME;
const API_KEY = config.API_CONFIG.KEY; 
const BASE_URL = config.API_CONFIG.BASE_URL;
const MONGO_URI = config.MONGO_CONFIG.URI;
const DEFAULT_COST = config.SITE_CONFIG.DEFAULT_COST;
const SALT_ROUNDS = config.SITE_CONFIG.SALT_ROUNDS;
const ADMIN_SECRET_KEY = config.SITE_CONFIG.ADMIN_SECRET_KEY; // 🆕 مفتاح المسؤول


// 📚 توثيق: الاتصال بقاعدة البيانات
mongoose.connect(MONGO_URI)
    .then(() => console.log('✅ تم الاتصال بقاعدة بيانات MongoDB بنجاح.'))
    .catch(err => console.error('❌ فشل الاتصال بـ MongoDB:', err.message));


// 📚 توثيق: تعريف الرؤوس (Headers) لمحاكاة طلب قادم من جهاز iOS
const IOS_HEADERS = {
    'User-Agent': 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_0 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/15E148',
    'Accept': 'application/json, text/plain, */*',
    'Accept-Language': 'ar-EG,ar;q=0.9,en-US;q=0.8,en;q=0.7',
    'Connection': 'keep-alive' 
};

// ----------------------------------------------------
// 📝 نماذج البيانات (Database Models)
// ----------------------------------------------------

const UserSchema = new mongoose.Schema({
    username: { type: String, required: true, unique: true },
    password: { type: String, required: true }, 
    balance: { type: Number, default: 0 } 
});
const User = mongoose.model('User', UserSchema);

const OrderSchema = new mongoose.Schema({
    userId: { type: mongoose.Schema.Types.ObjectId, ref: 'User', required: true },
    phoneNumber: { type: String, required: true },
    pid: { type: String, required: true }, 
    country: { type: String, required: true },
    cost: { type: Number, default: DEFAULT_COST },
    status: { type: String, default: 'PENDING_CODE' }, // PENDING_CODE, RECEIVED_CODE, BLACKLISTED
    codeReceived: { type: String, default: null },
    createdAt: { type: Date, default: Date.now }
});
const Order = mongoose.model('Order', OrderSchema);


// ----------------------------------------------------
// 🌐 إعداد الخادم والـ Endpoints
// ----------------------------------------------------

app.use(express.json()); 
app.use(express.static('public')); 


// 🔑 ➡️ توثيق: (8) - نهاية إنشاء حساب جديد (التسجيل)
app.post('/api/register', async (req, res) => {
    const { username, password } = req.body;

    try {
        const existingUser = await User.findOne({ username });
        if (existingUser) {
            return res.status(409).json({ success: false, message: 'اسم المستخدم مسجل بالفعل.' });
        }
        
        // 🔐 تشفير كلمة المرور
        const salt = await bcrypt.genSalt(SALT_ROUNDS);
        const hashedPassword = await bcrypt.hash(password, salt);
        
        const newUser = await User.create({
            username,
            password: hashedPassword,
            balance: 0.0 
        });

        res.json({ success: true, message: 'تم إنشاء الحساب بنجاح. يمكنك تسجيل الدخول الآن.', userId: newUser._id });

    } catch (error) {
        console.error('خطأ في التسجيل:', error);
        res.status(500).json({ success: false, message: 'فشل التسجيل الداخلي.' });
    }
});

// 🔑 ➡️ توثيق: (9) - نهاية تسجيل الدخول (Login)
app.post('/api/login', async (req, res) => {
    const { username, password } = req.body;

    try {
        const user = await User.findOne({ username });
        if (!user) {
            return res.status(401).json({ success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة.' });
        }

        // 🔐 مقارنة كلمة المرور
        const isMatch = await bcrypt.compare(password, user.password);

        if (!isMatch) {
            return res.status(401).json({ success: false, message: 'اسم المستخدم أو كلمة المرور غير صحيحة.' });
        }

        res.json({ 
            success: true, 
            message: 'تم تسجيل الدخول بنجاح.', 
            userId: user._id, 
            balance: user.balance 
        });

    } catch (error) {
        console.error('خطأ في تسجيل الدخول:', error);
        res.status(500).json({ success: false, message: 'فشل تسجيل الدخول الداخلي.' });
    }
});


// ➡️ توثيق: (6) - نهاية لعرض رصيد المستخدم
app.get('/api/balance/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'المستخدم غير موجود.' });
        }
        res.json({ success: true, balance: user.balance });
    } catch (error) {
        res.status(500).json({ success: false, message: 'خطأ في جلب الرصيد.' });
    }
});

// ➡️ توثيق: (7) - نهاية لعرض سجل الشراء
app.get('/api/history/:userId', async (req, res) => {
    const { userId } = req.params;
    try {
        const history = await Order.find({ userId: userId }).sort({ createdAt: -1 });
        res.json({ success: true, history: history });
    } catch (error) {
        res.status(500).json({ success: false, message: 'خطأ في جلب سجل الشراء.' });
    }
});

// ➡️ توثيق: (10) - نهاية شحن الرصيد للمستخدم العادي (للاختبار)
app.post('/api/add-credit', async (req, res) => {
    const { userId, amount } = req.body;
    
    const creditAmount = parseFloat(amount);
    if (isNaN(creditAmount) || creditAmount <= 0) {
        return res.status(400).json({ success: false, message: 'المبلغ غير صالح.' });
    }

    try {
        const user = await User.findById(userId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'المستخدم غير موجود.' });
        }

        user.balance += creditAmount;
        await user.save();
        
        res.json({ 
            success: true, 
            message: `تم شحن رصيدك بنجاح بمبلغ ${creditAmount.toFixed(2)} وحدة.`,
            newBalance: user.balance
        });

    } catch (error) {
        console.error('خطأ في شحن الرصيد:', error);
        res.status(500).json({ success: false, message: 'فشل شحن الرصيد الداخلي.' });
    }
});

// 👑 ➡️ توثيق: (11) - نهاية إضافة الرصيد للمسؤول (محمية بمفتاح سري)
app.post('/api/admin/add-credit', async (req, res) => {
    const { targetUserId, amount, adminKey } = req.body;
    
    // 1. 🔑 التحقق من مفتاح المسؤول السري
    if (adminKey !== ADMIN_SECRET_KEY) {
        return res.status(401).json({ success: false, message: 'غير مصرح: مفتاح المسؤول غير صحيح.' });
    }

    const creditAmount = parseFloat(amount);
    if (isNaN(creditAmount) || creditAmount <= 0) {
        return res.status(400).json({ success: false, message: 'المبلغ غير صالح.' });
    }

    try {
        // 2. البحث عن المستخدم المستهدف
        const user = await User.findById(targetUserId);
        if (!user) {
            return res.status(404).json({ success: false, message: 'المستخدم المستهدف غير موجود.' });
        }

        // 3. 💰 زيادة رصيد المستخدم
        user.balance += creditAmount;
        await user.save();
        
        res.json({ 
            success: true, 
            message: `تم إضافة ${creditAmount.toFixed(2)} وحدة بنجاح للمستخدم: ${user.username}.`,
            newBalance: user.balance
        });

    } catch (error) {
        console.error('خطأ المسؤول في شحن الرصيد:', error);
        res.status(500).json({ success: false, message: 'فشل داخلي في عملية إضافة الرصيد للمسؤول.' });
    }
});


// ➡️ توثيق: (1) - نهاية لطلب قائمة بالدول المتاحة
app.get('/api/countries', async (req, res) => {
    try {
        const url = `${BASE_URL}/getCountryPhoneNum?name=${API_NAME}&ApiKey=${API_KEY}&pid=0528&vip=null`;
        const response = await axios.get(url, { headers: IOS_HEADERS });

        if (response.data.code === 200) {
            res.json({ success: true, countries: response.data.data });
        } else {
            console.error("فشل API الدول:", response.data); 
            res.status(500).json({ success: false, message: 'فشل في جلب بيانات الدول من المورد.' });
        }
    } catch (error) {
        console.error("خطأ في جلب الدول:", error.message);
        res.status(500).json({ success: false, message: 'خطأ داخلي في الخادم.' });
    }
});

// ➡️ توثيق: (2) - نهاية لطلب رقم وهمي (مع التحقق من الرصيد وحفظ الطلب)
app.post('/api/request-number', async (req, res) => {
    const { country, pid, userId } = req.body; 
    const COST = DEFAULT_COST; 

    // 1. التحقق من الرصيد
    const user = await User.findById(userId);
    if (!user || user.balance < COST) {
        return res.status(403).json({ success: false, message: 'الرصيد غير كافٍ لطلب رقم جديد.' });
    }
    
    const url = `${BASE_URL}/getMobile?name=${API_NAME}&ApiKey=${API_KEY}&cuy=${country}&pid=${pid}&num=1&noblack=0&serial=2&secret_key=null&vip=null`;
    
    try {
        const response = await axios.get(url, { headers: IOS_HEADERS });
        
        if (response.data.code === 200) {
            const phoneNumber = response.data.data;
            
            // 2. حفظ الطلب في قاعدة البيانات كـ PENDING
            await Order.create({
                userId: userId,
                phoneNumber: phoneNumber,
                pid: pid,
                country: country,
                cost: COST,
                status: 'PENDING_CODE'
            });
            
            res.json({ success: true, number: phoneNumber, cost: COST });
        } else {
            console.error("فشل API طلب الرقم:", response.data);
            res.status(400).json({ success: false, message: response.data.msg || 'فشل في الحصول على رقم من المورد.' });
        }
    } catch (error) {
        console.error("خطأ في طلب الرقم:", error.message);
        res.status(500).json({ success: false, message: 'خطأ داخلي في الخادم.' });
    }
});

// ➡️ توثيق: (3) - نهاية للحصول على الكود (مع خصم الرصيد عند النجاح)
app.get('/api/get-code', async (req, res) => {
    const { pn, pid, userId } = req.query;
    
    const url = `${BASE_URL}/getMsg?name=${API_NAME}&ApiKey=${API_KEY}&pn=${pn}&pid=${pid}&serial=2`;

    try {
        const response = await axios.get(url, { headers: IOS_HEADERS });

        if (response.data.code === 200 && response.data.data !== "123456") {
            const receivedCode = response.data.data;
            
            // 💰 توثيق: خصم الرصيد وتحديث حالة الطلب
            const order = await Order.findOne({ userId: userId, phoneNumber: pn, pid: pid, status: 'PENDING_CODE' });

            if (order) {
                const user = await User.findById(userId);
                if (user && user.balance >= order.cost) {
                    user.balance -= order.cost;
                    await user.save();
                    
                    order.status = 'RECEIVED_CODE';
                    order.codeReceived = receivedCode;
                    await order.save();
                }
            }
            
            res.json({ success: true, code: receivedCode });
        } else {
            res.json({ success: false, message: 'الرمز لم يصل بعد. الرجاء المحاولة مجدداً.' });
        }
    } catch (error) {
        console.error("خطأ في جلب الكود:", error.message);
        res.status(500).json({ success: false, message: 'خطأ داخلي في الخادم.' });
    }
});

// ➡️ توثيق: (4) - نهاية لإضافة الرقم إلى قائمة الحظر
app.post('/api/add-blacklist', async (req, res) => {
    const { pn, pid, userId } = req.body;
    
    // 1. تحديث حالة الطلب في قاعدة البيانات إلى محظور
    const order = await Order.findOne({ userId: userId, phoneNumber: pn, pid: pid, status: 'PENDING_CODE' });
    if (order) {
        order.status = 'BLACKLISTED';
        await order.save();
    }

    // 2. إرسال الطلب للمورد
    const url = `${BASE_URL}/addBlack?name=${API_NAME}&ApiKey=${API_KEY}&pn=${pn}&pid=${pid}`;
    
    try {
        const response = await axios.get(url, { headers: IOS_HEADERS });
        
        if (response.data.code === 200 && (response.data.data === 1 || response.data.msg === "Success")) {
            res.json({ success: true, message: 'تم حظر الرقم في نظام المورد.' });
        } else {
            console.error("فشل API الحظر:", response.data);
            res.status(400).json({ success: false, message: response.data.msg || 'فشل في حظر الرقم في نظام المورد.' });
        }
    } catch (error) {
        console.error("خطأ في عملية الحظر:", error.message);
        res.status(500).json({ success: false, message: 'خطأ داخلي في الخادم أثناء الحظر.' });
    }
});


// 🚀 توثيق: تشغيل الخادم
app.listen(PORT, () => {
    console.log(`الخادم يعمل على: http://localhost:${PORT}`);
});

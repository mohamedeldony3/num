// config.js

// 📚 توثيق: إعدادات واجهة برمجة التطبيقات (API) للمورد
const API_CONFIG = {
    NAME: 'mramou',
    KEY: 'cWpDMlJ4M3d1eG96RzE5UC9rTnZWQT09', // مفتاح API الخاص بك
    BASE_URL: 'https://api.durianrcs.com/out/ext_api'
};

// 📚 توثيق: إعدادات قاعدة بيانات MongoDB
const MONGO_CONFIG = {
    URI: 'mongodb://localhost:27017/virtual_numbers_db' // رابط MongoDB
};

// 📚 توثيق: إعدادات الموقع العامة
const SITE_CONFIG = {
    DEFAULT_COST: 1.0, // التكلفة الافتراضية للرقم
    SALT_ROUNDS: 10, // عدد مرات التشفير لـ Bcrypt
    ADMIN_SECRET_KEY: 'YOUR_SECURE_ADMIN_KEY_12345' // ⚠️ يجب تغيير هذا المفتاح إلى قيمة قوية جداً
};

// 📚 توثيق: تصدير الإعدادات لاستخدامها في ملفات أخرى
module.exports = {
    API_CONFIG,
    MONGO_CONFIG,
    SITE_CONFIG
};

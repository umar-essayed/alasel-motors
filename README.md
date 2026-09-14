# الأصيل موتورز 🏎️

> نظام إدارة متكامل لمحلات مواتير ومكن السيارات

[![Build](https://github.com/YOUR_USERNAME/alasel-motors/actions/workflows/build.yml/badge.svg)](https://github.com/YOUR_USERNAME/alasel-motors/actions)

---

## المميزات

- **إدارة المخزون** — تسجيل المواتير بالرقم والموديل والسعر وورق التخليص الجمركي
- **نقطة البيع (POS)** — بيع مباشر بنظام الكاش أو الآجل أو الدفع الجزئي
- **إدارة العملاء** — متابعة الديون والأقساط وكشف الحساب
- **إدارة الموردين** — سجل المشتريات والمدفوعات
- **الخزينة** — حركات الوارد والمنصرف الكاملة
- **التحليلات** — أرباح وتقارير وإحصائيات
- **مزامنة Firebase** — Offline-first + Cloud sync تلقائي
- **تعدد الحسابات** — المدير + الكاشير بنظام PIN

## متطلبات التشغيل

```
Node.js 20+
npm 10+
```

## تشغيل للتطوير

```bash
# تشغيل الواجهة فقط (Web)
npm run dev

# تشغيل Electron (ديسكتوب)
npm run dev:electron
```

## البناء للإنتاج

```bash
# بناء Linux (AppImage + deb)
npm run dist:linux

# بناء Windows (.exe)
npm run dist:win

# بناء الاثنين
npm run dist:all
```

## إعداد Firebase (اختياري)

1. أنشئ مشروع على Firebase Console
2. فعّل Firestore Database
3. احفظ ملف Service Account JSON في مجلد المشروع
4. من الإعدادات في التطبيق، فعّل المزامنة السحابية

## GitHub Actions - CI/CD

عند الـ push لـ main أو إنشاء Release:
- يُبنى تلقائياً لـ Linux + Windows
- الملفات تُرفع كـ Artifacts أو Release Assets

### إعداد الـ Secrets

في إعدادات الريبو على GitHub:

```
Settings > Secrets > Actions > New secret
اسم: FIREBASE_SERVICE_ACCOUNT
القيمة: محتوى ملف JSON الخاص بـ Service Account
```

## الأمان

- لا ترفع ملف firebase-adminsdk-*.json على GitHub أبداً
- استخدم GitHub Secrets لتمرير بيانات Firebase في CI/CD

---

2025 الأصيل موتورز

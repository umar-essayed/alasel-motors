import { Account, Engine, Supplier, Customer, ClearanceDoc, SalesInvoice, Transaction, ShopSettings } from '../types';

export const defaultSettings: ShopSettings = {
  shopName: 'الأصيل موتورز لمواتير واستيراد مكن السيارات',
  shopOwner: 'الحاج أصيل وعادل',
  phone1: '01012345678',
  phone2: '01198765432',
  address: 'شارع المصانع - منطقة الحرفيين - القاهرة',
  commercialRecord: 'س.ت: 48921 / استيراد مكن سيارات',
  taxNumber: 'ب.ض: 781-342-990',
  defaultWarranty: 'ضمان شهر تجربة كاملة ضد عيوب الصناعة وعيب السحب والحرارة والزيت بشرط سلامة طبب المحرك ورقم الموتور',
  invoiceNotice: 'المكنة مباعة بأوراق الإفراج الجمركي الأصلية وصالحة للترخيص في المرور خلال المدة القانونية.',
};

export const defaultAccounts: Account[] = [
  {
    id: 'acc-admin',
    name: 'الحاج أصيل (المدير العام)',
    role: 'admin',
    roleTitle: 'الإدارة العليا وتحكم كامل',
    pin: '1122',
    avatarColor: 'bg-slate-800 text-amber-400',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'acc-sales',
    name: 'أحمد فتحي (مسؤول المبيعات)',
    role: 'sales',
    roleTitle: 'فواتير البيع والعملاء والآجل',
    pin: '2233',
    avatarColor: 'bg-blue-700 text-white',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'acc-inventory',
    name: 'محمود الصعيدي (أمين المخزن)',
    role: 'inventory',
    roleTitle: 'استلام وفحص المكن والإفراج الجمركي',
    pin: '3344',
    avatarColor: 'bg-emerald-700 text-white',
    createdAt: new Date().toISOString(),
  },
  {
    id: 'acc-accountant',
    name: 'أ/ سامح راشد (المحاسب)',
    role: 'accountant',
    roleTitle: 'الخزينة والموردين والأرباح والتقارير',
    pin: '4455',
    avatarColor: 'bg-purple-700 text-white',
    createdAt: new Date().toISOString(),
  },
];

// SVG placeholder for demo customs clearance paper to avoid broken images
const demoClearanceSvg = `data:image/svg+xml;utf8,<svg xmlns="http://www.w3.org/2000/svg" width="800" height="1100" viewBox="0 0 800 1100" fill="%23fcfcfc">
  <rect width="100%" height="100%" fill="%23fdfcf7" stroke="%23cbd5e1" stroke-width="4"/>
  <rect x="30" y="30" width="740" height="1040" fill="none" stroke="%23334155" stroke-width="2"/>
  <circle cx="400" cy="110" r="45" fill="none" stroke="%231e293b" stroke-width="2"/>
  <text x="400" y="115" font-family="sans-serif" font-size="14" font-weight="bold" text-anchor="middle" fill="%231e293b">جمهورية مصر العربية</text>
  <text x="400" y="135" font-family="sans-serif" font-size="12" text-anchor="middle" fill="%23475569">مصلحة الجمارك - ميناء بورسعيد</text>
  <text x="400" y="195" font-family="sans-serif" font-size="22" font-weight="bold" text-anchor="middle" fill="%230f172a">شهادة إفراج جمركي مشمول محركات سيارات</text>
  <line x1="60" y1="220" x2="740" y2="220" stroke="%230f172a" stroke-width="2"/>
  
  <text x="700" y="270" font-family="sans-serif" font-size="16" font-weight="bold" text-anchor="end" fill="%231e293b">رقم الإفراج الجمركي: 98412 / 2024</text>
  <text x="700" y="310" font-family="sans-serif" font-size="16" text-anchor="end" fill="%231e293b">المستورد: شركة الأصيل لاستيراد محركات السيارات وقطع الغيار</text>
  <text x="700" y="350" font-family="sans-serif" font-size="16" text-anchor="end" fill="%231e293b">ميناء الوصول: جمرك بورسعيد الاستيرادي</text>
  
  <rect x="60" y="390" width="680" height="280" fill="%23f8fafc" stroke="%23cbd5e1" stroke-width="1.5"/>
  <text x="700" y="430" font-family="sans-serif" font-size="18" font-weight="bold" text-anchor="end" fill="%230f172a">بيانات المحرك المعتمدة للمرور:</text>
  <text x="700" y="475" font-family="sans-serif" font-size="16" text-anchor="end" fill="%23334155">• رقم المكنة المدموغ: G4FC-7489211</text>
  <text x="700" y="515" font-family="sans-serif" font-size="16" text-anchor="end" fill="%23334155">• نوع المركبة: هيونداي (Hyundai) - طراز إلنترا HD</text>
  <text x="700" y="555" font-family="sans-serif" font-size="16" text-anchor="end" fill="%23334155">• سعة المحرك: 1591cc - 4 سلندر بنزين - حقن إلكتروني</text>
  <text x="700" y="595" font-family="sans-serif" font-size="16" text-anchor="end" fill="%23334155">• بلد المنشأ: كوريا الجنوبية (South Korea)</text>
  <text x="700" y="635" font-family="sans-serif" font-size="16" text-anchor="end" fill="%23334155">• الحالة الجمركية: خالص الرسوم الجمركية والضريبية بالكامل</text>

  <rect x="100" y="720" width="200" height="100" fill="none" stroke="%2394a3b8" stroke-dasharray="4"/>
  <text x="200" y="775" font-family="sans-serif" font-size="14" text-anchor="middle" fill="%2364748b">خاتم شعار الجمهورية / الجمارك</text>

  <text x="700" y="750" font-family="sans-serif" font-size="14" text-anchor="end" fill="%23334155">مدير إدارة الإفراج الجمركي: معتمد</text>
  <text x="700" y="780" font-family="sans-serif" font-size="14" text-anchor="end" fill="%23334155">تاريخ الإفراج: 12/04/2024</text>
  
  <rect x="60" y="870" width="680" height="120" fill="%23fff" stroke="%23e2e8f0"/>
  <text x="700" y="910" font-family="sans-serif" font-size="13" font-weight="bold" text-anchor="end" fill="%23b91c1c">تنبيه لإدارات المرور:</text>
  <text x="700" y="940" font-family="sans-serif" font-size="12" text-anchor="end" fill="%23475569">يتم ترخيص هذا المحرك بموجب أصل هذه الشهادة مع مطابقة الرقم المدموغ على البلوك مع بيانات الفحص الفني.</text>
</svg>`;

export const demoClearanceDocs: ClearanceDoc[] = [
  {
    id: 'doc-elantra-1',
    engineNumber: 'G4FC-7489211',
    imageData: demoClearanceSvg,
    fileName: 'إفراج_جمركي_النترا_G4FC-7489211.png',
    mimeType: 'image/svg+xml',
    customsOffice: 'جمرك بورسعيد الاستيرادي',
    clearanceNumber: '98412 / 2024',
    date: '2024-04-12',
    notes: 'ورق إفراج أصلي معتمد صالح للمرور بالكامل',
    createdAt: new Date().toISOString(),
    updatedAt: new Date().toISOString(),
    synced: false,
  },
];

export const defaultSuppliers: Supplier[] = [
  {
    id: 'sup-1',
    name: 'مكتب الحرمين لاستيراد المواتير (الحاج عبد الله)',
    phone: '01223456789',
    address: 'المنطقة الحرة - ميناء بورسعيد',
    totalPurchases: 215000,
    totalPaid: 165000,
    balance: 50000, // متبقي له 50,000 ج.م
    notes: 'مورد أساسي لمواتير الكوري (هيونداي وكيا) استيراد بحالة ممتازة',
    createdAt: new Date('2024-01-10').toISOString(),
    updatedAt: new Date().toISOString(),
    synced: false,
  },
  {
    id: 'sup-2',
    name: 'شركة النصر لتجارة المحركات (الحاج صبري)',
    phone: '01099887766',
    address: 'الحرفيين - بلوك 12 - القاهرة',
    totalPurchases: 140000,
    totalPaid: 140000,
    balance: 0, // خالص الحساب
    notes: 'مورد المواتير الياباني (تويوتا وميتسوبيشي ونيسان)',
    createdAt: new Date('2024-02-01').toISOString(),
    updatedAt: new Date().toISOString(),
    synced: false,
  },
];

export const defaultCustomers: Customer[] = [
  {
    id: 'cust-1',
    name: 'الأسطى شريف عبد الهادي (مركز السلام)',
    phone: '01122334455',
    nationalId: '28503120104812',
    address: 'شبرا الخيمة - القليوبية',
    totalPurchases: 95000,
    totalPaid: 65000,
    balance: 30000, // متبقي عليه 30,000 ج.م آجل
    notes: 'ميكانيكي معتمد يسحب مكن باستمرار ويسدد كل أسبوعين',
    createdAt: new Date('2024-02-15').toISOString(),
    updatedAt: new Date().toISOString(),
    synced: false,
  },
  {
    id: 'cust-2',
    name: 'الأستاذ أحمد كمال منصور',
    phone: '01055443322',
    nationalId: '29208151203941',
    address: 'مدينة نصر - القاهرة',
    totalPurchases: 46000,
    totalPaid: 46000,
    balance: 0, // دفع كاش كامل
    notes: 'عميل أفراد اشترى مكنة إلنترا HD لسيارته الخاصة كاش',
    createdAt: new Date('2024-03-01').toISOString(),
    updatedAt: new Date().toISOString(),
    synced: false,
  },
  {
    id: 'cust-3',
    name: 'الأسطى إبراهيم ميكانيكي (ورشة الإخلاص)',
    phone: '01288776655',
    nationalId: '28005111402319',
    address: 'فيصل - الجيزة',
    totalPurchases: 38000,
    totalPaid: 20000,
    balance: 18000, // آجل متبقي 18,000 ج.م
    notes: 'اشترى مكنة نيسان صني على دفعتين سدد 20 وباقي 18',
    createdAt: new Date('2024-03-10').toISOString(),
    updatedAt: new Date().toISOString(),
    synced: false,
  },
];

export const defaultEngines: Engine[] = [
  {
    id: 'eng-1',
    engineNumber: 'G4FC-7489211',
    carBrand: 'هيونداي (Hyundai)',
    carModel: 'إلنترا HD / MD / أكسنت RB',
    modelYear: '2012 - 2016',
    engineCapacity: '1600cc - G4FC 4 سلندر',
    transmissionType: 'يعمل أوتوماتيك وعادي',
    condition: 'استيراد كوريا خلع كامل بحالة الزيرو',
    costPrice: 37000,
    additionalCost: 1000, // شحن وتخليص
    sellingPrice: 46000,
    status: 'available',
    supplierId: 'sup-1',
    supplierName: 'مكتب الحرمين لاستيراد المواتير (الحاج عبد الله)',
    notes: 'المكنة جاهزة بالدينامو والمارش والمانفولد، ضغط بساتم ممتاز 95%',
    hasClearanceDoc: true,
    clearanceDocId: 'doc-elantra-1',
    createdAt: new Date('2024-04-12').toISOString(),
    updatedAt: new Date().toISOString(),
    synced: false,
  },
  {
    id: 'eng-2',
    engineNumber: 'G4FG-9831102',
    carBrand: 'كيا (Kia)',
    carModel: 'سيراتو K3 / كارينز',
    modelYear: '2015 - 2018',
    engineCapacity: '1600cc D-CVVT',
    transmissionType: 'أوتوماتيك',
    condition: 'استيراد كوريا بالفتيس الكامل',
    costPrice: 48000,
    additionalCost: 1500,
    sellingPrice: 59000,
    status: 'available',
    supplierId: 'sup-1',
    supplierName: 'مكتب الحرمين لاستيراد المواتير (الحاج عبد الله)',
    notes: 'وارد دبي استيراد بحالة المصنع لم يتم فك أي مسمار',
    hasClearanceDoc: false,
    createdAt: new Date('2024-04-14').toISOString(),
    updatedAt: new Date().toISOString(),
    synced: false,
  },
  {
    id: 'eng-3',
    engineNumber: '1ZR-5421098',
    carBrand: 'تويوتا (Toyota)',
    carModel: 'كورولا جمل / جنوب أفريقيا',
    modelYear: '2010 - 2015',
    engineCapacity: '1600cc Dual VVT-i',
    transmissionType: 'يعمل أوتوماتيك وعادي',
    condition: 'استيراد يابان خلع كامل مع الضفيرة والكمبيوتر',
    costPrice: 52000,
    additionalCost: 2000,
    sellingPrice: 64000,
    status: 'available',
    supplierId: 'sup-2',
    supplierName: 'شركة النصر لتجارة المحركات (الحاج صبري)',
    notes: 'مكنة تويوتا أصلية مع الكمبيوتر والضفيرة كاملة',
    hasClearanceDoc: false,
    createdAt: new Date('2024-04-15').toISOString(),
    updatedAt: new Date().toISOString(),
    synced: false,
  },
  {
    id: 'eng-4',
    engineNumber: '4G18-3829104',
    carBrand: 'ميتسوبيشي (Mitsubishi)',
    carModel: 'لانسر بوما (Lancer Boma)',
    modelYear: '2006 - 2014',
    engineCapacity: '1600cc كاتينة جنزير',
    transmissionType: 'عادي / مانيوال',
    condition: 'استيراد خلع كامل مجرب على البنك',
    costPrice: 31000,
    additionalCost: 1000,
    sellingPrice: 39000,
    status: 'available',
    supplierId: 'sup-2',
    supplierName: 'شركة النصر لتجارة المحركات (الحاج صبري)',
    notes: 'مجربة على بنك الاختبار بدون أي تسريب أو دخان',
    hasClearanceDoc: false,
    createdAt: new Date('2024-04-16').toISOString(),
    updatedAt: new Date().toISOString(),
    synced: false,
  },
  {
    id: 'eng-5',
    engineNumber: 'HR15-6712049',
    carBrand: 'نيسان (Nissan)',
    carModel: 'صني N17 شكل جديد',
    modelYear: '2014 - 2020',
    engineCapacity: '1500cc HR15DE',
    transmissionType: 'أوتوماتيك',
    condition: 'استيراد بحالة ممتازة بالبوابة الكهرباء',
    costPrice: 28000,
    additionalCost: 1000,
    sellingPrice: 35000,
    actualSoldPrice: 35000,
    status: 'sold',
    supplierId: 'sup-2',
    supplierName: 'شركة النصر لتجارة المحركات (الحاج صبري)',
    customerId: 'cust-3',
    customerName: 'الأسطى إبراهيم ميكانيكي (ورشة الإخلاص)',
    saleInvoiceId: 'INV-2024-001',
    saleDate: '2024-04-18',
    warrantyPeriod: 'ضمان 21 يوم تجربة',
    notes: 'تم البيع بنظام الآجل دفعة 20 ألف ومتبقي 18 ألف',
    hasClearanceDoc: false,
    createdAt: new Date('2024-04-10').toISOString(),
    updatedAt: new Date().toISOString(),
    synced: false,
  },
];

export const defaultSalesInvoices: SalesInvoice[] = [
  {
    id: 'INV-2024-001',
    invoiceNumber: 'INV-001',
    customerId: 'cust-3',
    customerName: 'الأسطى إبراهيم ميكانيكي (ورشة الإخلاص)',
    customerPhone: '01288776655',
    engineId: 'eng-5',
    engineNumber: 'HR15-6712049',
    engineTitle: 'نيسان صني N17 - موديل 2016 - 1500cc',
    costPrice: 29000, // 28000 + 1000 مصاريف
    totalAmount: 35000,
    discount: 0,
    finalAmount: 35000,
    paidAmount: 20000, // مسدد
    remainingAmount: 15000, // متبقي
    paymentType: 'partial',
    warrantyPeriod: 'ضمان 21 يوم تجربة واختبار على السيارة',
    chassisNumber: '3N1AB7AP7FY-98210',
    date: '2024-04-18',
    profit: 6000, // 35000 - 29000
    notes: 'تم استلام 20,000 ج.م كاش والباقي يستحق بعد شهر',
    createdBy: 'أحمد فتحي (مسؤول المبيعات)',
    createdAt: new Date('2024-04-18').toISOString(),
    synced: false,
  },
];

export const defaultTransactions: Transaction[] = [
  {
    id: 'tx-1',
    type: 'income',
    category: 'customer_payment',
    categoryLabel: 'مقدم بيع مكنة نيسان صني',
    amount: 20000,
    title: 'دفعة مقدمة - فاتورة INV-001 (الأسطى إبراهيم)',
    notes: 'استلام نقدي في درج الخزينة',
    date: '2024-04-18',
    relatedId: 'INV-2024-001',
    createdBy: 'أحمد فتحي',
    createdAt: new Date('2024-04-18').toISOString(),
    synced: false,
  },
  {
    id: 'tx-2',
    type: 'expense',
    category: 'rent',
    categoryLabel: 'إيجار المخزن والورشة',
    amount: 6000,
    title: 'سداد إيجار شهر إبريل لمخزن الحرفيين',
    notes: 'مسدد لمالك العقار بإيصال',
    date: '2024-04-05',
    createdBy: 'سامح راشد',
    createdAt: new Date('2024-04-05').toISOString(),
    synced: false,
  },
  {
    id: 'tx-3',
    type: 'expense',
    category: 'shipping',
    categoryLabel: 'مصاريف ونش وتنزيل حاوية',
    amount: 2500,
    title: 'أجرة ونش شوكة لتنزيل وتستيف دفعة مواتير هيونداي',
    notes: 'تنزيل 15 مكنة في المخزن',
    date: '2024-04-12',
    createdBy: 'محمود الصعيدي',
    createdAt: new Date('2024-04-12').toISOString(),
    synced: false,
  },
];

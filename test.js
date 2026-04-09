const XLSX=require('xlsx')

const exportToExcel = () => {
  const data = [
    {
      "كود المنتج": "P100",
      "اسم المنتج": "Test Milk",
      "الوصف": "Fresh test milk",
      "الفئة": "Dairy",
      "نوع الوحدة": "carton",
      "عدد القطع في الطرد": 12,
      "الكمية المتاحة": 5,
      "سعر بيع الطرد": 240,
      "سعر بيع القطعة": 20,
      "سعر الشراء": 180,
    }
  ];

  // 1. إنشاء "ورقة عمل" (Worksheet) من البيانات
  const worksheet = XLSX.utils.json_to_sheet(data);

  // 2. إنشاء "كتاب عمل" (Workbook)
  const workbook = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(workbook, worksheet, "Products");

  // 3. توليد وتحميل الملف
  XLSX.writeFile(workbook, "Product_Data.xlsx");
};

exportToExcel()
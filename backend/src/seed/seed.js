require('dotenv').config();
const bcrypt = require('bcryptjs');
const { connectDb, closeDb } = require('../config/db');
const Tenant = require('../models/Tenant');
const Branch = require('../models/Branch');
const User = require('../models/User');
const MenuItem = require('../models/MenuItem');
const Order = require('../models/Order');
const SupportMessage = require('../models/SupportMessage');
const { isStrongPassword } = require('../utils/validators');

const tenantName = String(process.env.SEED_TENANT_NAME || 'DYN SH').trim();
const tenantPlan = String(process.env.SEED_TENANT_PLAN || 'business').trim();
const ownerUsername = String(process.env.SEED_OWNER_USERNAME || 'owner.dynsh').trim().toLowerCase();
const ownerPassword = String(process.env.SEED_OWNER_PASSWORD || '');
const ownerFullName = String(process.env.SEED_OWNER_FULL_NAME || 'DYN SH Owner').trim();
const ownerEmail = String(process.env.SEED_OWNER_EMAIL || '').trim().toLowerCase() || null;
const ownerPhone = String(process.env.SEED_OWNER_PHONE || '').trim() || null;


const defaultMenus = [
  { name: 'Nasi Goreng Kampung', category: 'Makanan', price: 28000, costPrice: 13000, description: 'Nasi goreng gurih dengan telur, ayam suwir, dan acar segar.', imageUrl: 'https://images.unsplash.com/photo-1603133872878-684f208fb84b?auto=format&fit=crop&w=900&q=80' },
  { name: 'Ayam Geprek Sambal Bawang', category: 'Makanan', price: 30000, costPrice: 14000, description: 'Ayam crispy digeprek dengan sambal bawang pedas dan nasi hangat.', imageUrl: 'https://images.unsplash.com/photo-1562967916-eb82221dfb92?auto=format&fit=crop&w=900&q=80' },
  { name: 'Chicken Katsu Curry', category: 'Makanan', price: 38000, costPrice: 19000, description: 'Chicken katsu renyah dengan saus kari lembut ala Jepang.', imageUrl: 'https://images.unsplash.com/photo-1604908176997-125f25cc6f3d?auto=format&fit=crop&w=900&q=80' },
  { name: 'Mie Goreng Seafood', category: 'Makanan', price: 34000, costPrice: 17000, description: 'Mie goreng dengan udang, cumi, sayuran, dan bumbu wok harum.', imageUrl: 'https://images.unsplash.com/photo-1612929633738-8fe44f7ec841?auto=format&fit=crop&w=900&q=80' },
  { name: 'Sate Ayam Bumbu Kacang', category: 'Makanan', price: 36000, costPrice: 18000, description: 'Sate ayam bakar dengan bumbu kacang kental dan lontong.', imageUrl: 'https://images.unsplash.com/photo-1529563021893-cc83c992d75d?auto=format&fit=crop&w=900&q=80' },
  { name: 'Beef Black Pepper Rice', category: 'Makanan', price: 45000, costPrice: 23000, description: 'Irisan beef lada hitam dengan nasi dan sayur tumis.', imageUrl: 'https://images.unsplash.com/photo-1546833999-b9f581a1996d?auto=format&fit=crop&w=900&q=80' },
  { name: 'Soto Ayam Lamongan', category: 'Makanan', price: 27000, costPrice: 12000, description: 'Kuah kuning hangat, ayam suwir, koya, telur, dan sambal.', imageUrl: 'https://images.unsplash.com/photo-1569058242567-93de6f36f8eb?auto=format&fit=crop&w=900&q=80' },
  { name: 'Spaghetti Carbonara', category: 'Makanan', price: 42000, costPrice: 21000, description: 'Pasta creamy dengan smoked beef dan taburan parmesan.', imageUrl: 'https://images.unsplash.com/photo-1612874742237-6526221588e3?auto=format&fit=crop&w=900&q=80' },
  { name: 'Iced Americano', category: 'Minuman', price: 22000, costPrice: 8000, description: 'Espresso dingin dengan rasa kopi yang bersih dan ringan.', imageUrl: 'https://images.unsplash.com/photo-1517701550927-30cf4ba1dba5?auto=format&fit=crop&w=900&q=80' },
  { name: 'Cafe Latte', category: 'Minuman', price: 28000, costPrice: 10000, description: 'Espresso dan susu steamed yang lembut dengan foam tipis.', imageUrl: 'https://images.unsplash.com/photo-1570968915860-54d5c301fa9f?auto=format&fit=crop&w=900&q=80' },
  { name: 'Matcha Latte', category: 'Minuman', price: 30000, costPrice: 12000, description: 'Matcha premium dengan susu creamy dan aroma teh hijau.', imageUrl: 'https://images.unsplash.com/photo-1515823064-d6e0c04616a7?auto=format&fit=crop&w=900&q=80' },
  { name: 'Lemon Tea', category: 'Minuman', price: 18000, costPrice: 6000, description: 'Teh segar dengan perasan lemon dan rasa manis seimbang.', imageUrl: 'https://images.unsplash.com/photo-1556679343-c7306c1976bc?auto=format&fit=crop&w=900&q=80' },
  { name: 'Es Kopi Susu Gula Aren', category: 'Minuman', price: 26000, costPrice: 9000, description: 'Kopi susu dingin dengan manis legit gula aren.', imageUrl: 'https://images.unsplash.com/photo-1461023058943-07fcbe16d735?auto=format&fit=crop&w=900&q=80' },
  { name: 'Mango Smoothie', category: 'Minuman', price: 32000, costPrice: 13000, description: 'Smoothie mangga creamy dengan rasa tropis menyegarkan.', imageUrl: 'https://images.unsplash.com/photo-1505252585461-04db1eb84625?auto=format&fit=crop&w=900&q=80' },
  { name: 'Mineral Water', category: 'Minuman', price: 8000, costPrice: 3000, description: 'Air mineral botol dingin untuk melengkapi pesanan.', imageUrl: 'https://images.unsplash.com/photo-1559839734-2b71ea197ec2?auto=format&fit=crop&w=900&q=80' },
  { name: 'Chocolate Lava Cake', category: 'Dessert', price: 34000, costPrice: 15000, description: 'Cake cokelat hangat dengan lelehan cokelat di tengah.', imageUrl: 'https://images.unsplash.com/photo-1606313564200-e75d5e30476c?auto=format&fit=crop&w=900&q=80' },
  { name: 'Cheesecake Strawberry', category: 'Dessert', price: 36000, costPrice: 16000, description: 'Cheesecake lembut dengan topping stroberi segar.', imageUrl: 'https://images.unsplash.com/photo-1533134242443-d4fd215305ad?auto=format&fit=crop&w=900&q=80' },
  { name: 'Tiramisu Cup', category: 'Dessert', price: 32000, costPrice: 14000, description: 'Lapisan mascarpone, kopi, dan cocoa dalam cup praktis.', imageUrl: 'https://images.unsplash.com/photo-1571877227200-a0d98ea607e9?auto=format&fit=crop&w=900&q=80' },
  { name: 'Pancake Maple Butter', category: 'Dessert', price: 33000, costPrice: 14000, description: 'Pancake lembut dengan maple syrup dan butter.', imageUrl: 'https://images.unsplash.com/photo-1528207776546-365bb710ee93?auto=format&fit=crop&w=900&q=80' },
  { name: 'Banana Split Ice Cream', category: 'Dessert', price: 35000, costPrice: 15000, description: 'Pisang, es krim, saus cokelat, dan topping renyah.', imageUrl: 'https://images.unsplash.com/photo-1563805042-7684c019e1cb?auto=format&fit=crop&w=900&q=80' }
];

function assertSeedConfig() {
  if (!tenantName) {
    throw new Error('SEED_TENANT_NAME wajib diisi.');
  }
  if (!ownerUsername || !/^[a-z0-9._-]{4,60}$/.test(ownerUsername)) {
    throw new Error('SEED_OWNER_USERNAME wajib valid. Gunakan huruf kecil, angka, titik, garis bawah, atau strip.');
  }
  if (!isStrongPassword(ownerPassword)) {
    throw new Error('Set SEED_OWNER_PASSWORD dengan password kuat: minimal 10 karakter, huruf besar, huruf kecil, dan angka.');
  }
}

async function seed() {
  assertSeedConfig();
  await connectDb();

  await Promise.all([
    SupportMessage.deleteMany({}),
    Order.deleteMany({}),
    MenuItem.deleteMany({}),
    User.deleteMany({}),
    Branch.deleteMany({}),
    Tenant.deleteMany({})
  ]);

  const tenant = await Tenant.create({ name: tenantName, planName: tenantPlan, isActive: true });
  const mainBranch = await Branch.create({
    tenant: tenant._id,
    name: `${tenantName} Pusat`,
    city: process.env.SEED_MAIN_BRANCH_CITY || 'Jakarta',
    isActive: true
  });

  const passwordHash = await bcrypt.hash(ownerPassword, 12);
  await User.create({
    tenant: tenant._id,
    branch: null,
    role: 'owner',
    fullName: ownerFullName,
    username: ownerUsername,
    email: ownerEmail,
    phone: ownerPhone,
    passwordHash,
    isActive: true
  });

  await MenuItem.insertMany(defaultMenus.map((item) => ({
    tenant: tenant._id,
    name: item.name,
    category: item.category,
    price: item.price,
    costPrice: item.costPrice,
    description: item.description,
    imageUrl: item.imageUrl,
    isActive: true
  })));

  console.log('Seed completed.');
  console.log(`Tenant: ${tenant.name}`);
  console.log(`Main branch: ${mainBranch.name}`);
  console.log(`Owner username: ${ownerUsername}`);
  console.log(`Seed menu: ${defaultMenus.length} produk aktif`);
  console.log('Owner password is read from SEED_OWNER_PASSWORD and is not printed.');
}

seed()
  .catch((err) => {
    console.error('Seed failed:', err.message);
    process.exitCode = 1;
  })
  .finally(async () => {
    await closeDb();
  });

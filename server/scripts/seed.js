// Seeds master data and an admin account. `--demo` also adds clearly-labelled demo listings for local testing.
import bcrypt from 'bcryptjs';
import mongoose from 'mongoose';
import { connectDb } from '../src/config/db.js';
import { Content } from '../src/models/Content.js';
import { Institution } from '../src/models/Institution.js';
import { MasterData } from '../src/models/MasterData.js';
import { SpotAdmission } from '../src/models/SpotAdmission.js';
import { Testimonial } from '../src/models/Testimonial.js';
import { User } from '../src/models/User.js';
import { feeRangeFromCourses } from '../src/services/institutions.js';
import { slugify } from '../src/utils/text.js';

const demo = process.argv.includes('--demo');

const MASTER = {
  category: [
    ['Pre-School', 'baby', 'school'],
    ['School', 'school', 'school'],
    ['Diploma', 'wrench', 'college'],
    ['Engineering', 'cpu', 'college'],
    ['Degree (Arts / Commerce / Science)', 'book-open', 'college'],
    ['Medical', 'stethoscope', 'college'],
    ['Pharmacy', 'pill', 'college'],
    ['Nursing', 'heart-pulse', 'college'],
    ['MBA / Management', 'briefcase', 'college'],
    ['Law', 'scale', 'college'],
    ['Computer Applications (BCA / MCA)', 'laptop', 'college'],
    ['Coaching', 'graduation-cap', 'coaching'],
  ],
  city: ['Ahmedabad', 'Surat', 'Vadodara', 'Rajkot', 'Gandhinagar', 'Bhavnagar', 'Jamnagar', 'Anand', 'Mehsana', 'Junagadh', 'Navsari', 'Valsad', 'Bharuch', 'Morbi'],
  board: ['GSEB', 'CBSE', 'ICSE', 'IB', 'Cambridge (IGCSE)', 'NIOS'],
  university: ['GTU', 'Gujarat University', 'MSU Baroda', 'Saurashtra University', 'VNSGU', 'Nirma University', 'Charusat', 'Parul University', 'GSHSEB'],
  facility: ['Library', 'Hostel', 'Transport', 'Sports Ground', 'Smart Classrooms', 'Computer Lab', 'Science Labs', 'Cafeteria', 'Wi-Fi Campus', 'Auditorium', 'Medical Room', 'CCTV', 'Placement Cell', 'Swimming Pool', 'Gym'],
  stream: ['Science', 'Commerce', 'Arts', 'Engineering', 'Medical', 'Management', 'Pharmacy', 'Law', 'Computer Science'],
};

async function seedMaster() {
  let n = 0;
  for (const [kind, values] of Object.entries(MASTER)) {
    for (const [i, v] of values.entries()) {
      const [name, icon, appliesTo] = Array.isArray(v) ? v : [v];
      const res = await MasterData.updateOne(
        { kind, slug: slugify(name) },
        { $setOnInsert: { kind, name, slug: slugify(name), order: i, meta: { icon, appliesTo, state: kind === 'city' ? 'Gujarat' : undefined } } },
        { upsert: true },
      );
      n += res.upsertedCount;
    }
  }
  console.log(`[seed] master data: ${n} new`);
}

async function upsertUser({ email, phone, name, role, password }) {
  let user = await User.findOne({ email });
  if (!user) user = await User.create({ email, phone, name, role, phoneVerified: Boolean(phone), passwordHash: await bcrypt.hash(password, 10) });
  return user;
}

async function seedAdmin() {
  const email = (process.env.SEED_ADMIN_EMAIL || 'admin@thespotadmission.local').toLowerCase();
  const password = process.env.SEED_ADMIN_PASSWORD || 'Admin@12345';
  const user = await upsertUser({ email, name: 'Platform Admin', role: 'admin', password });
  if (user.role !== 'admin') await User.updateOne({ _id: user._id }, { role: 'admin' });
  console.log(`[seed] admin: ${email}${process.env.SEED_ADMIN_PASSWORD ? '' : ' / Admin@12345 (change it)'}`);
}

const img = (id) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&w=1200`;

async function seedDemo() {
  const owner = await upsertUser({ email: 'institute@demo.local', phone: '9000000001', name: 'Demo Institute Admin', role: 'institution', password: 'Demo@12345' });
  await upsertUser({ email: 'student@demo.local', phone: '9000000002', name: 'Demo Student', role: 'student', password: 'Demo@12345' });
  const list = [
    {
      name: 'Demo Institute of Technology',
      type: 'college',
      category: 'Engineering',
      ownership: 'private',
      university: 'GTU',
      city: 'Ahmedabad',
      cover: img(207692),
      courses: [
        { name: 'B.E. Computer Engineering', level: 'UG', stream: 'Engineering', duration: '4 years', feesPerYear: 115000, seatsTotal: 120, seatsVacant: 8, eligibility: '12th Science (PCM) with ACPC merit' },
        { name: 'B.E. Mechanical Engineering', level: 'UG', stream: 'Engineering', duration: '4 years', feesPerYear: 98000, seatsTotal: 60, seatsVacant: 12 },
        { name: 'Diploma Civil Engineering', level: 'Diploma', stream: 'Engineering', duration: '3 years', feesPerYear: 45000, seatsTotal: 60, seatsVacant: 5 },
      ],
      facilities: ['Library', 'Hostel', 'Transport', 'Computer Lab', 'Placement Cell', 'Wi-Fi Campus'],
      placements: { highestLpa: 12, averageLpa: 4.2, recruiters: ['TCS', 'Infosys', 'L&T'] },
      hostel: true,
    },
    {
      name: 'Demo Public School',
      type: 'school',
      category: 'School',
      ownership: 'private',
      board: 'CBSE',
      city: 'Surat',
      cover: img(8613089),
      courses: [
        { name: 'Nursery to Sr. KG', level: 'Pre-Primary', feesPerYear: 38000, seatsTotal: 80, seatsVacant: 10 },
        { name: 'Class 1 to 10', level: 'School', feesPerYear: 52000, seatsTotal: 400, seatsVacant: 22 },
        { name: 'Class 11-12 Science', level: 'Higher Secondary', stream: 'Science', feesPerYear: 68000, seatsTotal: 80, seatsVacant: 6 },
      ],
      facilities: ['Library', 'Transport', 'Sports Ground', 'Smart Classrooms', 'Science Labs', 'CCTV'],
      transport: true,
    },
    {
      name: 'Demo College of Pharmacy',
      type: 'college',
      category: 'Pharmacy',
      ownership: 'grant-in-aid',
      university: 'Gujarat University',
      city: 'Vadodara',
      cover: img(3762800),
      courses: [
        { name: 'B.Pharm', level: 'UG', stream: 'Pharmacy', duration: '4 years', feesPerYear: 72000, seatsTotal: 100, seatsVacant: 4 },
        { name: 'D.Pharm', level: 'Diploma', stream: 'Pharmacy', duration: '2 years', feesPerYear: 40000, seatsTotal: 60, seatsVacant: 9 },
      ],
      facilities: ['Library', 'Science Labs', 'Cafeteria', 'Wi-Fi Campus'],
    },
    {
      name: 'Demo Business School',
      type: 'college',
      category: 'MBA / Management',
      ownership: 'autonomous',
      university: 'Nirma University',
      city: 'Ahmedabad',
      cover: img(3184291),
      courses: [{ name: 'MBA', level: 'PG', stream: 'Management', duration: '2 years', feesPerYear: 180000, seatsTotal: 120, seatsVacant: 3 }],
      facilities: ['Library', 'Hostel', 'Auditorium', 'Placement Cell', 'Gym'],
      placements: { highestLpa: 18, averageLpa: 7.5, recruiters: ['Deloitte', 'HDFC Bank', 'Adani'] },
      hostel: true,
    },
    {
      name: 'Demo Kids Pre-School',
      type: 'preschool',
      category: 'Pre-School',
      ownership: 'private',
      board: 'GSEB',
      city: 'Rajkot',
      cover: img(8613089),
      courses: [{ name: 'Playgroup, Nursery, Jr. KG, Sr. KG', level: 'Pre-Primary', feesPerYear: 30000, seatsTotal: 60, seatsVacant: 15 }],
      facilities: ['CCTV', 'Transport', 'Medical Room'],
      transport: true,
    },
  ];
  for (const [i, d] of list.entries()) {
    const slug = slugify(`${d.name} ${d.city}`);
    if (await Institution.exists({ slug })) continue;
    const inst = await Institution.create({
      slug,
      name: d.name,
      type: d.type,
      category: d.category,
      ownership: d.ownership,
      board: d.board,
      university: d.university,
      about: `${d.name} is a DEMO listing created by the seed script for local testing. Replace it with a real institution profile before going live.`,
      cover: d.cover,
      gallery: [d.cover, img(267885), img(8613089)],
      contact: { phone: '9000000001', email: 'institute@demo.local' },
      address: { line: 'Demo address', city: d.city, state: 'Gujarat', pincode: '380001' },
      facilities: d.facilities,
      establishedYear: 1995 + i * 3,
      courses: d.courses,
      fees: feeRangeFromCourses(d.courses),
      placements: d.placements,
      hostel: d.hostel,
      transport: d.transport,
      status: 'approved',
      isVerified: i % 2 === 0,
      isFeatured: i < 3,
      owner: i === 0 ? owner._id : undefined,
      faqs: [{ q: 'Is this a real institution?', a: 'No. This is demo data for local testing.' }],
    });
    if (i < 2) {
      await SpotAdmission.create({
        institution: inst._id,
        courseName: d.courses[0].name,
        city: d.city,
        vacantSeats: d.courses[0].seatsVacant,
        round: 'Spot round',
        startDate: new Date(),
        endDate: new Date(Date.now() + (7 + i * 5) * 86400_000),
        documentsRequired: ['Marksheet', 'Leaving Certificate', 'Aadhaar Card', 'Passport-size photos'],
        notice: 'Demo spot-admission notice.',
        status: 'live',
      });
    }
  }
  if (!(await Testimonial.exists({}))) {
    await Testimonial.insertMany([
      { name: 'Demo Parent', role: 'Parent of Class 1 student', quote: 'Demo testimonial: the team helped us shortlist schools and finish admission smoothly.', rating: 5 },
      { name: 'Demo Student', role: 'B.E. student', quote: 'Demo testimonial: career counselling helped me pick the right branch.', rating: 5 },
    ]);
  }
  if (!(await Content.exists({}))) {
    const now = new Date();
    await Content.insertMany([
      { kind: 'article', slug: 'demo-how-to-choose-the-right-school', title: 'How to choose the right school (demo article)', excerpt: 'A checklist parents can use while visiting schools.', body: 'Visit the campus, meet teachers, check board results, transport and fees.\n\nThis is demo content.', category: 'Admission Guidance', published: true, publishedAt: now, cover: img(8613089) },
      { kind: 'news', slug: 'demo-acpc-admission-round-announced', title: 'Engineering admission round announced (demo)', excerpt: 'Demo news item for the news section.', body: 'Demo news body.', category: 'Admission News', published: true, publishedAt: now, cover: img(207692) },
      { kind: 'podcast', slug: 'demo-podcast-career-after-12th', title: 'Career options after 12th (demo podcast)', excerpt: 'Demo podcast episode.', mediaUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', published: true, publishedAt: now },
      { kind: 'virtual-tour', slug: 'demo-campus-virtual-tour', title: 'Demo campus virtual tour', excerpt: 'Walk through a demo campus.', mediaUrl: 'https://www.youtube.com/embed/dQw4w9WgXcQ', published: true, publishedAt: now, cover: img(267885) },
    ]);
  }
  console.log('[seed] demo data ready (institute@demo.local / student@demo.local, password Demo@12345)');
}

await connectDb();
await seedMaster();
await seedAdmin();
if (demo) await seedDemo();
await mongoose.disconnect();

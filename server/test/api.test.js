// Integration tests against a real MongoDB. Set TEST_MONGO_URI (defaults to a local throwaway DB); skipped when unreachable.
import assert from 'node:assert/strict';
import { after, before, describe, test } from 'node:test';
import mongoose from 'mongoose';
import request from 'supertest';

process.env.NODE_ENV = 'test';
process.env.ADMIN_EMAILS = 'admin@test.local';
const uri = process.env.TEST_MONGO_URI || 'mongodb://127.0.0.1:27017/thespotadmission_test';

let app;
let available = true;
try {
  await mongoose.connect(uri, { serverSelectionTimeoutMS: 1500 });
  await mongoose.connection.db.dropDatabase();
  const { createApp } = await import('../src/app.js');
  app = createApp();
} catch {
  available = false;
}

const register = async (body) => (await request(app).post('/api/auth/register').send({ password: 'Passw0rd!', ...body }).expect(201)).body;
const auth = (t) => ({ Authorization: `Bearer ${t}` });

describe('API flow', { skip: !available && 'MongoDB not reachable' }, () => {
  let admin;
  let inst;
  let student;
  let institutionId;
  let slug;

  before(async () => {
    admin = await register({ name: 'Admin', email: 'admin@test.local' });
    inst = await register({ name: 'Owner', email: 'owner@test.local', role: 'institution' });
    student = await register({ name: 'Stu', email: 'stu@test.local' });
  });
  after(async () => {
    await mongoose.connection.db?.dropDatabase();
    await mongoose.disconnect();
  });

  test('roles assigned', () => {
    assert.equal(admin.user.role, 'admin');
    assert.equal(inst.user.role, 'institution');
    assert.equal(student.user.role, 'student');
  });

  test('institution creates listing, cannot submit when incomplete, then submits', async () => {
    const created = await request(app).post('/api/institution').set(auth(inst.token)).send({ name: 'Test College', type: 'college', address: { city: 'Surat' } }).expect(201);
    institutionId = created.body.institution.id;
    slug = created.body.institution.slug;
    assert.equal(slug, 'test-college-surat');
    await request(app).post(`/api/institution/${institutionId}/submit`).set(auth(inst.token)).expect(400);
    await request(app)
      .put(`/api/institution/${institutionId}`)
      .set(auth(inst.token))
      .send({
        about: 'A'.repeat(100),
        logo: '/uploads/l.png',
        cover: '/uploads/c.png',
        contact: { phone: '9876543210', email: 'a@b.c' },
        address: { line: 'Road', city: 'Surat', pincode: '395001' },
        university: 'GTU',
        facilities: ['Library', 'Hostel', 'Wi-Fi Campus'],
      })
      .expect(200);
    await request(app).post(`/api/institution/${institutionId}/courses`).set(auth(inst.token)).send({ name: 'B.E. IT', feesPerYear: 90000, seatsTotal: 60, seatsVacant: 5 }).expect(201);
    const sub = await request(app).post(`/api/institution/${institutionId}/submit`).set(auth(inst.token)).expect(200);
    assert.equal(sub.body.institution.status, 'pending');
    assert.deepEqual(sub.body.institution.fees, { min: 90000, max: 90000 });
  });

  test('pending listing hidden; admin approval makes it public', async () => {
    await request(app).get(`/api/institutions/${slug}`).expect(404);
    await request(app).patch(`/api/admin/institutions/${institutionId}/status`).set(auth(inst.token)).send({ status: 'approved' }).expect(403);
    await request(app).patch(`/api/admin/institutions/${institutionId}/status`).set(auth(admin.token)).send({ status: 'rejected' }).expect(400);
    await request(app).patch(`/api/admin/institutions/${institutionId}/status`).set(auth(admin.token)).send({ status: 'approved' }).expect(200);
    const list = await request(app).get('/api/institutions?city=surat&course=B.E').expect(200);
    assert.equal(list.body.total, 1);
    assert.equal(list.body.items[0].vacantSeats, 5);
    const detail = await request(app).get(`/api/institutions/${slug}`).expect(200);
    assert.equal(detail.body.institution.owner, undefined);
  });

  test('OTP-verified enquiry; repeat enquiry merges', async () => {
    await request(app).post('/api/leads').send({ institutionId, name: 'Parent', phone: '9876500000', consent: true }).expect(400);
    const otp = await request(app).post('/api/auth/otp/send').send({ phone: '9876500000', purpose: 'lead' }).expect(200);
    assert.match(otp.body.devCode, /^\d{6}$/);
    await request(app).post('/api/leads').send({ institutionId, name: 'Parent', phone: '9876500000', code: '000000', consent: true }).expect(400);
    const lead = await request(app).post('/api/leads').send({ institutionId, name: 'Parent', phone: '9876500000', code: otp.body.devCode, course: 'B.E. IT', consent: true }).expect(201);
    assert.equal(lead.body.merged, false);
    const otp2 = await request(app).post('/api/auth/otp/send').send({ phone: '9876500000', purpose: 'lead' }).expect(200);
    await request(app).post('/api/auth/otp/send').send({ phone: '9876500000', purpose: 'lead' }).expect(429);
    const again = await request(app).post('/api/leads').send({ institutionId, name: 'Parent', phone: '9876500000', code: otp2.body.devCode, message: 'Hostel?', consent: true }).expect(200);
    assert.equal(again.body.merged, true);
  });

  test('institution sees and updates leads; CSV export', async () => {
    const leads = await request(app).get(`/api/institution/${institutionId}/leads`).set(auth(inst.token)).expect(200);
    assert.equal(leads.body.items.length, 1);
    await request(app).patch(`/api/institution/leads/${leads.body.items[0]._id}`).set(auth(inst.token)).send({ status: 'contacted', note: 'Called' }).expect(200);
    const csv = await request(app).get(`/api/institution/${institutionId}/leads.csv`).set(auth(inst.token)).expect(200);
    assert.match(csv.text, /contacted/);
    await request(app).get(`/api/institution/${institutionId}/leads`).set(auth(student.token)).expect(403);
  });

  test('spot admission: pending for unverified, admin publishes, atomic confirm closes at zero', async () => {
    const endDate = new Date(Date.now() + 86400_000).toISOString();
    const spot = await request(app).post(`/api/institution/${institutionId}/spot-admissions`).set(auth(inst.token)).send({ courseName: 'B.E. IT', vacantSeats: 1, endDate }).expect(201);
    assert.equal(spot.body.spot.status, 'pending');
    assert.equal((await request(app).get('/api/spot-admissions')).body.items.length, 0);
    await request(app).patch(`/api/admin/spot-admissions/${spot.body.spot._id}`).set(auth(admin.token)).send({ status: 'live' }).expect(200);
    assert.equal((await request(app).get('/api/spot-admissions?city=Surat')).body.items.length, 1);
    const [a, b] = await Promise.all([
      request(app).post(`/api/institution/spot/${spot.body.spot._id}/confirm`).set(auth(inst.token)),
      request(app).post(`/api/institution/spot/${spot.body.spot._id}/confirm`).set(auth(inst.token)),
    ]);
    assert.deepEqual([a.status, b.status].sort(), [200, 409]);
    assert.equal((await request(app).get('/api/spot-admissions')).body.items.length, 0);
  });

  test('reviews need moderation and update rating', async () => {
    await request(app).post('/api/reviews').set(auth(student.token)).send({ institutionId, rating: 4, body: 'Great faculty and helpful staff overall.' }).expect(201);
    await request(app).post('/api/reviews').set(auth(student.token)).send({ institutionId, rating: 5, body: 'Trying to review a second time here.' }).expect(409);
    const pending = await request(app).get('/api/admin/reviews?status=pending').set(auth(admin.token)).expect(200);
    await request(app).patch(`/api/admin/reviews/${pending.body.items[0]._id}`).set(auth(admin.token)).send({ status: 'approved' }).expect(200);
    const detail = await request(app).get(`/api/institutions/${slug}`).expect(200);
    assert.deepEqual(detail.body.institution.rating, { avg: 4, count: 1 });
  });

  test('student shortlist, application, compare', async () => {
    await request(app).post(`/api/me/shortlist/${institutionId}`).set(auth(student.token)).expect(200);
    assert.equal((await request(app).get('/api/me/shortlist').set(auth(student.token))).body.items.length, 1);
    const appBody = { institutionId, courseName: 'B.E. IT', personal: { name: 'Stu', phone: '9876511111' }, declaration: true };
    await request(app).post('/api/me/applications').set(auth(student.token)).send({ ...appBody, courseName: 'MBBS' }).expect(400);
    await request(app).post('/api/me/applications').set(auth(student.token)).send(appBody).expect(201);
    await request(app).post('/api/me/applications').set(auth(student.token)).send(appBody).expect(409);
    const cmp = await request(app).get(`/api/compare?ids=${institutionId},bad`).expect(200);
    assert.equal(cmp.body.items.length, 1);
  });

  test('critical edit after approval sends listing back to review', async () => {
    const res = await request(app).put(`/api/institution/${institutionId}`).set(auth(inst.token)).send({ ownership: 'government' }).expect(200);
    assert.equal(res.body.sentForReview, true);
    await request(app).get(`/api/institutions/${slug}`).expect(404);
  });

  test('counselling + contact forms reach admin', async () => {
    await request(app).post('/api/counselling').send({ type: 'career', name: 'Kid', phone: '9876522222', details: { interests: 'Coding' } }).expect(201);
    await request(app).post('/api/contact').send({ name: 'Visitor', message: 'Hello there', email: 'v@x.com' }).expect(201);
    const c = await request(app).get('/api/admin/counselling').set(auth(admin.token)).expect(200);
    assert.equal(c.body.items.length, 1);
    const stats = await request(app).get('/api/admin/stats').set(auth(admin.token)).expect(200);
    assert.equal(stats.body.pendingCounselling, 1);
  });
});

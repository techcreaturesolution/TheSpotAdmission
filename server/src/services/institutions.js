const FIELDS = [
  ['name', (i) => i.name],
  ['about', (i) => (i.about || '').length >= 80],
  ['logo', (i) => i.logo],
  ['cover', (i) => i.cover],
  ['contact phone', (i) => i.contact?.phone],
  ['contact email', (i) => i.contact?.email],
  ['address', (i) => i.address?.line && i.address?.city],
  ['pincode', (i) => i.address?.pincode],
  ['board / university', (i) => i.board || i.university],
  ['fees', (i) => i.fees?.min || i.fees?.max],
  ['facilities', (i) => (i.facilities || []).length >= 3],
  ['courses', (i) => (i.courses || []).length > 0],
  ['gallery', (i) => (i.gallery || []).length >= 3],
  ['established year', (i) => i.establishedYear],
];

export function profileCompleteness(inst) {
  const missing = FIELDS.filter(([, ok]) => !ok(inst)).map(([label]) => label);
  return { percent: Math.round(((FIELDS.length - missing.length) / FIELDS.length) * 100), missing };
}

export function feeRangeFromCourses(courses = []) {
  const fees = courses.map((c) => c.feesPerYear).filter((f) => typeof f === 'number' && f >= 0);
  if (!fees.length) return null;
  return { min: Math.min(...fees), max: Math.max(...fees) };
}

export const PUBLIC_CARD_FIELDS =
  'slug name type category ownership board university logo cover address.city address.state fees rating isVerified isFeatured courses.name courses.feesPerYear courses.seatsVacant facilities establishedYear';

export function toCard(i) {
  return {
    id: String(i._id),
    slug: i.slug,
    name: i.name,
    type: i.type,
    category: i.category,
    ownership: i.ownership,
    board: i.board,
    university: i.university,
    logo: i.logo,
    cover: i.cover,
    city: i.address?.city,
    state: i.address?.state,
    fees: i.fees,
    rating: i.rating,
    isVerified: i.isVerified,
    isFeatured: i.isFeatured,
    topCourses: (i.courses || []).slice(0, 3).map((c) => c.name),
    courseCount: (i.courses || []).length,
    vacantSeats: (i.courses || []).reduce((s, c) => s + (c.seatsVacant || 0), 0),
    facilities: i.facilities || [],
    establishedYear: i.establishedYear,
  };
}

// Fields that send an approved listing back to admin review when changed.
export const CRITICAL_FIELDS = ['name', 'type', 'ownership', 'board', 'university', 'fees', 'accreditation'];

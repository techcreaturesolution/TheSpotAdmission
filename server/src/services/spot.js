import { SpotAdmission } from '../models/SpotAdmission.js';
import { SpotAlert } from '../models/SpotAlert.js';
import { escapeRegex } from '../utils/text.js';
import { notifyUser } from './notify.js';

export async function closeExpiredSpots() {
  await SpotAdmission.updateMany(
    { status: 'live', $or: [{ endDate: { $lt: new Date() } }, { vacantSeats: { $lte: 0 } }] },
    { $set: { status: 'closed' } },
  );
}

export async function alertSubscribers(spot, institutionName) {
  const or = [{ city: { $in: [null, ''] } }];
  if (spot.city) or.push({ city: new RegExp(`^${escapeRegex(spot.city)}$`, 'i') });
  const alerts = await SpotAlert.find({ active: true, $or: or }).lean();
  const matching = alerts.filter((a) => !a.course || new RegExp(escapeRegex(a.course), 'i').test(spot.courseName));
  for (const a of matching) {
    await notifyUser(a.user, `Spot admission open: ${spot.courseName}`, `${institutionName} has ${spot.vacantSeats} vacant seats`, '/spot-admission');
  }
  if (matching.length) await SpotAlert.updateMany({ _id: { $in: matching.map((a) => a._id) } }, { $set: { lastNotifiedAt: new Date() } });
  return matching.length;
}

export async function confirmSpotSeat(spotId) {
  const spot = await SpotAdmission.findOneAndUpdate(
    { _id: spotId, status: 'live', vacantSeats: { $gt: 0 } },
    { $inc: { vacantSeats: -1, confirmedSeats: 1 } },
    { new: true },
  );
  if (spot && spot.vacantSeats <= 0) {
    spot.status = 'closed';
    await spot.save();
  }
  return spot;
}

const prisma = require('../config/db');
const { ok, fail } = require('../utils/api');
const { recordHistory } = require('../services/history');

async function create(req, res) {
  const {
    hospitalName,
    hospitalAddress,
    doctorName,
    department,
    visitDate,
    visitTime,
    reason,
    diagnosis,
    prescriptions,
    vitalSigns,
    followUpDate,
    notes
  } = req.body || {};

  if (!hospitalName || !hospitalName.trim()) {
    return fail(res, 400, 'Hospital name is required.');
  }
  if (!doctorName || !doctorName.trim()) {
    return fail(res, 400, 'Doctor name is required.');
  }

  const visitDateObj = visitDate ? new Date(visitDate) : new Date();
  const formattedTime = visitTime || '10:00 AM';

  const notesParts = [
    department ? `Department / Specialty: ${department}` : '',
    reason ? `Reason for Visit: ${reason}` : '',
    diagnosis ? `Diagnosis / Assessment: ${diagnosis}` : '',
    prescriptions ? `Prescriptions / Medicines: ${prescriptions}` : '',
    vitalSigns ? `Vital Signs: ${vitalSigns}` : '',
    followUpDate ? `Follow-up Date: ${followUpDate}` : '',
    notes ? `Additional Notes: ${notes}` : ''
  ].filter(Boolean).join('\n');

  // Save in appointment table as a completed hospital visit
  const appt = await prisma.appointment.create({
    data: {
      userId: req.userId,
      title: `Hospital Visit: ${hospitalName.trim()}`,
      doctor: `${doctorName.trim()}${department ? ` (${department.trim()})` : ''}`,
      date: visitDateObj,
      time: formattedTime,
      location: hospitalAddress ? hospitalAddress.trim() : hospitalName.trim(),
      notes: notesParts,
      status: 'Completed'
    }
  });

  // Record in ActivityHistory with full clinical details
  const historyDetailsParts = [
    `Doctor: ${doctorName.trim()}${department ? ` (${department.trim()})` : ''}`,
    reason ? `Reason: ${reason.trim()}` : null,
    diagnosis ? `Diagnosis: ${diagnosis.trim()}` : null,
    prescriptions ? `Rx: ${prescriptions.trim()}` : null,
    vitalSigns ? `Vitals: ${vitalSigns.trim()}` : null,
    followUpDate ? `Follow-up: ${followUpDate.trim()}` : null
  ].filter(Boolean).join(' | ');

  await recordHistory({
    userId: req.userId,
    action: 'VISIT_RECORDED',
    module: 'Hospital Visit',
    title: `Hospital Visit: ${hospitalName.trim()}`,
    details: historyDetailsParts,
    entityId: appt.id
  });

  return ok(res, appt, 201);
}

async function list(req, res) {
  const visits = await prisma.appointment.findMany({
    where: {
      userId: req.userId,
      OR: [
        { title: { startsWith: 'Hospital Visit' } },
        { status: 'Completed' },
        { status: 'Visit Recorded' }
      ]
    },
    orderBy: { date: 'desc' },
    take: 100
  });

  // Parse structured information out of notes
  const parsedVisits = visits.map(v => {
    const rawNotes = v.notes || '';
    const extract = (prefix) => {
      const match = rawNotes.match(new RegExp(`^${prefix}:?\\s*(.*)$`, 'm'));
      return match ? match[1].trim() : '';
    };

    return {
      id: v.id,
      hospitalName: (v.title || '').replace(/^Hospital Visit:\s*/, '') || v.location || 'Hospital',
      hospitalAddress: v.location || '',
      doctorName: v.doctor || '',
      department: extract('Department / Specialty'),
      visitDate: v.date,
      visitTime: v.time,
      reason: extract('Reason for Visit'),
      diagnosis: extract('Diagnosis / Assessment'),
      prescriptions: extract('Prescriptions / Medicines'),
      vitalSigns: extract('Vital Signs'),
      followUpDate: extract('Follow-up Date'),
      notes: extract('Additional Notes') || rawNotes,
      status: v.status,
      createdAt: v.createdAt
    };
  });

  return ok(res, parsedVisits);
}

async function deleteVisit(req, res) {
  const { id } = req.params;
  const visit = await prisma.appointment.findFirst({
    where: { id, userId: req.userId }
  });
  if (!visit) return fail(res, 404, 'Hospital visit record not found.');

  await prisma.appointment.delete({ where: { id } });

  await recordHistory({
    userId: req.userId,
    action: 'DELETE',
    module: 'Hospital Visit',
    title: `Deleted visit record: ${visit.title || 'Hospital Visit'}`,
    details: `Doctor: ${visit.doctor}`,
    entityId: id
  });

  return ok(res, { deleted: true });
}

module.exports = { create, list, deleteVisit };

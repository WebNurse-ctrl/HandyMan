import { PrismaClient, UserRole, Priority, WorkRequestStatus } from '@prisma/client';

const prisma = new PrismaClient();

async function main() {
  console.log('Seeding database...');

  // Create campuses
  const campusA = await prisma.campus.upsert({
    where: { code: 'CAMP-A' },
    update: {},
    create: {
      name: 'Campus Centrum',
      code: 'CAMP-A',
      address: 'Hoofdstraat 1',
      city: 'Antwerpen',
    },
  });

  const campusB = await prisma.campus.upsert({
    where: { code: 'CAMP-B' },
    update: {},
    create: {
      name: 'Campus Noord',
      code: 'CAMP-B',
      address: 'Noorderlaan 100',
      city: 'Antwerpen',
    },
  });

  const campusC = await prisma.campus.upsert({
    where: { code: 'CAMP-C' },
    update: {},
    create: {
      name: 'Campus Zuid',
      code: 'CAMP-C',
      address: 'Zuiderdijk 50',
      city: 'Mechelen',
    },
  });

  // Create locations per campus
  const locations = [
    { campusId: campusA.id, name: 'Gebouw A - Verdieping 0', building: 'A', floor: '0' },
    { campusId: campusA.id, name: 'Gebouw A - Verdieping 1', building: 'A', floor: '1' },
    { campusId: campusA.id, name: 'Gebouw B - Verdieping 0', building: 'B', floor: '0' },
    { campusId: campusB.id, name: 'Hoofdgebouw - Begane grond', building: 'Hoofd', floor: '0' },
    { campusId: campusB.id, name: 'Hoofdgebouw - Verdieping 1', building: 'Hoofd', floor: '1' },
    { campusId: campusC.id, name: 'Blok 1', building: 'Blok 1', floor: '0' },
    { campusId: campusC.id, name: 'Blok 2', building: 'Blok 2', floor: '0' },
  ];

  for (const loc of locations) {
    await prisma.location.upsert({
      where: {
        campusId_name: { campusId: loc.campusId, name: loc.name },
      },
      update: {},
      create: loc,
    });
  }

  // Create categories
  const categories = [
    { name: 'Elektriciteit', icon: 'bolt', color: '#f59e0b' },
    { name: 'Sanitair', icon: 'droplet', color: '#3b82f6' },
    { name: 'HVAC', icon: 'thermometer', color: '#ef4444' },
    { name: 'Schilderwerk', icon: 'paint', color: '#8b5cf6' },
    { name: 'Meubillair', icon: 'chair', color: '#6b7280' },
    { name: 'IT & Netwerk', icon: 'wifi', color: '#10b981' },
    { name: 'Buitenruimte', icon: 'tree', color: '#22c55e' },
    { name: 'Schoonmaak', icon: 'sparkle', color: '#06b6d4' },
    { name: 'Veiligheid', icon: 'shield', color: '#dc2626' },
    { name: 'Overige', icon: 'dots', color: '#9ca3af' },
  ];

  for (const cat of categories) {
    await prisma.category.upsert({
      where: { name: cat.name },
      update: {},
      create: cat,
    });
  }

  // Create system config
  const configs = [
    { key: 'small_purchase_limit', value: '500', description: 'Maximum bedrag voor kleine aankopen (geen goedkeuring nodig)' },
    { key: 'dept_head_approval_limit', value: '5000', description: 'Maximum bedrag waarvoor alleen diensthoofd goedkeuring nodig is' },
    { key: 'budget_warning_threshold', value: '90', description: 'Percentage van budget waarboven een waarschuwing wordt gestuurd' },
    { key: 'deadline_reminder_days', value: '3', description: 'Aantal dagen voor deadline om herinnering te sturen' },
  ];

  for (const config of configs) {
    await prisma.systemConfig.upsert({
      where: { key: config.key },
      update: {},
      create: config,
    });
  }

  console.log('Database seeded successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

const mongoose = require('mongoose');

const uri = process.env.MONGODB_URI || 'mongodb+srv://TheLordIT:TheLordIT@cluster0.uh1subp.mongodb.net/the_lord_of_crypto_cp';

async function purgeDatabase() {
  console.log('Connecting to MongoDB...');
  await mongoose.connect(uri);
  const db = mongoose.connection.db;
  console.log(`Successfully connected to Database: "${db.databaseName}"`);

  // 1. Locate the Super Admin Account
  const admin = await db.collection('users').findOne({ 
    $or: [
      { email: 'thelordit711@gmail.com' },
      { accessRole: 'SUPER_ADMIN' }
    ]
  });

  if (!admin) {
    console.error('FATAL: Could not locate Super Admin user in database. Aborting to avoid losing admin account.');
    await mongoose.disconnect();
    process.exit(1);
  }

  console.log(`\nVerified Super Admin: ID=${admin._id} | Email=${admin.email} | Name=${admin.fullName}`);

  // 2. Wipe all non-admin users
  const deleteUsersResult = await db.collection('users').deleteMany({
    _id: { $ne: admin._id }
  });
  console.log(`- Deleted non-admin users: ${deleteUsersResult.deletedCount}`);

  // Reset admin presence / work status to clean active state
  await db.collection('users').updateOne(
    { _id: admin._id },
    {
      $set: {
        workStatus: 'LOGGED_IN',
        presenceStatus: 'ONLINE',
        lastActiveAt: new Date(),
        updatedAt: new Date()
      }
    }
  );
  console.log('- Admin account reset to clean state (ONLINE)');

  // 3. Complete wipe of transactional / operational collections
  const collectionsToWipe = [
    'tasks',
    'payoutorders',
    'employeeledgers',
    'payrollschedules',
    'projects',
    'attendancesessions',
    'chatmessages',
    'notifications',
    'invitations',
    'dailyreports',
    'recurringexpenses',
    'auditlogs'
  ];

  for (const collName of collectionsToWipe) {
    try {
      const res = await db.collection(collName).deleteMany({});
      console.log(`- Purged collection "${collName}": ${res.deletedCount} document(s) deleted`);
    } catch (err) {
      console.warn(`! Could not wipe collection "${collName}":`, err.message);
    }
  }

  // 4. Reset CompanyVault to clean 0 balance state (No fake figures)
  await db.collection('companyvaults').deleteMany({});
  await db.collection('companyvaults').insertOne({
    generalBudget: 0,
    treasuryBalance: 0,
    currency: 'USDT',
    segmentedVaults: {
      salaries: {
        name: 'صندوق الرواتب والأجور',
        balance: 0,
        monthlyAllocated: 0,
        totalSpent: 0,
        alertThresholdPercent: 20
      },
      marketing: {
        name: 'صندوق التسويق والإعلانات',
        balance: 0,
        monthlyAllocated: 0,
        totalSpent: 0,
        alertThresholdPercent: 25
      },
      operationalReserve: {
        name: 'صندوق الاحتياطي التقني والتشغيلي',
        balance: 0,
        monthlyAllocated: 0,
        totalSpent: 0,
        alertThresholdPercent: 15
      }
    },
    customSubVaults: [],
    totalSpentByCategory: {
      salaries: 0,
      bonuses: 0,
      advances: 0,
      telegramOfficialAds: 0,
      telegramChannelPromos: 0,
      softwareSubscriptions: 0,
      otherExpenses: 0
    },
    totalDeductionsApplied: 0,
    manualAdjustmentsLog: [],
    totalOperatingBudget: 0,
    reservedPayrollBudget: 0,
    availableDisbursementBudget: 0,
    emergencyContingencyReserve: 0,
    totalDistributedPayouts: 0,
    lastAuditedAt: new Date(),
    createdAt: new Date(),
    updatedAt: new Date()
  });
  console.log('- CompanyVault reset to clean zero-balance state ($0.00 USDT)');

  // 5. Clean up channels: Keep only official system channels, remove test channels, reset members
  await db.collection('channels').deleteMany({ channelId: { $nin: ['general', 'trading', 'marketing', 'development', 'treasury'] } });
  await db.collection('channels').updateMany(
    {},
    {
      $set: {
        createdBy: admin._id,
        members: [],
        updatedAt: new Date()
      }
    }
  );
  console.log('- Channels cleaned and reset: only official system channels remain with 0 ghost members');

  // 6. Clean up meeting rooms: Keep single official room hosted by admin
  await db.collection('meetingrooms').deleteMany({});
  await db.collection('meetingrooms').insertOne({
    title: 'غرفة البث والاجتماعات المركزية — THE LORD',
    hostId: admin._id,
    status: 'ACTIVE',
    agenda: 'غرفة البث والاجتماعات المركزية الرسمية للمنظومة',
    meetingNotes: 'غرفة الاجتماعات الرسمية الخاصة بإدارة The Lord',
    participants: [],
    createdAt: new Date(),
    updatedAt: new Date()
  });
  console.log('- Meeting rooms reset: 1 official meeting room ready with 0 participants');

  // 7. Add an official clean audit log for tracking
  await db.collection('auditlogs').insertOne({
    userId: admin._id.toString(),
    userName: admin.fullName,
    userEmail: admin.email,
    userRole: 'SUPER_ADMIN',
    actionType: 'SYSTEM_SECURITY_CONFIG',
    targetName: 'قاعدة البيانات المركزية',
    targetType: 'SYSTEM',
    severity: 'WARNING',
    details: {
      action: 'تنفيذ تهيئة شاملة وإفراغ قاعدة البيانات وإزالة البيانات التجريبية',
      keptAdmin: admin.email,
      timestamp: new Date().toISOString()
    },
    createdAt: new Date()
  });
  console.log('- Official audit log recorded for the system purge');

  // 8. Verification Overview
  console.log('\n=== VERIFICATION AFTER PURGE ===');
  const collections = await db.listCollections().toArray();
  for (const c of collections) {
    const count = await db.collection(c.name).countDocuments();
    console.log(`- ${c.name}: ${count} document(s)`);
  }

  const remainingUsers = await db.collection('users').find({}).toArray();
  console.log('\n=== REMAINING USERS ===');
  for (const u of remainingUsers) {
    console.log(`- ID: ${u._id} | Email: ${u.email} | Name: ${u.fullName} | Role: ${u.accessRole}`);
  }

  await mongoose.disconnect();
  console.log('\n[SUCCESS] Database purge & clean-up completed successfully.');
}

purgeDatabase().catch(err => {
  console.error('[ERROR] Purge failed:', err);
  process.exit(1);
});


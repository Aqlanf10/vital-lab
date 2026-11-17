/**
 * Firestore Security Rules Adversarial Test Suite ("Dirty Dozen" Verification)
 * Verifies that all 12 adversarial payloads defined in security_spec.md return PERMISSION_DENIED.
 */

import {
  assertFails,
  assertSucceeds,
  initializeTestEnvironment,
  RulesTestEnvironment,
} from '@firebase/rules-unit-testing';
import { doc, getDoc, getDocs, collection, setDoc, updateDoc, serverTimestamp, Timestamp } from 'firebase/firestore';
import * as fs from 'fs';

let testEnv: RulesTestEnvironment;

export async function runDirtyDozenSecuritySuite() {
  testEnv = await initializeTestEnvironment({
    projectId: 'aqlan-dental-firebase-test',
    firestore: {
      rules: fs.readFileSync('firestore.rules', 'utf8'),
    },
  });

  const user1Ctx = testEnv.authenticatedContext('user_1', {
    email: 'clinic1@example.com',
    email_verified: true,
  });
  const spoofedAdminCtx = testEnv.authenticatedContext('attacker_spoof', {
    email: 'Aqlanf10@gmail.com',
    email_verified: false,
  });
  const orphanUserCtx = testEnv.authenticatedContext('orphan_user', {
    email: 'orphan@example.com',
    email_verified: true,
  });

  const dbUser1 = user1Ctx.firestore();
  const dbSpoof = spoofedAdminCtx.firestore();
  const dbOrphan = orphanUserCtx.firestore();

  // Seed valid workspace for user_1
  await assertSucceeds(
    setDoc(doc(dbUser1, 'workspaces', 'user_1'), {
      ownerId: 'user_1',
      labName: 'Vital Dental Lab',
      currency: 'ر.س',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );

  // 1. Shadow Field Injection
  await assertFails(
    setDoc(doc(dbOrphan, 'workspaces', 'orphan_user'), {
      ownerId: 'orphan_user',
      labName: 'Vital',
      currency: 'SAR',
      isSuperAdmin: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );

  // 2. Spoofed Admin Email Without email_verified
  await assertFails(getDoc(doc(dbSpoof, 'workspaces', 'user_1')));

  // 3. Self-Assigned Admin Privilege Escalation
  await assertFails(
    setDoc(doc(dbUser1, 'admins', 'user_1'), {
      uid: 'user_1',
      grantedBy: 'user_1',
      createdAt: serverTimestamp(),
    })
  );

  // 4. Orphaned Case Creation Without Parent Workspace
  await assertFails(
    setDoc(doc(dbOrphan, 'workspaces', 'orphan_user', 'cases', 'V-101'), {
      ownerId: 'orphan_user',
      branchId: 'taiz',
      caseCode: 'V-101',
      clinicId: 'Clinic A',
      patientName: 'Patient A',
      serviceType: 'Zirconia',
      units: 1,
      shade: 'A1',
      price: 300,
      status: 'Pending',
      receivedDate: '2026-11-10',
      dueDate: '2026-11-13',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );

  // 5. Identity Spoofing (ownerId mismatch)
  await assertFails(
    setDoc(doc(dbUser1, 'workspaces', 'user_1', 'cases', 'V-102'), {
      ownerId: 'victim_99',
      branchId: 'taiz',
      caseCode: 'V-102',
      clinicId: 'Clinic A',
      patientName: 'Patient A',
      serviceType: 'Zirconia',
      units: 1,
      shade: 'A1',
      price: 300,
      status: 'Pending',
      receivedDate: '2026-11-10',
      dueDate: '2026-11-13',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );

  // 6. ID Poisoning (Invalid characters in caseId)
  await assertFails(
    setDoc(doc(dbUser1, 'workspaces', 'user_1', 'cases', 'bad$id!spaces'), {
      ownerId: 'user_1',
      branchId: 'taiz',
      caseCode: 'V-103',
      clinicId: 'Clinic A',
      patientName: 'Patient A',
      serviceType: 'Zirconia',
      units: 1,
      shade: 'A1',
      price: 300,
      status: 'Pending',
      receivedDate: '2026-11-10',
      dueDate: '2026-11-13',
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );

  // 7. Denial-of-Wallet Oversized String (notes > 1000 chars)
  await assertFails(
    setDoc(doc(dbUser1, 'workspaces', 'user_1', 'cases', 'V-104'), {
      ownerId: 'user_1',
      branchId: 'taiz',
      caseCode: 'V-104',
      clinicId: 'Clinic A',
      patientName: 'Patient A',
      serviceType: 'Zirconia',
      units: 1,
      shade: 'A1',
      price: 300,
      status: 'Pending',
      receivedDate: '2026-11-10',
      dueDate: '2026-11-13',
      notes: 'X'.repeat(2500),
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );

  // 8. Type-Poisoned Array (selectedTeeth containing string instead of int)
  await assertFails(
    setDoc(doc(dbUser1, 'workspaces', 'user_1', 'cases', 'V-105'), {
      ownerId: 'user_1',
      branchId: 'taiz',
      caseCode: 'V-105',
      clinicId: 'Clinic A',
      patientName: 'Patient A',
      serviceType: 'Zirconia',
      units: 1,
      shade: 'A1',
      price: 300,
      status: 'Pending',
      receivedDate: '2026-11-10',
      dueDate: '2026-11-13',
      selectedTeeth: ['bad_tooth'],
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    })
  );

  // 9. Forged Client Timestamp
  await assertFails(
    setDoc(doc(dbUser1, 'workspaces', 'user_1', 'expenses', 'EXP-1'), {
      ownerId: 'user_1',
      branchId: 'taiz',
      category: 'materials',
      title: 'Zirconia Blocks',
      amount: 500,
      date: '2026-11-10',
      createdAt: Timestamp.fromMillis(1577836800000),
      updatedAt: serverTimestamp(),
    })
  );

  // 10. Immortal Field Mutation on Workspace Update
  await assertFails(
    updateDoc(doc(dbUser1, 'workspaces', 'user_1'), {
      ownerId: 'hijacked_owner',
      labName: 'Hijacked',
      updatedAt: serverTimestamp(),
    })
  );

  // 11. Terminal State Bypass on Delivered Case
  await testEnv.withSecurityRulesDisabled(async (ctx) => {
    await setDoc(doc(ctx.firestore(), 'workspaces', 'user_1', 'cases', 'V-DELIV'), {
      ownerId: 'user_1',
      branchId: 'taiz',
      caseCode: 'V-DELIV',
      clinicId: 'Clinic A',
      patientName: 'Patient Delivered',
      serviceType: 'Zirconia',
      units: 1,
      shade: 'A1',
      price: 300,
      status: 'Delivered',
      receivedDate: '2026-11-01',
      dueDate: '2026-11-05',
      createdAt: Timestamp.now(),
      updatedAt: Timestamp.now(),
    });
  });

  await assertFails(
    updateDoc(doc(dbUser1, 'workspaces', 'user_1', 'cases', 'V-DELIV'), {
      status: 'Pending',
      updatedAt: serverTimestamp(),
    })
  );

  // 12. Cross-Tenant Blanket List Query Scraping
  await assertFails(getDocs(collection(dbOrphan, 'workspaces', 'user_1', 'cases')));

  await testEnv.cleanup();
}

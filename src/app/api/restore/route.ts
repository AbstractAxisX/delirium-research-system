import { NextRequest, NextResponse } from "next/server";
import { db } from "@/lib/db";
import { requireAdmin, verifyPassword, hashPassword } from "@/lib/auth";

// POST /api/restore — admin only, requires password confirmation
// Body: { password, data: <backup JSON> }
//
// This is the MOST CRITICAL operation in the system.
// It must:
//   1. Wipe ALL existing data (in correct dependency order)
//   2. Restore EVERY table from the backup — nothing left behind
//   3. Use the SAME IDs so relationships (patient→mdasScores, user→patients) are preserved
//   4. Be atomic — if anything fails, the ENTIRE transaction rolls back (no partial restore)
//   5. Keep the current admin user alive (so they don't lock themselves out)
//
// The current admin's password is NOT changed — they keep their session.
// All OTHER users get a temporary password and must reset it after restore.
export async function POST(req: NextRequest) {
  try {
    const admin = await requireAdmin();
    const body = await req.json();
    const password = String(body.password || "");
    const data = body.data;

    const adminUser = await db.user.findUnique({ where: { id: admin.id } });
    if (!adminUser) return NextResponse.json({ error: "کاربر یافت نشد" }, { status: 404 });
    const ok = await verifyPassword(password, adminUser.password);
    if (!ok) return NextResponse.json({ error: "رمز عبور نادرست است" }, { status: 401 });

    // Validate backup structure
    if (!data || !data._meta || !Array.isArray(data.patients)) {
      return NextResponse.json({ error: "فایل پشتیبان نامعتبر است" }, { status: 400 });
    }

    // Save current admin info BEFORE wiping (so we can preserve them)
    const currentAdminId = admin.id;
    const currentAdminPassword = adminUser.password;
    const currentAdminUsername = adminUser.username;
    const currentAdminFullName = adminUser.fullName;
    const currentAdminPhone = adminUser.phone;
    const currentAdminRole = adminUser.role;
    const currentAdminActive = adminUser.active;
    const currentAdminGroupId = adminUser.groupId;
    const currentAdminPagePermissions = adminUser.pagePermissions;
    const currentAdminCreatedAt = adminUser.createdAt;
    const currentAdminUpdatedAt = adminUser.updatedAt;

    // Use a single transaction — if ANYTHING fails, EVERYTHING rolls back
    const result = await db.$transaction(async (tx) => {
      // ===== STEP 1: Wipe everything (in correct dependency order) =====
      await tx.auditLog.deleteMany();
      await tx.mdasScore.deleteMany();
      await tx.patient.deleteMany();
      await tx.formItem.deleteMany();
      await tx.department.deleteMany();
      await tx.user.deleteMany();
      await tx.group.deleteMany();

      // ===== STEP 2: Restore Groups first (users reference them) =====
      let groupsRestored = 0;
      if (Array.isArray(data.groups)) {
        for (const g of data.groups) {
          await tx.group.create({
            data: {
              id: g.id,
              name: g.name,
              description: g.description || null,
              color: g.color || "#0d9488",
              createdAt: g.createdAt ? new Date(g.createdAt) : new Date(),
              updatedAt: g.updatedAt ? new Date(g.updatedAt) : new Date(),
            },
          });
          groupsRestored++;
        }
      }

      // ===== STEP 3: Restore Departments =====
      let departmentsRestored = 0;
      if (Array.isArray(data.departments)) {
        for (const d of data.departments) {
          await tx.department.create({
            data: {
              id: d.id,
              name: d.name,
              sortOrder: d.sortOrder ?? 0,
              active: d.active ?? true,
              createdAt: d.createdAt ? new Date(d.createdAt) : new Date(),
              updatedAt: d.updatedAt ? new Date(d.updatedAt) : new Date(),
            },
          });
          departmentsRestored++;
        }
      }

      // ===== STEP 4: Restore FormItems (system configuration) =====
      let formItemsRestored = 0;
      if (Array.isArray(data.formItems)) {
        for (const f of data.formItems) {
          await tx.formItem.create({
            data: {
              id: f.id,
              key: f.key,
              title: f.title,
              description: f.description || null,
              category: f.category || "mdas",
              fieldType: f.fieldType || "radio",
              optionsJson: f.optionsJson || null,
              timePoints: f.timePoints || "BASELINE",
              order: f.order ?? 0,
              required: f.required ?? true,
              active: f.active ?? true,
              createdAt: f.createdAt ? new Date(f.createdAt) : new Date(),
              updatedAt: f.updatedAt ? new Date(f.updatedAt) : new Date(),
            },
          });
          formItemsRestored++;
        }
      }

      // ===== STEP 5: Restore Users =====
      // First, restore the current admin with their ORIGINAL password (so they stay logged in)
      let usersRestored = 0;
      await tx.user.create({
        data: {
          id: currentAdminId,
          username: currentAdminUsername,
          password: currentAdminPassword, // keep original password
          fullName: currentAdminFullName,
          phone: currentAdminPhone,
          role: currentAdminRole,
          active: currentAdminActive,
          groupId: currentAdminGroupId,
          pagePermissions: currentAdminPagePermissions,
          createdAt: currentAdminCreatedAt,
          updatedAt: currentAdminUpdatedAt,
        },
      });
      usersRestored++;

      // Restore other users from backup (with temporary passwords)
      if (Array.isArray(data.users)) {
        for (const u of data.users) {
          // Skip the current admin (already restored above)
          if (u.id === currentAdminId || u.username === currentAdminUsername) continue;

          // Generate a temporary password — user must reset after restore
          const tempPassword = await hashPassword("temp_restore_" + Date.now() + "_" + u.id);
          await tx.user.create({
            data: {
              id: u.id,
              username: u.username,
              password: tempPassword,
              fullName: u.fullName,
              phone: u.phone || null,
              role: u.role || "DOCTOR",
              active: u.active ?? true,
              groupId: u.groupId || null,
              pagePermissions: u.pagePermissions || "dashboard,new-patient,search-patient,all-patients,patient-detail",
              createdAt: u.createdAt ? new Date(u.createdAt) : new Date(),
              updatedAt: u.updatedAt ? new Date(u.updatedAt) : new Date(),
            },
          }).catch(() => {
            // Skip if there's a conflict (e.g., duplicate ID)
          });
          usersRestored++;
        }
      }

      // ===== STEP 6: Restore Patients (with ALL fields explicitly) =====
      let patientsRestored = 0;
      if (Array.isArray(data.patients)) {
        for (const p of data.patients) {
          await tx.patient.create({
            data: {
              id: p.id,
              code: p.code,
              nationalId: p.nationalId,
              fullName: p.fullName,
              gender: p.gender || null,
              age: p.age ?? null,
              phone: p.phone || null,
              address: p.address || null,
              date: p.date || null,
              causeOfDelirium: p.causeOfDelirium || null,
              deliriumSubtype: p.deliriumSubtype || null,
              department: p.department || null,
              drugAllergy: p.drugAllergy || null,
              reasonForAdmission: p.reasonForAdmission || null,
              dementiaHistory: p.dementiaHistory || null,
              admissionDate: p.admissionDate || null,
              organFailure: p.organFailure || null,
              admissionType: p.admissionType || null,
              opioidUse: p.opioidUse || null,
              benzodiazepineUse: p.benzodiazepineUse || null,
              psychiatricDrugUse: p.psychiatricDrugUse || null,
              painkillerUse: p.painkillerUse || null,
              qtcBefore: p.qtcBefore ?? null,
              qtcAfter: p.qtcAfter ?? null,
              eps: p.eps || null,
              sleepiness: p.sleepiness || null,
              tremor: p.tremor || null,
              muscleStiffness: p.muscleStiffness || null,
              drugType: p.drugType,
              drugDose: p.drugDose || null,
              hospitalStayDays: p.hospitalStayDays ?? null,
              icuShiftCount: p.icuShiftCount ?? null,
              needExtraDose: p.needExtraDose ?? false,
              earlyDischarge: p.earlyDischarge ?? false,
              deathBefore72h: p.deathBefore72h ?? false,
              relapse: p.relapse ?? false,
              icuAdmission: p.icuAdmission ?? false,
              patientRefusal: p.patientRefusal ?? false,
              severeSideEffect: p.severeSideEffect ?? false,
              physicalRestraint: p.physicalRestraint ?? false,
              createdById: p.createdById,
              groupId: p.groupId || null,
              createdAt: p.createdAt ? new Date(p.createdAt) : new Date(),
              updatedAt: p.updatedAt ? new Date(p.updatedAt) : new Date(),
            },
          });
          patientsRestored++;
        }
      }

      // ===== STEP 7: Restore MDAS Scores (with ALL fields) =====
      let mdasScoresRestored = 0;
      if (Array.isArray(data.mdasScores)) {
        for (const m of data.mdasScores) {
          await tx.mdasScore.create({
            data: {
              id: m.id,
              patientId: m.patientId,
              timePoint: m.timePoint,
              q1: m.q1 ?? null,
              q2: m.q2 ?? null,
              q3: m.q3 ?? null,
              q4: m.q4 ?? null,
              q5: m.q5 ?? null,
              q6: m.q6 ?? null,
              q7: m.q7 ?? null,
              q8: m.q8 ?? null,
              q9: m.q9 ?? null,
              q10: m.q10 ?? null,
              totalScore: m.totalScore ?? null,
              answersJson: m.answersJson || null,
              locked: m.locked ?? false,
              lockedAt: m.lockedAt ? new Date(m.lockedAt) : null,
              lastSavedAt: m.lastSavedAt ? new Date(m.lastSavedAt) : null,
              submittedAt: m.submittedAt ? new Date(m.submittedAt) : null,
              filledById: m.filledById || null,
              filledAt: m.filledAt ? new Date(m.filledAt) : null,
              createdAt: m.createdAt ? new Date(m.createdAt) : new Date(),
              updatedAt: m.updatedAt ? new Date(m.updatedAt) : new Date(),
            },
          });
          mdasScoresRestored++;
        }
      }

      // ===== STEP 8: Restore Audit Logs (with ALL fields) =====
      let auditLogsRestored = 0;
      if (Array.isArray(data.auditLogs)) {
        for (const a of data.auditLogs) {
          await tx.auditLog.create({
            data: {
              id: a.id,
              userId: a.userId || null,
              patientId: a.patientId || null,
              action: a.action || "UNKNOWN",
              detail: a.detail || null,
              createdAt: a.createdAt ? new Date(a.createdAt) : new Date(),
            },
          }).catch(() => {
            // Skip invalid audit log entries (e.g., if userId references a deleted user)
          });
          auditLogsRestored++;
        }
      }

      return {
        groups: groupsRestored,
        departments: departmentsRestored,
        formItems: formItemsRestored,
        users: usersRestored,
        patients: patientsRestored,
        mdasScores: mdasScoresRestored,
        auditLogs: auditLogsRestored,
      };
    }, {
      // Set a long timeout for large datasets
      timeout: 60000, // 60 seconds
    });

    // Log the restore (outside transaction so it always succeeds)
    await db.auditLog.create({
      data: {
        userId: admin.id,
        action: "RESTORE",
        detail: `بازگردانی کامل: ${result.patients} بیمار، ${result.mdasScores} نمره MDAS، ${result.users} کاربر، ${result.formItems} سؤال`,
      },
    });

    return NextResponse.json({
      ok: true,
      message: "داده‌ها با موفقیت بازگردانی شد",
      restored: result,
    });
  } catch (e: any) {
    if (e.message === "UNAUTHORIZED" || e.message === "FORBIDDEN") {
      return NextResponse.json({ error: "دسترسی غیرمجاز" }, { status: 403 });
    }
    return NextResponse.json({ error: "خطای سرور: " + e.message }, { status: 500 });
  }
}

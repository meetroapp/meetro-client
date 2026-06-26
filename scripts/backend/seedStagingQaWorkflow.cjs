#!/usr/bin/env node

/*
 * Staging-only Meetro QA workflow seed.
 *
 * Run from the backend repo root so this script can use the backend's installed
 * pg and bcrypt dependencies:
 *
 * QA_SEED_ALLOW_STAGING=true \
 * QA_SEED_TARGET=staging \
 * QA_SEED_PASSWORD='replace-with-secret' \
 * DATABASE_URL='postgres://...' \
 * node /path/to/meetro-client/scripts/backend/seedStagingQaWorkflow.cjs
 */

const { randomUUID } = require("crypto");

function loadBackendDependency(name) {
  return require(require.resolve(name, { paths: [process.cwd(), __dirname] }));
}

const { Pool } = loadBackendDependency("pg");
const bcrypt = loadBackendDependency("bcrypt");

const QA_EMAIL = "qa-mobile-pro@meetro.local";
const QA_TIMESTAMP = "2026-06-19T14:00:00.000Z";

function assertStagingSafety() {
  const allow = process.env.QA_SEED_ALLOW_STAGING === "true";
  const target = String(process.env.QA_SEED_TARGET || "").toLowerCase();
  const nodeEnv = String(process.env.NODE_ENV || "").toLowerCase();
  const railwayEnv = String(
    process.env.RAILWAY_ENVIRONMENT_NAME ||
      process.env.RAILWAY_ENVIRONMENT ||
      ""
  ).toLowerCase();

  if (!allow || target !== "staging") {
    throw new Error(
      "Refusing to seed. Set QA_SEED_ALLOW_STAGING=true and QA_SEED_TARGET=staging."
    );
  }

  if (nodeEnv === "production" || railwayEnv === "production") {
    throw new Error("Refusing to seed a production environment.");
  }

  if (!process.env.DATABASE_URL) {
    throw new Error("DATABASE_URL is required.");
  }

  if (!process.env.QA_SEED_PASSWORD) {
    throw new Error("QA_SEED_PASSWORD is required and must not be committed.");
  }
}

function createTimeline(prefix) {
  return [
    "visit_scheduled",
    "visit_confirmed",
    "evaluation_completed",
    "proposal_sent",
    "customer_approved",
    "payment_received",
    "work_scheduled",
    "on_the_way_ready",
  ].map((stage) => ({
    id: `${prefix}-${stage}`,
    stage,
    savedAt: QA_TIMESTAMP,
    source: "staging_backend_qa_seed",
  }));
}

function createCustomerFixture({
  customerName,
  email,
  address,
  service,
  materialName,
  date,
  time,
  total,
}) {
  const prefix = customerName.toLowerCase();
  const ids = {
    customerId: `qa-${prefix}-customer`,
    conversationId: `qa-${prefix}-conversation`,
    jobId: `qa-${prefix}-job`,
    quoteId: `qa-${prefix}-quote`,
    scheduleId: `qa-${prefix}-work-schedule`,
    receiptId: `qa-${prefix}-receipt`,
    historyJobId: `qa-${prefix}-history-job`,
    historyConversationId: `qa-${prefix}-history-conversation`,
    historyQuoteId: `qa-${prefix}-history-quote`,
    historyScheduleId: `qa-${prefix}-history-schedule`,
    historyReceiptId: `qa-${prefix}-history-receipt`,
  };
  const workItem = {
    id: `qa-${prefix}-work-item`,
    title: service,
    notes: `${customerName} evaluation notes only.`,
    safetyNotes: `${customerName} access notes only.`,
    photos: [
      {
        id: `qa-${prefix}-photo`,
        name: `${prefix}-photo.jpg`,
        uploadedAt: QA_TIMESTAMP,
      },
    ],
    measurements: [
      {
        id: `qa-${prefix}-measurement`,
        label: `${customerName} measurement`,
        value: "24",
        unit: "inches",
      },
    ],
    materials: [
      {
        id: `qa-${prefix}-material`,
        name: materialName,
        quantity: "1",
        unitPrice: "75",
      },
    ],
  };
  const timeline = createTimeline(`qa-${prefix}`);
  const activeWorkflow = {
    ids,
    customerName,
    customerEmail: email,
    address,
    service,
    status: "work_scheduled",
    nextAction: "On The Way",
    scheduleVisit: {
      id: ids.scheduleId,
      date,
      time,
      appointmentType: "work",
      status: "work_scheduled",
    },
    evaluation: {
      notes: `${customerName} evaluation notes only.`,
      measurements: workItem.measurements,
      photos: workItem.photos,
      workItems: [workItem],
    },
    proposal: {
      id: ids.quoteId,
      status: "accepted",
      total,
      laborAmount: total - 75,
      materialsAmount: 75,
    },
    payment: {
      status: "deposit_received",
      amount: total / 2,
      receivedAt: QA_TIMESTAMP,
    },
    workAppointment: {
      id: ids.scheduleId,
      date,
      time,
      status: "work_scheduled",
    },
    activeWork: {
      status: "work_scheduled",
      stage: "work_scheduled",
    },
    completion: {
      notes: `${customerName} completion notes only.`,
    },
    receipt: {
      id: ids.receiptId,
      status: "created",
      total,
    },
    closure: {
      notes: `${customerName} closure notes only.`,
      status: "open",
    },
    timeline,
  };

  return {
    customerName,
    email,
    address,
    service,
    total,
    ids,
    activeWorkflow,
    closedHistory: {
      ...activeWorkflow,
      ids: {
        ...ids,
        conversationId: ids.historyConversationId,
        jobId: ids.historyJobId,
        quoteId: ids.historyQuoteId,
        scheduleId: ids.historyScheduleId,
        receiptId: ids.historyReceiptId,
      },
      status: "closed",
      nextAction: "Review the full job history.",
      activeWork: null,
      receipt: {
        id: ids.historyReceiptId,
        status: "sent",
        total,
        sentAt: QA_TIMESTAMP,
      },
      closure: {
        notes: `${customerName} closure notes only.`,
        status: "closed",
        closedAt: QA_TIMESTAMP,
      },
      timeline: [
        ...timeline,
        {
          id: `qa-${prefix}-closed`,
          stage: "closed",
          savedAt: QA_TIMESTAMP,
          source: "staging_backend_qa_seed",
        },
      ],
    },
  };
}

async function ensureUser(client, user) {
  const existing = await client.query("SELECT * FROM users WHERE email = $1", [
    user.email,
  ]);

  if (existing.rows.length > 0) {
    const updated = await client.query(
      `
      UPDATE users
      SET username = $1,
          role = $2,
          account_type = $3,
          business_name = $4,
          business_category = $5
      WHERE email = $6
      RETURNING *
      `,
      [
        user.username,
        user.role,
        user.accountType,
        user.businessName,
        user.businessCategory,
        user.email,
      ]
    );
    return updated.rows[0];
  }

  const passwordHash = await bcrypt.hash(user.password, 10);
  const inserted = await client.query(
    `
    INSERT INTO users
    (username, email, password_hash, role, account_type, business_name, business_category)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
    `,
    [
      user.username,
      user.email,
      passwordHash,
      user.role,
      user.accountType,
      user.businessName,
      user.businessCategory,
    ]
  );
  return inserted.rows[0];
}

async function ensureContractorProfile(client, professionalUser) {
  const existing = await client.query(
    "SELECT * FROM contractor_profiles WHERE user_id = $1 LIMIT 1",
    [professionalUser.id]
  );

  if (existing.rows.length > 0) {
    const updated = await client.query(
      `
      UPDATE contractor_profiles
      SET business_name = $1,
          category = $2,
          phone = $3,
          location = $4,
          bio = $5,
          image_url = $6
      WHERE id = $7
      RETURNING *
      `,
      [
        "QA Pro Services",
        "handyman",
        "555-0100",
        "Staging QA",
        "Internal staging QA professional account.",
        null,
        existing.rows[0].id,
      ]
    );
    return updated.rows[0];
  }

  const inserted = await client.query(
    `
    INSERT INTO contractor_profiles
    (user_id, business_name, category, phone, location, bio, image_url)
    VALUES ($1, $2, $3, $4, $5, $6, $7)
    RETURNING *
    `,
    [
      professionalUser.id,
      "QA Pro Services",
      "handyman",
      "555-0100",
      "Staging QA",
      "Internal staging QA professional account.",
      null,
    ]
  );
  return inserted.rows[0];
}

async function ensureQuoteRequest(client, fixture, contractorProfile, customerUser) {
  const existing = await client.query(
    `
    SELECT *
    FROM quote_requests
    WHERE contractor_id = $1
      AND homeowner_id = $2
      AND project_title = $3
    LIMIT 1
    `,
    [contractorProfile.id, customerUser.id, fixture.service]
  );

  if (existing.rows.length > 0) {
    const updated = await client.query(
      `
      UPDATE quote_requests
      SET project_description = $1,
          location = $2
      WHERE id = $3
      RETURNING *
      `,
      [
        `${fixture.customerName} staging QA active workflow.`,
        fixture.address,
        existing.rows[0].id,
      ]
    );
    return updated.rows[0];
  }

  const inserted = await client.query(
    `
    INSERT INTO quote_requests
    (contractor_id, homeowner_id, project_title, project_description, location)
    VALUES ($1, $2, $3, $4, $5)
    RETURNING *
    `,
    [
      contractorProfile.id,
      customerUser.id,
      fixture.service,
      `${fixture.customerName} staging QA active workflow.`,
      fixture.address,
    ]
  );
  return inserted.rows[0];
}

async function resetQaMessages(client, quoteRequestId) {
  await client.query(
    `
    DELETE FROM messages
    WHERE quote_request_id = $1
      AND message_text LIKE '[QA-SEED]%'
    `,
    [quoteRequestId]
  );
}

async function insertQaMessages(client, fixture, professionalUser, customerUser, quoteRequest) {
  await resetQaMessages(client, quoteRequest.id);
  await client.query(
    `
    INSERT INTO messages
    (quote_request_id, sender_id, receiver_id, message_text, image_url)
    VALUES
      ($1, $2, $3, $4, NULL),
      ($1, $3, $2, $5, NULL)
    `,
    [
      quoteRequest.id,
      professionalUser.id,
      customerUser.id,
      `[QA-SEED] ${fixture.customerName} conversation only. Conversation ${fixture.ids.conversationId}.`,
      `[QA-SEED] ${fixture.customerName} confirmed the work appointment.`,
    ]
  );
}

async function ensureWorkflowRecordTable(client) {
  await client.query(`
    CREATE TABLE IF NOT EXISTS qa_workflow_records (
      id TEXT PRIMARY KEY,
      owner_user_id INTEGER NOT NULL,
      customer_user_id INTEGER NOT NULL,
      customer_name TEXT NOT NULL,
      record_type TEXT NOT NULL,
      record_key TEXT NOT NULL,
      payload JSONB NOT NULL,
      created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
      updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    )
  `);
}

async function upsertWorkflowRecord(client, record) {
  await client.query(
    `
    INSERT INTO qa_workflow_records
    (id, owner_user_id, customer_user_id, customer_name, record_type, record_key, payload)
    VALUES ($1, $2, $3, $4, $5, $6, $7::jsonb)
    ON CONFLICT (id)
    DO UPDATE SET
      owner_user_id = EXCLUDED.owner_user_id,
      customer_user_id = EXCLUDED.customer_user_id,
      customer_name = EXCLUDED.customer_name,
      record_type = EXCLUDED.record_type,
      record_key = EXCLUDED.record_key,
      payload = EXCLUDED.payload,
      updated_at = NOW()
    `,
    [
      record.id,
      record.ownerUserId,
      record.customerUserId,
      record.customerName,
      record.recordType,
      record.recordKey,
      JSON.stringify(record.payload),
    ]
  );
}

async function seed() {
  assertStagingSafety();

  const pool = new Pool({
    connectionString: process.env.DATABASE_URL,
    ssl:
      process.env.PGSSLMODE === "disable"
        ? false
        : {
            rejectUnauthorized: false,
          },
  });
  const client = await pool.connect();

  const fixtures = [
    createCustomerFixture({
      customerName: "Sarah",
      email: "qa-sarah@meetro.local",
      address: "101 Sarah St",
      service: "Sarah sink repair",
      materialName: "Sarah shutoff valve",
      date: "2026-06-22",
      time: "09:00",
      total: 250,
    }),
    createCustomerFixture({
      customerName: "William",
      email: "qa-william@meetro.local",
      address: "202 William Ave",
      service: "William outlet repair",
      materialName: "William GFCI outlet",
      date: "2026-06-23",
      time: "10:00",
      total: 325,
    }),
  ];

  const recordMap = {};

  try {
    await client.query("BEGIN");
    await ensureWorkflowRecordTable(client);

    const professionalUser = await ensureUser(client, {
      username: "QA Pro",
      email: QA_EMAIL,
      password: process.env.QA_SEED_PASSWORD,
      role: "handyman",
      accountType: "professional",
      businessName: "QA Pro Services",
      businessCategory: "handyman",
    });
    const contractorProfile = await ensureContractorProfile(
      client,
      professionalUser
    );

    for (const fixture of fixtures) {
      const customerUser = await ensureUser(client, {
        username: fixture.customerName,
        email: fixture.email,
        password: randomUUID(),
        role: "homeowner",
        accountType: "homeowner",
        businessName: "",
        businessCategory: "",
      });
      const quoteRequest = await ensureQuoteRequest(
        client,
        fixture,
        contractorProfile,
        customerUser
      );
      await insertQaMessages(
        client,
        fixture,
        professionalUser,
        customerUser,
        quoteRequest
      );

      await upsertWorkflowRecord(client, {
        id: `${fixture.ids.jobId}:active`,
        ownerUserId: professionalUser.id,
        customerUserId: customerUser.id,
        customerName: fixture.customerName,
        recordType: "active_workflow",
        recordKey: fixture.ids.jobId,
        payload: {
          ...fixture.activeWorkflow,
          backend: {
            professionalUserId: professionalUser.id,
            contractorProfileId: contractorProfile.id,
            customerUserId: customerUser.id,
            quoteRequestId: quoteRequest.id,
          },
        },
      });
      await upsertWorkflowRecord(client, {
        id: `${fixture.ids.historyJobId}:history`,
        ownerUserId: professionalUser.id,
        customerUserId: customerUser.id,
        customerName: fixture.customerName,
        recordType: "closed_history",
        recordKey: fixture.ids.historyJobId,
        payload: {
          ...fixture.closedHistory,
          backend: {
            professionalUserId: professionalUser.id,
            contractorProfileId: contractorProfile.id,
            customerUserId: customerUser.id,
            quoteRequestId: quoteRequest.id,
          },
        },
      });

      recordMap[fixture.customerName] = {
        customerUserId: customerUser.id,
        conversationId: fixture.ids.conversationId,
        jobId: fixture.ids.jobId,
        quoteId: fixture.ids.quoteId,
        scheduleId: fixture.ids.scheduleId,
        receiptId: fixture.ids.receiptId,
        historyJobId: fixture.ids.historyJobId,
        quoteRequestId: quoteRequest.id,
      };
    }

    await client.query("COMMIT");
    console.log(
      JSON.stringify(
        {
          ok: true,
          account: {
            email: QA_EMAIL,
            userId: professionalUser.id,
            contractorProfileId: contractorProfile.id,
          },
          records: recordMap,
        },
        null,
        2
      )
    );
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
    await pool.end();
  }
}

seed().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});

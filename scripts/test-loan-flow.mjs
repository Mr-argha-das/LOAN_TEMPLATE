import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { DatabaseSync } from "node:sqlite";
import { test } from "node:test";
import ts from "typescript";

// Load the standalone API without starting the web framework.
const source = readFileSync(new URL("../src/lib/loan-api.server.ts", import.meta.url), "utf8");
const { outputText } = ts.transpileModule(source, {
  compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 },
});
const { handleLoanApiRequest } = await import(
  `data:text/javascript;base64,${Buffer.from(outputText).toString("base64")}`
);

for (const mode of ["local", "durable"]) {
  test(`${mode}: approval → bank details → persistent processing`, async () => {
    const database = new DatabaseSync(":memory:");
    for (const migration of ["0000_cool_major_mapleleaf", "0001_icy_echo", "0002_nice_revanche"]) {
      database.exec(readFileSync(new URL(`../drizzle/${migration}.sql`, import.meta.url), "utf8"));
    }
    const files = new Map();
    const env =
      mode === "local"
        ? {}
        : {
            ADMIN_PASSWORD: "test-password",
            DB: {
              prepare(sql) {
                let values = [];
                const statement = database.prepare(sql);
                return {
                  bind(...args) {
                    values = args;
                    return this;
                  },
                  async first() {
                    return statement.get(...values) ?? null;
                  },
                  async all() {
                    return { results: statement.all(...values) };
                  },
                  async run() {
                    return statement.run(...values);
                  },
                };
              },
            },
            FILES: {
              async put(key, body, options) {
                files.set(key, { body, ...options });
              },
              async get(key) {
                return files.get(key) ?? null;
              },
              async delete(key) {
                files.delete(key);
              },
            },
          };
    const origin = mode === "local" ? "http://localhost" : "https://loans.example.com";
    const request = (path, init) =>
      handleLoanApiRequest(new Request(`${origin}${path}`, init), env);
    const answers = {
      loanType: "Personal Loans",
      occupation: "Salaried",
      company: "Example",
      firstName: "Test",
      lastName: "Applicant",
      state: "Delhi",
      city: "New Delhi",
      pincode: "110001",
      gender: "Other",
      dob: "1995-01-01",
      pan: "ABCDE1234F",
      income: "₹20,000-40,000",
      sector: "Private",
      netBanking: "Yes",
    };
    const form = new FormData();
    form.set("answers", JSON.stringify(answers));
    for (const key of ["panDocument", "aadhaarFrontDocument", "aadhaarBackDocument"]) {
      form.set(key, new File(["test document"], "test.png", { type: "image/png" }));
    }
    const created = await request("/api/applications", { method: "POST", body: form });
    assert.equal(created.status, 201);
    const application = await created.json();
    assert.equal(application.status, "pending");
    assert.equal(application.approvedAmount, undefined);
    const path = `/api/applications/${application.id}`;
    const bank = {
      accountHolder: "Test Applicant",
      bankName: "Test Bank",
      accountNumber: "001234567890",
      ifsc: "sbin0001234",
    };
    const submitBank = (details = bank) =>
      request(`${path}/disbursement`, {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify(details),
      });
    assert.equal((await submitBank()).status, 409, "pending applications cannot request funds");
    const approval = new FormData();
    approval.set("approvalTitle", "Your loan plan is approved");
    approval.set("approvedAmount", "20000");
    approval.set("approvalImage", new File(["test image"], "approved.png", { type: "image/png" }));
    const approvePath = `/api/admin/applications/${application.id}/approve`;
    assert.equal((await request(approvePath, { method: "POST", body: approval })).status, 401);
    const login = await request("/api/admin/login", {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({ password: mode === "local" ? "admin123" : "test-password" }),
    });
    const cookie = login.headers.get("set-cookie").split(";")[0];
    const approve = () =>
      request(approvePath, { method: "POST", headers: { cookie }, body: approval });
    for (const amount of ["0", "-100", "1.5", "abc", "100000001"]) {
      approval.set("approvedAmount", amount);
      assert.equal((await approve()).status, 400);
    }
    approval.set("approvedAmount", "20000");
    assert.equal((await approve()).status, 200);
    assert.equal((await (await request(path)).json()).approvedAmount, 20000);
    for (const patch of [
      { accountHolder: " " },
      { bankName: "" },
      { accountNumber: "123" },
      { ifsc: "INVALID" },
    ]) {
      assert.equal((await submitBank({ ...bank, ...patch })).status, 400);
    }
    const submitted = await submitBank();
    assert.equal(submitted.status, 200);
    const processing = await submitted.json();
    assert.equal(processing.disbursementStatus, "processing");
    assert.equal(processing.bankAccountLast4, "7890");
    assert.equal(
      processing.bankDetails,
      undefined,
      "public status must not expose full bank details",
    );
    assert.ok(processing.disbursementSubmittedAt);
    assert.deepEqual(
      await (await request(path)).json(),
      processing,
      "refresh preserves processing",
    );
    assert.deepEqual(
      await (await submitBank({ ...bank, accountNumber: "999999999999" })).json(),
      processing,
      "repeat requests are idempotent",
    );
    assert.equal((await approve()).status, 409, "approval is locked after disbursement submission");
    const adminRows = await (
      await request("/api/admin/applications", { headers: { cookie } })
    ).json();
    const row = adminRows.find((entry) => entry.id === application.id);
    assert.equal(row.bankDetails.accountNumber, bank.accountNumber);
    assert.equal(row.bankDetails.ifsc, "SBIN0001234");
    assert.equal(
      (await request("/api/applications/missing/disbursement", { method: "POST" })).status,
      404,
    );
    database.close();
  });
}

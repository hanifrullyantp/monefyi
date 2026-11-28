import { describe, it } from "node:test";
import assert from "node:assert/strict";
import { NextRequest } from "next/server";
import {
  handleCustomerGet,
  handleCustomerPatch,
  handleProvisionPost,
} from "@/lib/crm/crmApiHandlers";

function makeMockSupabase(options: {
  user?: { id: string; email: string } | null;
  role?: string | null;
  authError?: boolean;
}) {
  return {
    auth: {
      getUser: async (_token: string) => {
        if (options.authError || !options.user) {
          return { data: { user: null }, error: new Error("invalid token") };
        }
        return { data: { user: options.user }, error: null };
      },
      admin: {
        listUsers: async () => ({ data: { users: [] }, error: null }),
        createUser: async () => ({ data: { user: null }, error: null }),
        updateUserById: async () => ({ error: null }),
      },
    },
    from: (_table: string) => ({
      select: (_cols: string) => ({
        eq: (_col: string, _val: string) => ({
          maybeSingle: async () => ({
            data: options.role ? { role: options.role } : null,
            error: null,
          }),
          limit: async () => ({ data: [], error: null }),
        }),
        ilike: () => ({ limit: async () => ({ data: [], error: null }) }),
        contains: () => ({ limit: async () => ({ data: [], error: null }) }),
      }),
      update: () => ({
        eq: async () => ({ error: null }),
        in: async () => ({ error: null }),
        is: async () => ({ error: null }),
      }),
      upsert: async () => ({ error: null }),
    }),
  } as any;
}

describe("CRM Admin Auth & Password Hardening (T1)", () => {
  it("mengembalikan 401 jika request tanpa token Authorization", async () => {
    const supabase = makeMockSupabase({ user: { id: "u1", email: "a@b.com" }, role: "admin" });

    const getRes = await handleCustomerGet(
      new NextRequest("https://froyek.com/api/crm/customer?email=x@y.com"),
      supabase,
    );
    assert.equal(getRes.status, 401);

    const patchRes = await handleCustomerPatch(
      new NextRequest("https://froyek.com/api/crm/customer", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "x@y.com", password: "PasswordAman123!" }),
      }),
      supabase,
    );
    assert.equal(patchRes.status, 401);

    const postRes = await handleProvisionPost(
      new NextRequest("https://froyek.com/api/crm/provision", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email: "x@y.com", password: "PasswordAman123!" }),
      }),
      supabase,
    );
    assert.equal(postRes.status, 401);
  });

  it("mengembalikan 403 untuk user non-admin", async () => {
    const supabase = makeMockSupabase({
      user: { id: "user-biasa", email: "user@example.com" },
      role: "user",
    });
    const headers = {
      Authorization: "Bearer valid-non-admin-token",
      "Content-Type": "application/json",
    };

    const getRes = await handleCustomerGet(
      new NextRequest("https://froyek.com/api/crm/customer?email=x@y.com", { headers }),
      supabase,
    );
    assert.equal(getRes.status, 403);

    const patchRes = await handleCustomerPatch(
      new NextRequest("https://froyek.com/api/crm/customer", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ email: "x@y.com", password: "PasswordAman123!" }),
      }),
      supabase,
    );
    assert.equal(patchRes.status, 403);

    const postRes = await handleProvisionPost(
      new NextRequest("https://froyek.com/api/crm/provision", {
        method: "POST",
        headers,
        body: JSON.stringify({ email: "x@y.com", password: "PasswordAman123!" }),
      }),
      supabase,
    );
    assert.equal(postRes.status, 403);
  });

  it("mengembalikan 400 jika password kosong atau kurang dari 12 karakter", async () => {
    const supabase = makeMockSupabase({
      user: { id: "admin-1", email: "admin@froyek.com" },
      role: "admin",
    });
    const headers = {
      Authorization: "Bearer valid-admin-token",
      "Content-Type": "application/json",
    };

    const patchEmpty = await handleCustomerPatch(
      new NextRequest("https://froyek.com/api/crm/customer", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ email: "x@y.com", password: "" }),
      }),
      supabase,
    );
    assert.equal(patchEmpty.status, 400);

    const patchShort = await handleCustomerPatch(
      new NextRequest("https://froyek.com/api/crm/customer", {
        method: "PATCH",
        headers,
        body: JSON.stringify({ email: "x@y.com", password: "pendek12345" }),
      }),
      supabase,
    );
    assert.equal(patchShort.status, 400);

    const postEmpty = await handleProvisionPost(
      new NextRequest("https://froyek.com/api/crm/provision", {
        method: "POST",
        headers,
        body: JSON.stringify({ email: "x@y.com", password: "" }),
      }),
      supabase,
    );
    assert.equal(postEmpty.status, 400);

    const postShort = await handleProvisionPost(
      new NextRequest("https://froyek.com/api/crm/provision", {
        method: "POST",
        headers,
        body: JSON.stringify({ email: "x@y.com", password: "kurang11chr" }),
      }),
      supabase,
    );
    assert.equal(postShort.status, 400);
  });
});


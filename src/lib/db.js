/**
 * Thin wrappers around Supabase table operations.
 * All tables use a JSONB `data` column to store the full app object,
 * plus a TEXT `id` primary key for targeting updates/deletes.
 */
import { supabase } from './supabase.js';

function rows(res) {
  if (res.error) console.warn('[db]', res.error.message);
  return (res.data || []).map(r => r.data);
}

// Save changes to an EXISTING row. Use this rather than upsert for anything a
// non-admin can do: Postgres applies the INSERT policy (admin-only on assets and
// workstations) to an upsert even when the row already exists, so a non-admin's
// upsert is rejected while a plain UPDATE is allowed. An UPDATE that RLS filters
// out matches zero rows without raising an error, so zero rows counts as failure.
async function updateRow(table, id, patch, notFound) {
  const { data: hit, error } = await supabase.from(table).update(patch).eq('id', id).select('id');
  const msg = error?.message || (!hit?.length ? notFound : null);
  if (msg) console.warn(`[db/${table} update]`, msg);
  return { ok: !msg, error: msg || undefined };
}

export const db = {
  assets: {
    load: async () => rows(await supabase.from('assets').select('data').order('created_at')),
    upsert: async (a) => {
      const { error } = await supabase.from('assets').upsert({ id: a.id, data: a }, { onConflict: 'id' });
      if (error) console.warn('[db/assets upsert]', error.message);
      return { ok: !error, error: error?.message };
    },
    update: (a) => updateRow('assets', a.id, { data: a }, 'Asset not found, or you are not allowed to change it.'),
    delete: async (id) => {
      const { error } = await supabase.from('assets').delete().eq('id', id);
      if (error) console.warn('[db/assets delete]', error.message);
      return { ok: !error, error: error?.message };
    },
    bulkInsert: async (list) => {
      const { error } = await supabase.from('assets').insert(list.map(a => ({ id: a.id, data: a })));
      if (error) console.warn('[db/assets bulkInsert]', error.message);
      return { ok: !error, error: error?.message };
    },
  },

  vendors: {
    load: async () => rows(await supabase.from('vendors').select('data').order('created_at')),
    upsert: async (v) => {
      const { error } = await supabase.from('vendors').upsert({ id: v.id, data: v }, { onConflict: 'id' });
      if (error) console.warn('[db/vendors upsert]', error.message);
    },
    delete: async (id) => {
      const { error } = await supabase.from('vendors').delete().eq('id', id);
      if (error) console.warn('[db/vendors delete]', error.message);
    },
  },

  audits: {
    // report_sent_at / report_recipients are columns written by the
    // send-audit-report Edge Function; they're merged onto each audit object.
    // Falls back to data-only if migration 005 hasn't been run yet.
    load: async () => {
      const res = await supabase.from('audits').select('data, report_sent_at, report_recipients').order('created_at');
      if (res.error) return rows(await supabase.from('audits').select('data').order('created_at'));
      return (res.data || []).map(r => ({ ...r.data, reportSentAt: r.report_sent_at, reportRecipients: r.report_recipients }));
    },
    get: async (id) => {
      const { data, error } = await supabase.from('audits').select('data, report_sent_at, report_recipients').eq('id', id).maybeSingle();
      if (error || !data) { if (error) console.warn('[db/audits get]', error.message); return null; }
      return { ...data.data, reportSentAt: data.report_sent_at, reportRecipients: data.report_recipients };
    },
    upsert: async (a) => {
      const data = { ...a }; // reportSentAt/reportRecipients are column-backed, not part of the JSON
      delete data.reportSentAt; delete data.reportRecipients;
      const { error } = await supabase.from('audits').upsert({ id: a.id, data }, { onConflict: 'id' });
      if (error) console.warn('[db/audits upsert]', error.message);
      return { ok: !error, error: error?.message };
    },
    // Save changes to an EXISTING audit. Use this rather than upsert: Postgres
    // applies the INSERT policy (admin-only) to an upsert even when the row
    // exists, so a non-admin's upsert is rejected while a plain UPDATE is allowed.
    update: async (a) => {
      const data = { ...a };
      delete data.reportSentAt; delete data.reportRecipients;
      const { data: hit, error } = await supabase.from('audits').update({ data }).eq('id', a.id).select('id');
      const msg = error?.message || (!hit?.length ? 'Audit not found, or you are not allowed to change it.' : null);
      if (msg) console.warn('[db/audits update]', msg);
      return { ok: !msg, error: msg || undefined };
    },
    delete: async (id) => {
      const { error } = await supabase.from('audits').delete().eq('id', id);
      if (error) console.warn('[db/audits delete]', error.message);
    },
  },

  auditSignoffs: {
    load: async () => {
      const { data, error } = await supabase.from('audit_signoffs').select('audit_id, profile_id, signed_at').order('signed_at');
      if (error) { console.warn('[db/auditSignoffs load]', error.message); return []; }
      return data || [];
    },
    sign: async (auditId, profileId) => {
      const { error } = await supabase.from('audit_signoffs').insert({ audit_id: auditId, profile_id: profileId });
      if (error) console.warn('[db/auditSignoffs sign]', error.message);
      return { ok: !error, error: error?.message };
    },
  },

  // Emails the signed-off audit's report to all active users (Edge Function).
  sendAuditReport: async (auditId, resend = false) => {
    const { data, error } = await supabase.functions.invoke('send-audit-report', { body: { auditId, resend } });
    if (error) {
      let detail = error.message;
      try { const b = await error.context?.json?.(); detail = b?.message || b?.error || detail; } catch { /* non-JSON body */ }
      console.warn('[db/sendAuditReport]', detail);
      return { ok: false, error: detail };
    }
    return { ok: true, ...data };
  },

  workstations: {
    load: async () => rows(await supabase.from('workstations').select('data').order('created_at')),
    upsert: async (w) => {
      const { error } = await supabase.from('workstations').upsert({ id: w.id, data: w }, { onConflict: 'id' });
      if (error) console.warn('[db/workstations upsert]', error.message);
      return { ok: !error, error: error?.message };
    },
    update: (w) => updateRow('workstations', w.id, { data: w }, 'Workstation not found, or you are not allowed to change it.'),
    delete: async (id) => {
      const { error } = await supabase.from('workstations').delete().eq('id', id);
      if (error) console.warn('[db/workstations delete]', error.message);
    },
  },

  checkouts: {
    load: async () => rows(await supabase.from('checkouts').select('data').order('created_at')),
    insert: async (c, userId) => {
      const { error } = await supabase.from('checkouts').insert({ id: c.id, data: c, user_id: userId });
      if (error) console.warn('[db/checkouts insert]', error.message);
      return { ok: !error, error: error?.message };
    },
    // Only the user who made the checkout (or an admin) may update it.
    update: (c) => updateRow('checkouts', c.id, { data: c }, 'Only the person who checked this out, or an admin, can check it in.'),
  },

  profiles: {
    loadAll: async () => {
      const { data, error } = await supabase.from('profiles').select('*').order('created_at');
      if (error) console.warn('[db/profiles loadAll]', error.message);
      return data || [];
    },
    insert: async (profile) => {
      const { error } = await supabase.from('profiles').insert(profile);
      if (error) console.warn('[db/profiles insert]', error.message);
      return !error;
    },
    update: async (id, patch) => {
      const { error } = await supabase.from('profiles').update(patch).eq('id', id);
      if (error) console.warn('[db/profiles update]', error.message);
      return !error;
    },
    findByAuthId: async (authId) => {
      const { data } = await supabase.from('profiles').select('*').eq('auth_id', authId).maybeSingle();
      return data;
    },
    findByEmail: async (email) => {
      const { data } = await supabase.from('profiles').select('*').eq('email', email.toLowerCase()).maybeSingle();
      return data;
    },
    count: async () => {
      const { count } = await supabase.from('profiles').select('*', { count: 'exact', head: true });
      return count ?? 0;
    },
    // What the DATABASE thinks: calls the is_admin() SQL function for the
    // current session. Returns true/false, or null if it can't be determined
    // (e.g. RPC error) so callers can avoid false alarms.
    dbIsAdmin: async () => {
      const { data, error } = await supabase.rpc('is_admin');
      if (error) { console.warn('[db/profiles dbIsAdmin]', error.message); return null; }
      return data === true;
    },
  },

  sessions: {
    loadAll: async () => {
      const { data, error } = await supabase.from('device_sessions').select('*').order('created_at', { ascending: false });
      if (error) console.warn('[db/sessions loadAll]', error.message);
      return data || [];
    },
    insert: async (s) => {
      const { error } = await supabase.from('device_sessions').insert(s);
      if (error) console.warn('[db/sessions insert]', error.message);
    },
    revoke: async (id) => {
      const { error } = await supabase.from('device_sessions').update({ revoked: true }).eq('id', id);
      if (error) console.warn('[db/sessions revoke]', error.message);
    },
    revokeAllForUser: async (userId) => {
      const { error } = await supabase.from('device_sessions').update({ revoked: true }).eq('user_id', userId);
      if (error) console.warn('[db/sessions revokeAllForUser]', error.message);
    },
    touch: async (id) => {
      await supabase.from('device_sessions').update({ last_active: new Date().toISOString() }).eq('id', id);
    },
  },
};

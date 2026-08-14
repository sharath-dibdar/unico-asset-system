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

export const db = {
  assets: {
    load: async () => rows(await supabase.from('assets').select('data').order('created_at')),
    upsert: async (a) => {
      const { error } = await supabase.from('assets').upsert({ id: a.id, data: a }, { onConflict: 'id' });
      if (error) console.warn('[db/assets upsert]', error.message);
      return { ok: !error, error: error?.message };
    },
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
    load: async () => rows(await supabase.from('audits').select('data').order('created_at')),
    upsert: async (a) => {
      const { error } = await supabase.from('audits').upsert({ id: a.id, data: a }, { onConflict: 'id' });
      if (error) console.warn('[db/audits upsert]', error.message);
    },
    delete: async (id) => {
      const { error } = await supabase.from('audits').delete().eq('id', id);
      if (error) console.warn('[db/audits delete]', error.message);
    },
  },

  workstations: {
    load: async () => rows(await supabase.from('workstations').select('data').order('created_at')),
    upsert: async (w) => {
      const { error } = await supabase.from('workstations').upsert({ id: w.id, data: w }, { onConflict: 'id' });
      if (error) console.warn('[db/workstations upsert]', error.message);
    },
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
    },
    update: async (c) => {
      const { error } = await supabase.from('checkouts').update({ data: c }).eq('id', c.id);
      if (error) console.warn('[db/checkouts update]', error.message);
    },
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

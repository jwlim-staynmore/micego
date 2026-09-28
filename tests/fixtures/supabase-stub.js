/* tests/fixtures/supabase-stub.js -- WP3 (SPEC_LAUNCH.md §8).
 * A fake `supabase.createClient` covering the auth methods assets/mg.js and admin/data-adapter.js
 * actually call: getSession, setSession, signOut, signInWithPassword, verifyOtp.
 * verify_api.py routes the jsdelivr supabase-js URL to this file and drives its behaviour per test
 * by setting `window.__mgStub` (via page.add_init_script) before each page navigation:
 *   window.__mgStub = {
 *     getSession: {data:{session: null|{access_token,refresh_token,user:{app_metadata:{role}}}}},
 *     signInWithPassword: {data:{session:...}, error:null|{message}},  // or a function(args)
 *     verifyOtp: {data:{session:...}, error:null|{message}}           // or a function(args)
 *   }
 * Anything left unset resolves to an empty/error result so a misconfigured test fails loudly
 * instead of silently pretending to be signed in.
 */
(function () {
  "use strict";
  function cfg() { return window.__mgStub || {}; }
  function resolveConfigured(key, args, fallback) {
    var c = cfg()[key];
    if (typeof c === 'function') return Promise.resolve(c(args));
    if (c) return Promise.resolve(c);
    return Promise.resolve(fallback);
  }
  function makeClient() {
    return {
      auth: {
        getSession: function () {
          return resolveConfigured('getSession', null, { data: { session: null }, error: null });
        },
        setSession: function () {
          return Promise.resolve({ data: { session: null }, error: null });
        },
        signOut: function () {
          return Promise.resolve({ error: null });
        },
        signInWithPassword: function (args) {
          return resolveConfigured('signInWithPassword', args, { data: { session: null }, error: { message: 'stub: signInWithPassword not configured for this test' } });
        },
        verifyOtp: function (args) {
          return resolveConfigured('verifyOtp', args, { data: { session: null }, error: { message: 'stub: verifyOtp not configured for this test' } });
        }
      }
    };
  }
  window.supabase = { createClient: function () { return makeClient(); } };
})();

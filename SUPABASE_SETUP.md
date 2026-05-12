# Supabase Setup for Bilal Siraj Travel & Umrah Services Co.

This app now supports Supabase as a remote database backend for app state storage.

## Required Supabase table

Create a table named `app_state` with these columns:

- `id` (text, primary key)
- `payload` (jsonb)
- `updated_at` (timestamp)

## How to configure the app

### Option 1: Use browser localStorage keys

Open the app in the browser or Electron, then run in the developer console:

```js
localStorage.setItem('supabaseUrl', 'https://your-project-id.supabase.co')
localStorage.setItem('supabaseAnonKey', 'your-anon-key')
localStorage.setItem('supabaseStateId', 'main')
```

Then reload the app.

### Option 2: Provide runtime config

If you have a wrapper or preload script, set:

```js
window.SUPABASE_CONFIG = {
  url: 'https://your-project-id.supabase.co',
  anonKey: 'your-anon-key',
  stateId: 'main'
}
```

## What this enables

- The app will continue to save locally using IndexedDB and localStorage.
- If Supabase config is available, it will also load and save the app state to your Supabase table.
- This gives you a remote backup / shared storage option while preserving local persistence.

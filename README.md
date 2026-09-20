# Wishlist v1

A responsive, build-free wishlist for GitHub Pages, with public purchase marking and a separate Supabase-protected admin page. All illustrations are original placeholders, and every example is labeled **Sample item**.

## 1. Try the homepage first

Unzip the project and open `index.html` in your browser. No account, installation, or build is needed for the sample homepage. Choose an item in “Picked something up?”, then confirm. The item remains visible, crossed out and marked purchased. Demo changes persist only in that browser; **Reset demo** restores the samples. Browsers that block local file storage may not save demo purchases; GitHub Pages avoids that limitation.

The admin page deliberately does not accept a demo password. It becomes functional after the setup below. Demo purchases are never imported into the real database.

## 2. Publish the homepage on GitHub Pages

1. Create a GitHub repository, for example `wishlist`. A public repository is the simplest option for Pages on GitHub Free.
2. Upload the **contents** of this project folder to the repository root: `index.html` should be directly beside `README.md`, not nested inside an extra `wishlist` folder. Preserve the `assets` and `supabase` folders. Commit to `main`.
3. In the repository, open **Settings → Pages**. Under **Build and deployment**, choose **Deploy from a branch**; choose **main** and **/ (root)**, then save.
4. Wait for the Pages deployment to finish. Open the address shown there, usually `https://YOUR-USERNAME.github.io/wishlist/`.
5. For your private management entry point, bookmark `https://YOUR-USERNAME.github.io/wishlist/admin.html`. The homepage does not link to it.

Every asset path is relative, so repository subpaths work. There is no build step or server to deploy. Subsequent commits update the site. See [GitHub’s publishing instructions](https://docs.github.com/en/pages/getting-started-with-github-pages/configuring-a-publishing-source-for-your-github-pages-site).

## 3. Connect the shared database

1. Create a **new Supabase project** at [Supabase](https://supabase.com/dashboard). Keep its database password private; the website never uses it.
2. In **SQL Editor**, paste the contents of `supabase/schema.sql` and run it once. The entire script is transactional. It creates the item table, owner allowlist, permissions, and purchase function. It is intended for a new project, not as a migration of an existing wishlist.
3. Optional: run `supabase/seed.sql` for the same three labeled examples. Otherwise, your connected list starts empty. Edit/remove samples through the admin page later.
4. In the project's **Connect** dialog or **Settings → API Keys**, find the project URL and **publishable key**. The legacy **anon** key also works. Never use a secret key (`sb_secret_…`) or `service_role` key.
5. Edit `config.js`:

```js
window.WISHLIST_CONFIG = {
  title: "Henry’s wishlist",
  supabaseUrl: "https://YOUR-PROJECT-REF.supabase.co",
  supabasePublishableKey: "YOUR-PUBLISHABLE-KEY"
};
```

6. Commit the updated `config.js` to GitHub. Open the Pages site again when deployment completes. The demo notice should disappear. If configuration is broken, the page reports an error; it does not quietly fall back to demo data.

The public key is intentionally public. Database policies, not secrecy of that key, protect editing. The sample configuration supports standard `supabase.co` project URLs. If you use a custom Supabase API domain, adjust the URL validation in `shared.js`.

## 4. Create your administrator

1. In Supabase **Authentication → Providers / Sign In**, keep Email sign-in enabled and turn off **Allow new users to sign up**. No public registration is needed.
2. In **Authentication → Users → Add user → Create new user**, create your owner account with your email and a strong, unique password. Use auto-confirm if offered for this owner-created account; otherwise complete the confirmation email.
3. Copy the user's UUID from the Users screen. In SQL Editor, replace the placeholder and run:

```sql
insert into public.wishlist_admins (user_id)
values ('REPLACE-WITH-YOUR-AUTH-USER-UUID');
```

4. Set **Authentication → URL Configuration → Site URL** to your full GitHub Pages address. This v1 uses password sign-in without redirects or email links, but this sets the correct base for future auth emails.
5. Open `admin.html` on your live Pages site and sign in. Add, edit, remove, or reset purchased items. Uncheck **Label as a sample item** on real entries. Lower display-order numbers appear first.

The administrator must be both signed in **and** listed in `wishlist_admins`. A different authenticated user has no editing access. Supabase stores and verifies the password; there is no password in the website files. Sessions live in memory only: reloading/closing the admin tab requires signing in again. Sign out when finished. If you lose the password, use the Supabase project's account-management controls; this v1 does not include an email-reset page.

To revoke an administrator, remove their UUID from `wishlist_admins` in SQL Editor. Do not expose that table through additional policies or API grants.

## 5. Replace the examples

- **Before Supabase:** edit `sample-items.js`. These are only local demo entries.
- **After Supabase:** use `admin.html`. The database is now the source of truth; changing `sample-items.js` has no effect on the live list.
- Pictures: upload your image into the repository's `assets` folder, then use a path such as `assets/my-headset.jpg`; or use a publicly accessible HTTPS image URL. Uploading directly through the admin form is not included.
- Store links: enter one line per place, e.g. `Amazon | https://www.amazon.com/your-product`. Use exact product links, models, colors, and sizes. Samples link to store homepages, not specific products.
- Change the heading in `config.js`; edit the introductory text and browser metadata in `index.html` if desired. Colors and spacing are in `style.css`.

## How purchase tracking works

Visitors can read the list and call one database function that changes only `purchased_at` from empty to the current time. They cannot edit descriptions, remove items, reset purchases, or promote themselves to administrator. Concurrent confirmations are handled by one conditional database update: the first succeeds, the second receives an already-purchased message. Admin content edits do not include purchase status, so they do not overwrite a purchase made during editing.

The purchaser sees the result immediately after saving. Other open homepage tabs refresh every 15 seconds while visible, and when returning to the tab. No Realtime setup is required. This is purchase tracking, not a reservation or checkout system: two people can still independently buy the same product before either marks it purchased.

The public control is intentionally anonymous. Anyone with the website address can mark items purchased, including through the API; this v1 does not verify receipts or prevent malicious false purchase marks. The admin can undo them. For a broadly advertised list, a future version could put CAPTCHA and rate limiting in front of an Edge Function. The “secret” admin URL is a convenience, not the security boundary: database authorization remains in force even if someone discovers the page.

## Verify before sharing

1. At desktop and phone sizes, confirm pictures remain on the left, text wraps, and every link/control is usable.
2. In a signed-out window, mark a sample available item purchased. Confirm the item stays visible with crossed-out text. Open another browser: within 15 seconds it should also show purchased.
3. Try confirming the same item from two browser windows. Only the first should report a new purchase.
4. Sign in as owner; add, edit, delete a test item; reset a purchased sample. Check the public page updates.
5. Sign out and reload `admin.html`; editing should be hidden. A user not in the allowlist must be denied even with a valid account.
6. Run `supabase/security-check.sql` in the SQL Editor for anonymous and authenticated non-owner permission checks. It rolls back its temporary test item and changes.
7. Remove or replace samples, then share the homepage link.

## Files and dependencies

- `index.html`, `style.css`, `script.js`: responsive homepage and confirmation dialog.
- `admin.html`, `admin.js`: owner login and item management.
- `shared.js`: safe DOM rendering, URL checks, database operations, in-memory auth session.
- `config.js`: title and two public Supabase values.
- `sample-items.js`, `assets/`: offline examples and original SVG illustrations.
- `supabase/`: schema, optional seed, rollback-only security checks.
- `.nojekyll`: tells GitHub Pages to serve static files directly.

No build dependencies. Live mode loads the official Supabase JS client pinned to version 2.102.0 from jsDelivr; demo mode does not need it. Google Fonts is optional and system fonts are the fallback. Live mode requires internet access to Supabase and the CDN. No private buyer data is collected, and all wishlist content is public. Item text is rendered using textContent rather than injected HTML, and buy links allow HTTPS only.

Technical references: [Supabase password sign-in](https://supabase.com/docs/reference/javascript/auth-signinwithpassword), [row-level security](https://supabase.com/docs/guides/database/postgres/row-level-security), and [database function security](https://supabase.com/docs/guides/database/functions).

## Validation status

JavaScript syntax checks passed. Browser checks verified the demo purchase confirmation, purchase persistence after reload, reset, sample image loading, and the disabled admin sign-in before configuration. Desktop (1280px) and phone (390px and 320px) layouts were checked for horizontal overflow, with the pictures remaining on the left.

No Supabase project or GitHub deployment was provisioned for you. Live credentials are intentionally blank, and the SQL permission checks are provided for you to run after setup. Follow the verification checklist after connecting your own project; account-backed integration cannot be verified without one.

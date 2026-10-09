# Atoll Cellar

Wine inventory, costing and outlet lists for resorts. It runs in the browser on a computer, tablet or phone, and can be added to the home screen like an app.

- **Your own setup.** Name the resort, create your cellars and outlets, and change them at any time.
- **Outlet lists.** Copy wines from the cellar list to any outlet, or copy one outlet's whole list to another.
- **Outlet prices.** Every wine has a standard price. Any outlet can charge its own price for a wine.
- **Staff logins.** Everyone signs in with their own email. Managers change wines, prices and setup. Staff post sales, counts, losses and transfers.
- **Works offline.** Changes made without a connection are saved when the device is back online. Two people can work at the same time without overwriting each other.

## How it is put together

| Part | What it does |
|---|---|
| `index.html`, `css/`, `js/` | The app. Hosted free on GitHub Pages. |
| `js/config.js` | Where the app finds your database. Empty means "this device only". |
| `supabase/schema.sql` | Creates the database tables and the access rules. |
| Supabase (free plan) | Stores the data and handles sign-in. |

Without Supabase the app still works, but everything stays in one browser and there are no staff logins.

## Step 1. Publish the app on GitHub Pages

1. In this repository, open **Settings → Pages**.
2. Under **Build and deployment**, set **Source** to *Deploy from a branch*, choose the `main` branch and the `/ (root)` folder, then **Save**.
3. After a minute the address appears at the top of that page, for example `https://your-name.github.io/atoll-cellar/`.

## Step 2. Create the database (about 10 minutes)

1. Go to [supabase.com](https://supabase.com), sign in with GitHub and create a **New project**. Pick the region closest to you (for the Maldives, *Mumbai* or *Singapore*). Save the database password somewhere safe.
2. Open **SQL Editor → New query**, paste everything from `supabase/schema.sql`, and press **Run**. It should finish with "Success. No rows returned".
3. Open **Authentication → Sign In / Providers → Email** and switch **Confirm email** off, then save. Staff join with a code from you instead (see Step 3), so they do not need a confirmation email. Supabase's built-in email sender only delivers to members of your Supabase organization, so confirmation emails would never reach your staff.
4. Open **Authentication → URL Configuration**. Set **Site URL** to your GitHub Pages address from Step 1, and add the same address under **Redirect URLs**.
5. Click **Connect** at the top of the project (or open **Project Settings → API Keys**). Copy the **Project URL** and the **publishable key** (it starts with `sb_publishable_`). The older **anon** key works too.
6. Put both into `js/config.js`:

   ```js
   window.ATOLL_CONFIG = {
     supabaseUrl: 'https://abcdefgh.supabase.co',
     supabaseAnonKey: 'sb_publishable_...',
   };
   ```

   The publishable key is meant to be public. It can only do what the rules in `schema.sql` allow, and those rules check every person's role on the server. Never put the **secret** key in the app.

7. Open the app, choose **Create account**, then **Set up a new resort**. If you already set up the app on this device without a login, you can upload that setup instead.

## Step 3. Invite your team

1. In the app, open **Team & access** and invite someone by email as **Manager** or **Staff**.
2. Send them the invitation (**Copy invitation** or **Open in email**). It contains the app link and a six-character join code.
3. They open the link, create an account with the invited email, and type the code. They are in.

| | Manager | Staff |
|---|---|---|
| Daily sales, stock counts, losses, transfers, open bottles | Yes | Yes |
| See stock, outlet lists, prices, reports, guest list, training | Yes | Yes |
| Add or edit wines, prices, outlet lists | Yes | No |
| Reorders and purchase orders | Yes | No |
| Resorts, cellars, outlets, team, settings | Yes | No |

The owner (whoever created the portfolio) cannot be removed.

## Everyday notes

- **Backups.** Settings → *Download a backup* saves everything in one file. Do it at month-end.
- **Forgotten passwords.** Password-reset emails need an email sender. Until you set one up (Supabase → Authentication → Emails → SMTP settings, for example with a Gmail app password), the owner can open Supabase → Authentication → Users, delete that person's login, and invite them again. Their past work stays in the data.
- **Updating the app.** After changing any file, raise the number in the first line of `sw.js` (`atoll-cellar-v1` → `atoll-cellar-v2`) so phones pick up the new version.
- **POS codes.** Each wine can carry its own bottle and glass item numbers from your POS. Daily sales imports match on those.

## Testing locally

Serve the folder with any static web server, for example `python3 -m http.server 8080`, and open `http://localhost:8080`. With `js/config.js` empty it runs in device-only mode. **Explore the demo** loads two sample resorts with 60 days of history.

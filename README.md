# Series 65 Study: deploy to Vercel

1. Install Node 20+ and run: `npm i -g vercel`
2. In this folder, run: `vercel --prod` (log in and accept the defaults; pick the team where you're an Owner/Member).
3. For cross-device sync: in the Vercel dashboard, open the project, go to Storage, create a Blob store (Private), and connect it to the project. Then run `vercel --prod` again.
4. On each device, open the site, go to Sync, and enter the same sync code (8+ characters).

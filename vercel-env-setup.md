# Vercel Environment Variables Setup Guide

## Quick Setup Commands

Run these commands to set your environment variables in Vercel:

```powershell
# Navigate to your project
cd "C:\Users\byred\Desktop\customer outreach"

# Set DATABASE_URL (replace [YOUR-PASSWORD] with your actual Supabase password)
vercel env add DATABASE_URL production

# Set AUTH_SECRET (generate a random string)
vercel env add AUTH_SECRET production

# Set AUTH_URL (will be your Vercel app URL)
vercel env add AUTH_URL production

# Set Twilio credentials
vercel env add TWILIO_ACCOUNT_SID production
vercel env add TWILIO_AUTH_TOKEN production
vercel env add TWILIO_PHONE_NUMBER production
vercel env add TWILIO_WHATSAPP_NUMBER production

# Set public URL
vercel env add NEXT_PUBLIC_APP_URL production
```

After running each command, paste the value when prompted.

## Environment Variable Values

### DATABASE_URL
```
postgresql://postgres:[YOUR-SUPABASE-PASSWORD]@db.nuutfeoibfwrtzlxeliu.supabase.co:5432/postgres
```

### AUTH_SECRET
Generate with: `openssl rand -base64 32`
Or use any random 32+ character string

### AUTH_URL
```
https://your-app-name.vercel.app
```
(You'll get this after first deployment, then update it)

### TWILIO_ACCOUNT_SID
```
(Your Twilio Account SID from .env file)
```

### TWILIO_AUTH_TOKEN
```
(Your Twilio auth token from .env file)
```

### TWILIO_PHONE_NUMBER
```
(Your Twilio phone number from .env file)
```

### TWILIO_WHATSAPP_NUMBER
```
(Your Twilio WhatsApp number from .env file)
```

### NEXT_PUBLIC_APP_URL
```
https://your-app-name.vercel.app
```
(Same as AUTH_URL)

## After Setting Variables

1. Redeploy your app: `vercel --prod`
2. Run database migrations:
   ```powershell
   # Connect to your deployed app
   vercel env pull .env.production
   
   # Run migrations
   npx prisma migrate deploy --schema=./prisma/schema.prisma
   ```

## Updating Twilio Webhooks

Once deployed, update your Twilio webhooks to point to your production URL:

**SMS/WhatsApp Webhook:**
```
https://your-app-name.vercel.app/api/webhooks/twilio
```

**Voice Status Callback:**
```
https://your-app-name.vercel.app/api/webhooks/twilio-voice
```

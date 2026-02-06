# Farcaster Frame Configuration Guide

## 📝 Setup .well-known/farcaster.json

File sudah dibuat di: `public/.well-known/farcaster.json`

### 🔧 Yang perlu diupdate sebelum deploy:

#### 1. **Domain URLs**
Ganti semua `https://your-domain.com` dengan domain production:
```json
"homeUrl": "https://basekaget.vercel.app",
"imageUrl": "https://basekaget.vercel.app/preview.png",
"webhookUrl": "https://basekaget.vercel.app/api/webhook"
```

#### 2. **Account Association** (Opsional - untuk verified frames)
Ini untuk link frame dengan Farcaster account. Kalau belum perlu, bisa hapus section `accountAssociation`.

Untuk generate accountAssociation:
- Butuh FID (Farcaster ID) owner
- Butuh custody/verified address
- Sign dengan private key Farcaster account

**Untuk sekarang, bisa pakai versi simplified:**

```json
{
  "frame": {
    "version": "1",
    "name": "Base Kaget",
    "iconUrl": "https://basekaget.vercel.app/icon.png",
    "homeUrl": "https://basekaget.vercel.app",
    "imageUrl": "https://basekaget.vercel.app/og-image.png",
    "buttonTitle": "Open Kaget",
    "splashImageUrl": "https://basekaget.vercel.app/splash.png",
    "splashBackgroundColor": "#0B0C10"
  }
}
```

#### 3. **Images yang perlu dibuat:**
- `public/icon.png` - Icon app (512x512px)
- `public/og-image.png` - Preview image (1200x630px)
- `public/splash.png` - Splash screen (1080x1920px)

### 🚀 Deploy & Test

Setelah deploy, cek di:
```
https://your-domain.com/.well-known/farcaster.json
```

Harus return JSON dengan proper CORS headers.

### 📱 Next.js Configuration

Pastikan Next.js serve static files dari `public/`:
- File di `public/.well-known/farcaster.json` 
- Akan accessible di `/.well-known/farcaster.json`
- Next.js sudah handle ini by default ✅

### 🔗 Register Frame di Farcaster

1. Go to Warpcast atau Frame developer tools
2. Submit frame URL
3. Vercel akan automatically serve `.well-known` files

### ✅ Checklist
- [ ] Update domain URLs di farcaster.json
- [ ] Buat icon.png (512x512)
- [ ] Buat og-image.png (1200x630) 
- [ ] Buat splash.png (optional)
- [ ] Test: curl https://your-domain/.well-known/farcaster.json
- [ ] Submit to Warpcast directory (optional)


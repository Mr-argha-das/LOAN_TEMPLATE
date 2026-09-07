# VPS par Site Live Karne ki Guide (Hindi)

> Problem kya thi: ye project Cloudflare (D1 database + R2 files) ke liye bana tha.
> Aapki VPS par wo dono nahi hain, isliye `/admin` ka Sign in button kaam nahi kar raha tha.
>
> Fix: `vps-server.mjs` naam ka naya server banaya gaya hai jo VPS par hi chalta hai —
> database (SQLite file) aur uploaded files (folder) sab VPS par save hote hain.
> Neeche diye steps follow karo, admin panel chalne lagega.

---

## Step 0 — Cheezein jo chahiye

- VPS jisme **Ubuntu** ho aur aapke paas **root/SSH access** ho
- Domain (`loan.sridevimatka9.live`) VPS ke IP par point ho (ye pehle se hai)
- **Node.js 22** ya naya (neeche install command di hai)

---

## Step 1 — VPS par Node.js 22 install karo

VPS me SSH karke ye commands chalao:

```bash
curl -fsSL https://deb.nodesource.com/setup_22.x | sudo -E bash -
sudo apt install -y nodejs
node --version   # v22.x.x dikhna chahiye
```

---

## Step 2 — Project ka code VPS par lao

Option A — Git se (best):

```bash
cd /var/www
sudo git clone <aapke-repo-ka-URL> loan-site
cd loan-site
```

Option B — Is computer se zip upload karke `/var/www/loan-site` me extract karo.
(Zip me `node_modules`, `.output`, `vps-data` folder mat dalo — zaroorat nahi.)

---

## Step 3 — Install + Build

```bash
cd /var/www/loan-site
npm install
npm run build
```

`npm run build` ke baad `.output/` folder banna chahiye. Check:

```bash
ls .output/server/index.mjs .output/public
```

---

## Step 4 — Admin password set karo (`.env` file)

```bash
nano .env
```

Usme ye 2 line likho (password apni marzi ka mazboot rakho):

```
ADMIN_PASSWORD=ApnaMazbootPassword123
PORT=3000
```

Save: `Ctrl+O`, `Enter`, phir `Ctrl+X`.

> **Yehi password `/admin` page par lagega.** `admin123` sirf localhost par chalta hai,
> live site par hamesha `.env` wala password chalega.

Test karo:

```bash
ADMIN_PASSWORD=ApnaMazbootPassword123 PORT=3000 node ./vps-server.mjs
```

`Loan app chal rahi hai (VPS production server)` dikhe to `Ctrl+C` dabakar band karo.
Test sahi hai — ab isko hamesha chalne ke liye PM2 me dalenge.

---

## Step 5 — PM2 se server hamesha ON rakho

```bash
sudo npm install -g pm2
pm2 start ./vps-server.mjs --name loan-site
pm2 save
pm2 startup   # jo command print ho, usko copy karke ek baar chalao
```

Check:

```bash
pm2 status        # loan-site "online" dikhna chahiye
pm2 logs loan-site --lines 20
```

---

## Step 6 — Domain (Nginx) ko Node server se jodo

Purana setup (jo bhi domain par chal raha tha) hatao/band karo, phir:

```bash
sudo apt install -y nginx certbot python3-certbot-nginx
sudo nano /etc/nginx/sites-available/loan-site
```

Usme ye likho:

```nginx
server {
    server_name loan.sridevimatka9.live;

    client_max_body_size 20M;

    location / {
        proxy_pass http://127.0.0.1:3000;
        proxy_http_version 1.1;
        proxy_set_header Host $host;
        proxy_set_header X-Real-IP $remote_addr;
        proxy_set_header X-Forwarded-For $proxy_add_x_forwarded_for;
        proxy_set_header X-Forwarded-Proto $scheme;
    }
}
```

Phir:

```bash
sudo ln -s /etc/nginx/sites-available/loan-site /etc/nginx/sites-enabled/loan-site
sudo nginx -t
sudo systemctl reload nginx
sudo certbot --nginx -d loan.sridevimatka9.live
```

Ho gaya! Ab kholo:

- Site: `https://loan.sridevimatka9.live/`
- Admin: `https://loan.sridevimatka9.live/admin` (+ `.env` wala password)

---

## Step 7 — Baad me code update karna ho to

```bash
cd /var/www/loan-site
git pull            # ya nayi zip extract karo
npm install
npm run build
pm2 restart loan-site
```

> `vps-data/` folder me database + files hain — update ke time usko **mat delete karo**,
> warna purane applications ud jayenge.

---

## Data kahan save hota hai?

| Cheez           | Jagah                          |
| --------------- | ------------------------------ |
| Database        | `vps-data/app.db` (SQLite)     |
| Uploaded files  | `vps-data/files/`              |
| Admin password  | `.env` file (`ADMIN_PASSWORD`) |

Backup lena ho to bas `vps-data/` folder copy kar lo.

---

## Dikkat aaye to

```bash
pm2 logs loan-site --lines 50   # error yahan dikhega
pm2 restart loan-site           # restart
ls -la vps-data/                # data ban raha hai ya nahi
node --version                  # v22+ hona chahiye
```

Common mistakes:

1. `ADMIN_PASSWORD set nahi hai!` → `.env` file project folder me nahi hai. Step 4 dobara karo.
2. `production build nahi mila` → `npm run build` chalana bhool gaye.
3. Purana site abhi bhi dikh raha hai → purana process/container band karo, Nginx `proxy_pass` check karo.

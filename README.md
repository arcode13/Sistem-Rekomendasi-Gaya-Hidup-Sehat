# Open Notebook - Health Edition

**Fork dari [Open Notebook](https://github.com/lfnovo/open-notebook) dengan Sistem Rekomendasi Gaya Hidup Sehat**

Open Notebook adalah implementasi open source dari research assistant yang terinspirasi dari Google Notebook LM. Versi ini telah dikembangkan dengan fitur tambahan **Sistem Rekomendasi Gaya Hidup Sehat** yang memungkinkan analisis kesehatan dan rekomendasi personal berbasis AI.

> **Catatan**: Repository ini adalah fork/customisasi dari [open-notebook](https://github.com/lfnovo/open-notebook) oleh [lfnovo](https://github.com/lfnovo). Semua kredit untuk proyek asli diberikan kepada pengembang original.

## 📋 Daftar Isi

- [Tentang Proyek](#tentang-proyek)
- [Fitur Utama](#fitur-utama)
- [Fitur Kesehatan](#fitur-kesehatan)
- [Persyaratan Sistem](#persyaratan-sistem)
- [Instalasi](#instalasi)
- [Konfigurasi](#konfigurasi)
- [Cara Menjalankan](#cara-menjalankan)
- [Struktur Proyek](#struktur-proyek)
- [Troubleshooting](#troubleshooting)
- [Kontribusi](#kontribusi)
- [Lisensi](#lisensi)

## 📖 Tentang Proyek

Proyek ini merupakan fork dari [Open Notebook](https://github.com/lfnovo/open-notebook) yang telah diintegrasikan dengan **Sistem Rekomendasi Gaya Hidup Sehat**. Fitur tambahan ini memungkinkan:

- **Prediksi Risiko Kesehatan**: Analisis risiko penyakit kardiovaskular menggunakan model Machine Learning (XGBoost)
- **Rekomendasi Personal**: Rekomendasi gaya hidup sehat yang dipersonalisasi berdasarkan data kesehatan pengguna
- **Chat Kesehatan**: Konsultasi kesehatan berbasis AI dengan grounding ke dokumen medis
- **Pemeriksaan Kesehatan**: Sistem untuk menyimpan dan melacak riwayat pemeriksaan kesehatan

## ✨ Fitur Utama

### Fitur Open Notebook (Original)
- 📚 **Notebook Management**: Buat dan kelola notebook untuk berbagai topik penelitian
- 📄 **Source Management**: Tambahkan sumber data dari berbagai format (PDF, teks, URL, dll)
- 💬 **AI Chat**: Berinteraksi dengan konten menggunakan AI untuk mendapatkan insights
- 🔍 **Semantic Search**: Cari konten menggunakan pencarian semantik yang canggih
- 🔄 **Transformations**: Transformasi konten dengan berbagai metode AI
- 🎯 **Multi-Model Support**: Dukungan untuk berbagai provider AI (OpenAI, Anthropic, Google, Ollama, dll)
- 🔐 **Privacy-Focused**: Data Anda tetap di server Anda sendiri
- 🌐 **Modern UI**: Antarmuka web yang modern dan responsif

### 🏥 Fitur Kesehatan (Tambahan)

- 🩺 **Health Risk Prediction**: Prediksi risiko penyakit kardiovaskular menggunakan model XGBoost yang telah dilatih
- 📊 **BMI & Health Metrics**: Perhitungan otomatis BMI, kategori tekanan darah, dan analisis faktor risiko
- 💡 **AI-Powered Recommendations**: Rekomendasi gaya hidup sehat yang dipersonalisasi menggunakan AI dengan grounding ke dokumen medis
- 💬 **Health Chat**: Chat khusus untuk konsultasi kesehatan dengan konteks dari notebook kesehatan
- 📝 **Health Examination History**: Simpan dan kelola riwayat pemeriksaan kesehatan
- 📚 **Medical Document Integration**: Integrasi dengan dokumen medis untuk rekomendasi yang lebih akurat dan terpercaya
- 🎯 **Risk Level Classification**: Klasifikasi tingkat risiko (Rendah, Sedang, Tinggi) dengan probabilitas penyakit
- 🔒 **Privacy-First Health Data**: Data kesehatan Anda tetap aman dan tidak dibagikan ke pihak ketiga

## 🏥 Fitur Kesehatan Detail

### 1. Health Risk Prediction
Sistem menggunakan model Machine Learning (XGBoost) yang telah dilatih untuk memprediksi risiko penyakit kardiovaskular berdasarkan:
- **Data Dasar** (Wajib):
  - Usia
  - Jenis kelamin
  - Tinggi badan (cm)
  - Berat badan (kg)
  - Tekanan darah sistolik
  - Tekanan darah diastolik

- **Data Tambahan** (Opsional):
  - Kadar kolesterol
  - Kadar glukosa
  - Kebiasaan merokok
  - Konsumsi alkohol
  - Aktivitas fisik

### 2. AI-Powered Health Recommendations
Sistem menghasilkan rekomendasi gaya hidup sehat yang:
- **Dipersonalisasi**: Disesuaikan dengan profil kesehatan dan faktor risiko pengguna
- **Grounded**: Berdasarkan dokumen medis yang tersedia di notebook (tidak menggunakan pengetahuan umum)
- **Terstruktur**: Disajikan dalam format yang mudah dipahami untuk berbagai tingkat pendidikan
- **Terpercaya**: Setiap klaim spesifik dilengkapi dengan citation ke sumber dokumen

### 3. Health Chat
Fitur chat khusus untuk konsultasi kesehatan yang:
- Menggunakan konteks dari notebook kesehatan
- Menyimpan riwayat percakapan
- Mendukung multiple chat sessions
- Terintegrasi dengan hasil pemeriksaan kesehatan

### 4. Cara Menggunakan Fitur Kesehatan

1. **Akses Halaman Kesehatan**: Buka `/health` di aplikasi
2. **Isi Data Pemeriksaan**: Masukkan data kesehatan Anda
3. **Dapatkan Prediksi**: Sistem akan menghitung risiko dan memberikan klasifikasi
4. **Lihat Rekomendasi**: Dapatkan rekomendasi gaya hidup sehat yang dipersonalisasi
5. **Chat Kesehatan**: Ajukan pertanyaan lanjutan tentang kesehatan Anda

### 5. Model Machine Learning

Sistem menggunakan model XGBoost yang telah dilatih untuk prediksi risiko penyakit kardiovaskular. Model ini:
- Menggunakan 14 fitur (termasuk BMI, pulse pressure, risk factors)
- Menghasilkan probabilitas risiko penyakit
- Mengklasifikasikan tingkat risiko (Low, Medium, High)
- File model tersimpan di folder `models/`:
  - `xgboost_model.pkl` - Model XGBoost
  - `scaler.pkl` - Scaler untuk normalisasi data
  - `feature_names.pkl` - Nama fitur yang digunakan

> **⚠️ PENTING**: Fitur kesehatan ini bersifat **edukatif** dan **tidak menggantikan konsultasi medis profesional**. Selalu konsultasikan dengan dokter untuk diagnosis dan pengobatan yang tepat.

## 💻 Persyaratan Sistem

### Hardware Requirements

- **CPU**: Minimal 2 core (4+ core direkomendasikan untuk performa lebih baik)
- **RAM**: Minimal 4GB (8GB+ sangat direkomendasikan)
- **Storage**: Minimal 10GB ruang kosong
- **Network**: Koneksi internet yang stabil untuk akses ke model AI

### Software Requirements

#### Untuk Instalasi Docker (Direkomendasikan)
- **Docker**: Versi terbaru (20.10+)
- **Docker Compose**: Versi 2.0+ (biasanya sudah termasuk dengan Docker Desktop)

#### Untuk Instalasi dari Source
- **Python**: 3.11 atau 3.12 (tidak mendukung 3.13+)
- **Node.js**: 20.x LTS atau lebih baru
- **uv**: Python package manager (akan diinstal otomatis)
- **Git**: Untuk clone repository

### Operating System Support

- ✅ **Windows**: Windows 10 atau lebih baru (WSL2 direkomendasikan)
- ✅ **macOS**: macOS 10.15 (Catalina) atau lebih baru
- ✅ **Linux**: Ubuntu 18.04+, Debian 9+, CentOS 7+, Fedora 30+

## 🚀 Instalasi

### Metode 1: Docker (Paling Mudah - Direkomendasikan)

Metode ini cocok untuk pengguna yang ingin setup cepat tanpa menginstal banyak dependencies.

#### Single Container (Untuk Pengguna Personal)

1. **Clone Repository**
```bash
git clone https://github.com/lfnovo/open-notebook.git
cd open-notebook
```

2. **Buat File Konfigurasi**
```bash
# Copy file docker.env (atau buat dari template)
cp docker.env.example docker.env
```

3. **Edit File docker.env**
Buka file `docker.env` dan tambahkan API key AI provider Anda (minimal satu provider diperlukan):
```env
# Minimal satu provider AI harus dikonfigurasi
OPENAI_API_KEY=sk-your-openai-key-here

# Atau provider lain:
# GOOGLE_API_KEY=your-google-key
# ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
# OLLAMA_API_BASE=http://localhost:11434
```

4. **Jalankan dengan Docker Compose**
```bash
# Menggunakan single container
docker compose -f docker-compose.single.yml up -d

# Atau menggunakan multi-container (untuk production)
docker compose up -d
```

5. **Akses Aplikasi**
- Frontend: http://localhost:8502
- API: http://localhost:5055
- API Documentation: http://localhost:5055/docs

#### Multi-Container (Untuk Production)

```bash
# Start semua services
docker compose up -d

# Cek status services
docker compose ps

# Lihat logs
docker compose logs -f

# Stop services
docker compose down
```

### Metode 2: Instalasi dari Source (Untuk Developer)

Metode ini cocok untuk developer yang ingin berkontribusi atau melakukan kustomisasi.

#### Langkah 1: Install Prerequisites

**Windows (dengan WSL2):**
```bash
# Install WSL2 dan Ubuntu
wsl --install

# Di dalam WSL2, install dependencies
sudo apt update
sudo apt install -y python3.11 python3-pip git curl
curl -LsSf https://astral.sh/uv/install.sh | sh
```

**macOS:**
```bash
# Install Homebrew (jika belum ada)
/bin/bash -c "$(curl -fsSL https://raw.githubusercontent.com/Homebrew/install/HEAD/install.sh)"

# Install dependencies
brew install python@3.11 node@20 git
brew install uv
```

**Linux (Ubuntu/Debian):**
```bash
sudo apt update
sudo apt install -y python3.11 python3-pip git curl build-essential
curl -LsSf https://astral.sh/uv/install.sh | sh
source ~/.bashrc
```

#### Langkah 2: Clone dan Setup Repository

```bash
# Clone repository
git clone https://github.com/lfnovo/open-notebook.git
cd open-notebook

# Install Python dependencies menggunakan uv
uv sync

# Install frontend dependencies
cd frontend
npm install
cd ..
```

#### Langkah 3: Setup Database

```bash
# Start SurrealDB menggunakan Docker
docker compose up -d surrealdb

# Atau install SurrealDB secara lokal
curl -sSf https://install.surrealdb.com | sh
surreal start --log trace --user root --pass root memory
```

#### Langkah 4: Konfigurasi Environment

```bash
# Copy file environment template
cp .env.example .env

# Edit file .env dengan API keys Anda
nano .env  # atau gunakan editor favorit Anda
```

Tambahkan minimal satu AI provider:
```env
# Database Configuration
SURREAL_URL=ws://localhost:8000/rpc
SURREAL_USER=root
SURREAL_PASSWORD=root
SURREAL_NAMESPACE=open_notebook
SURREAL_DATABASE=development

# Minimal satu AI provider (pilih salah satu atau lebih)
OPENAI_API_KEY=sk-your-openai-key-here
# GOOGLE_API_KEY=your-google-key
# ANTHROPIC_API_KEY=sk-ant-your-anthropic-key
# OLLAMA_API_BASE=http://localhost:11434
```

#### Langkah 5: Jalankan Aplikasi

**Opsi A: Menggunakan Make (Paling Mudah)**
```bash
# Start semua services sekaligus
make start-all
```

Ini akan menjalankan:
- SurrealDB (port 8000)
- FastAPI Backend (port 5055)
- Background Worker
- Next.js Frontend (port 8502)

**Opsi B: Manual (Untuk Debugging)**
```bash
# Terminal 1: Start database
make database

# Terminal 2: Start API
make api

# Terminal 3: Start worker
make worker

# Terminal 4: Start frontend
cd frontend && npm run dev
```

## ⚙️ Konfigurasi

### Konfigurasi AI Provider

Open Notebook mendukung berbagai AI provider. Anda perlu mengonfigurasi minimal satu provider.

#### OpenAI (Direkomendasikan untuk Pemula)
```env
OPENAI_API_KEY=sk-your-openai-key-here
```
**Cara mendapatkan API key:**
1. Kunjungi https://platform.openai.com/
2. Buat akun dan navigasi ke **API Keys**
3. Klik **"Create new secret key"**
4. Tambahkan minimal $5 credit
5. Copy key ke file `.env` atau `docker.env`

#### Google (Gemini)
```env
GOOGLE_API_KEY=your-google-key-here
GEMINI_MODEL=gemini-2.5-flash
```
**Cara mendapatkan API key:**
1. Kunjungi https://makersuite.google.com/app/apikey
2. Buat API key baru
3. Copy ke file environment

#### Anthropic (Claude)
```env
ANTHROPIC_API_KEY=sk-ant-your-anthropic-key-here
```
**Cara mendapatkan API key:**
1. Kunjungi https://console.anthropic.com/
2. Buat akun dan navigasi ke **API Keys**
3. Generate key baru
4. Copy ke file environment

#### Ollama (Local AI - Gratis)
```env
OLLAMA_API_BASE=http://localhost:11434
```
**Setup Ollama:**
1. Install Ollama: https://ollama.ai/
2. Download model: `ollama pull llama3`
3. Set `OLLAMA_API_BASE` di environment file

#### Provider Lainnya
Open Notebook juga mendukung:
- DeepSeek (`DEEPSEEK_API_KEY`)
- Mistral (`MISTRAL_API_KEY`)
- Groq (`GROQ_API_KEY`)
- xAI/Grok (`XAI_API_KEY`)
- Azure OpenAI
- OpenRouter
- Dan banyak lagi...

### Konfigurasi Database

```env
# SurrealDB Configuration
SURREAL_URL=ws://localhost:8000/rpc
SURREAL_USER=root
SURREAL_PASSWORD=root
SURREAL_NAMESPACE=open_notebook
SURREAL_DATABASE=production
```

### Konfigurasi API URL

```env
# URL dimana API dapat diakses oleh browser
API_URL=http://localhost:5055

# URL frontend
FRONTEND_URL=http://localhost:8502
```

Untuk deployment dengan reverse proxy:
```env
API_URL=https://your-domain.com
# atau
API_URL=https://api.your-domain.com
```

### Konfigurasi Keamanan (Opsional)

Untuk deployment publik, aktifkan password protection:
```env
OPEN_NOTEBOOK_PASSWORD=your_secure_password_here
```

## 🎮 Cara Menjalankan

### Docker

```bash
# Start services
docker compose up -d

# Lihat logs
docker compose logs -f

# Stop services
docker compose down

# Restart services
docker compose restart

# Update ke versi terbaru
docker compose pull
docker compose up -d
```

### Source Installation

```bash
# Start semua services
make start-all

# Stop semua services
make stop-all

# Cek status services
make status

# Start individual services
make database  # Start database saja
make api       # Start API saja
make worker    # Start worker saja
make frontend  # Start frontend saja
```

### Akses Aplikasi

Setelah semua services berjalan:
- **Frontend**: http://localhost:8502
- **Health Page**: http://localhost:8502/health (Fitur Kesehatan)
- **API**: http://localhost:5055
- **API Documentation**: http://localhost:5055/docs
- **Health API**: http://localhost:5055/api/health/* (Endpoints kesehatan)
- **Database**: http://localhost:8000 (SurrealDB)

## 📁 Struktur Proyek

```
open-notebook/
├── api/                    # FastAPI backend
│   ├── routers/           # API routes
│   │   └── health.py     # Health API endpoints (NEW)
│   ├── health_service.py  # Health prediction service (NEW)
│   ├── main.py           # API entry point
│   └── ...
├── frontend/              # Next.js frontend
│   ├── src/              # React components
│   │   └── app/
│   │       └── health/   # Health page components (NEW)
│   ├── public/           # Static assets
│   └── package.json
├── open_notebook/         # Core application logic
│   ├── domain/           # Business logic
│   │   └── health.py     # Health domain models (NEW)
│   ├── database/         # Database layer
│   └── ...
├── commands/              # Background worker commands
├── models/                # ML models (XGBoost untuk kesehatan)
│   ├── xgboost_model.pkl  # Health prediction model (NEW)
│   ├── scaler.pkl         # Data scaler (NEW)
│   └── feature_names.pkl  # Feature names (NEW)
├── prompts/               # AI prompt templates
│   ├── health_recommendation_system.jinja  # Health system prompt (NEW)
│   ├── health_recommendation_user.jinja    # Health user prompt (NEW)
│   └── health_chat_system.jinja            # Health chat prompt (NEW)
├── migrations/            # Database migrations
├── data/                  # Data files
├── notebook_data/          # User data (uploads, cache)
├── rekomendasi_kesehatan.py  # Health recommendation script (NEW)
├── docker-compose.yml     # Multi-container setup
├── docker-compose.single.yml  # Single container setup
├── Dockerfile             # Production Docker image
├── Dockerfile.single      # Single container Docker image
├── docker.env             # Environment variables untuk Docker
├── pyproject.toml         # Python dependencies
├── Makefile              # Build commands
└── README.md             # File ini
```

## 🔧 Troubleshooting

### Port Sudah Digunakan

**Error**: `Port 8502 is already in use`

**Solusi**:
```bash
# Cari process yang menggunakan port
# Windows
netstat -ano | findstr :8502

# Linux/macOS
lsof -i :8502

# Kill process
# Windows
taskkill /PID <PID> /F

# Linux/macOS
kill -9 <PID>
```

### Database Connection Failed

**Error**: `Cannot connect to SurrealDB`

**Solusi**:
```bash
# Cek apakah SurrealDB running
docker compose ps surrealdb

# Lihat logs database
docker compose logs surrealdb

# Restart database
docker compose restart surrealdb

# Atau start ulang
docker compose up -d surrealdb
```

### API Key Tidak Valid

**Error**: `Invalid API key` atau `Authentication failed`

**Solusi**:
1. Pastikan API key sudah benar di file `.env` atau `docker.env`
2. Untuk Docker, pastikan file `docker.env` ada dan di-mount dengan benar
3. Restart container setelah mengubah environment variables:
   ```bash
   docker compose down
   docker compose up -d
   ```
4. Verifikasi API key di dashboard provider (pastikan ada credit/billing)

### Worker Tidak Memproses Jobs

**Solusi**:
```bash
# Cek status worker
make status

# Restart worker
make worker-restart

# Atau untuk Docker
docker compose restart open_notebook
```

### Out of Memory

**Error**: `Out of memory` atau aplikasi lambat

**Solusi**:
1. **Docker Desktop**: 
   - Settings → Resources → Increase memory limit ke 4GB+
2. **Linux**: 
   - Tambahkan swap space
   - Atau upgrade RAM
3. **Gunakan model yang lebih kecil**:
   - Gunakan `gpt-3.5-turbo` daripada `gpt-4`
   - Atau gunakan Ollama dengan model kecil

### Permission Denied (Docker)

**Error**: `Permission denied` saat mengakses Docker

**Solusi**:
```bash
# Linux: Tambahkan user ke docker group
sudo usermod -aG docker $USER
# Logout dan login kembali

# Windows: Pastikan Docker Desktop running dan user punya akses
```

### Python/uv Installation Issues

**Error**: `uv: command not found`

**Solusi**:
```bash
# Install uv
curl -LsSf https://astral.sh/uv/install.sh | sh

# Reload shell
source ~/.bashrc  # atau ~/.zshrc
```

**Error**: `Python version conflict`

**Solusi**:
```bash
# Install Python 3.11 menggunakan uv
uv python install 3.11
uv python pin 3.11
```

### Frontend Build Errors

**Error**: `npm install` gagal atau build error

**Solusi**:
```bash
# Clear cache dan reinstall
cd frontend
rm -rf node_modules package-lock.json
npm install

# Atau gunakan npm ci
npm ci
```

## 📊 Monitoring dan Maintenance

### Cek Status Services

```bash
# Docker
docker compose ps

# Source installation
make status
```

### Lihat Logs

```bash
# Semua services (Docker)
docker compose logs -f

# Service tertentu
docker compose logs -f open_notebook
docker compose logs -f surrealdb

# Source installation - cek process logs
tail -f logs/*.log
```

### Backup Data

```bash
# Backup database
docker compose exec surrealdb surreal export --conn ws://localhost:8000 --user root --pass root --ns open_notebook --db production backup.surql

# Backup notebook data
tar -czf notebook_backup.tar.gz notebook_data/
```

### Update Aplikasi

```bash
# Docker
docker compose pull
docker compose up -d

# Source
git pull
uv sync
cd frontend && npm install
make stop-all
make start-all
```

## 🤝 Kontribusi

Kontribusi sangat diterima! Silakan:

1. Fork repository
2. Buat feature branch (`git checkout -b feature/AmazingFeature`)
3. Commit perubahan (`git commit -m 'Add some AmazingFeature'`)
4. Push ke branch (`git push origin feature/AmazingFeature`)
5. Buat Pull Request

### Development Setup

Lihat [docs/development/](docs/development/) untuk panduan development lengkap.

## 📝 Lisensi

Proyek ini menggunakan lisensi MIT. Lihat file [LICENSE](LICENSE) untuk detail lengkap.

## 🔗 Link Penting

### Repository Asli
- **Open Notebook Original**: https://github.com/lfnovo/open-notebook
- **Original Documentation**: Lihat folder `docs/` untuk dokumentasi lengkap
- **Original Issues**: https://github.com/lfnovo/open-notebook/issues
- **Discord Community**: https://discord.gg/37XJPXfz2w

### Kredit
Proyek ini adalah fork dari [Open Notebook](https://github.com/lfnovo/open-notebook) oleh [Luis Novo](https://github.com/lfnovo). Semua kredit untuk proyek asli diberikan kepada pengembang original.

Fitur tambahan **Sistem Rekomendasi Gaya Hidup Sehat** dikembangkan sebagai customisasi untuk kebutuhan spesifik.

## 💡 Tips dan Best Practices

### Tips Umum Open Notebook
1. **Gunakan Model yang Sesuai**: Untuk penggunaan personal, `gpt-3.5-turbo` atau `gemini-2.5-flash` sudah cukup. Untuk tugas kompleks, gunakan `gpt-4` atau `claude-3.5-sonnet`.

2. **Monitor API Usage**: Pantau penggunaan API key Anda di dashboard provider untuk menghindari biaya tak terduga.

3. **Backup Regular**: Lakukan backup database secara berkala, terutama untuk data penting.

4. **Gunakan Ollama untuk Development**: Untuk testing dan development, gunakan Ollama dengan model lokal untuk menghemat biaya API.

5. **Optimize Storage**: Hapus notebook dan source yang tidak digunakan untuk menghemat storage.

6. **Security**: Untuk deployment publik, selalu aktifkan password protection dan gunakan HTTPS dengan reverse proxy.

### Tips Fitur Kesehatan
1. **Siapkan Dokumen Medis**: Untuk rekomendasi yang lebih akurat, tambahkan dokumen medis (PDF, artikel kesehatan) ke notebook kesehatan Anda.

2. **Update Data Secara Berkala**: Lakukan pemeriksaan kesehatan secara berkala dan update data untuk mendapatkan rekomendasi yang relevan.

3. **Gunakan Health Chat**: Manfaatkan fitur Health Chat untuk pertanyaan lanjutan tentang rekomendasi yang diberikan.

4. **Konsultasi dengan Dokter**: Ingat bahwa sistem ini bersifat edukatif. Selalu konsultasikan dengan dokter untuk diagnosis dan pengobatan yang tepat.

5. **Privacy**: Data kesehatan Anda disimpan secara lokal dan tidak dibagikan ke pihak ketiga. Pastikan backup data kesehatan Anda secara berkala.

## 🆘 Mendapatkan Bantuan

Jika Anda mengalami masalah:

1. **Cek Dokumentasi**: Lihat folder `docs/` untuk panduan lengkap
2. **Cek Issues**: Cari di GitHub Issues apakah masalah Anda sudah pernah dilaporkan
3. **Buat Issue Baru**: Jika masalah belum ada, buat issue baru dengan detail lengkap
4. **Join Discord**: Bergabung dengan komunitas Discord untuk bantuan real-time

---

## ⚠️ Disclaimer Kesehatan

**PENTING**: Fitur kesehatan dalam aplikasi ini bersifat **edukatif** dan **informasional** semata. 

- ❌ **BUKAN** pengganti konsultasi medis profesional
- ❌ **BUKAN** diagnosis medis
- ❌ **BUKAN** saran pengobatan

✅ **SELALU** konsultasikan dengan dokter atau tenaga kesehatan profesional untuk:
- Diagnosis penyakit
- Pengobatan medis
- Saran kesehatan yang spesifik untuk kondisi Anda

Pengembang tidak bertanggung jawab atas keputusan medis yang diambil berdasarkan informasi dari aplikasi ini.

---

**Selamat menggunakan Open Notebook - Health Edition! 🚀🏥**

Jika Anda menemukan bug atau memiliki saran, silakan buat issue di GitHub atau kontribusi langsung ke proyek ini.

**Kredit**: Fork dari [Open Notebook](https://github.com/lfnovo/open-notebook) oleh [Luis Novo](https://github.com/lfnovo)

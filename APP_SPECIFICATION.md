# APP_SPECIFICATION: Orchestra

## 1. Product Vision & Target
* **App Name:** Orchestra
* **Target Audience:** Companies (corporations, start-ups), Project Managers, Team Leaders.
* **Primary Goal:** Menyederhanakan workflow dengan mengintegrasikan berbagai platform (Notion, GitHub, Zoom) ke dalam satu dashboard terpusat.
* **UI/UX Theme:** Monokromatik dengan aksen ungu dan biru tua. Desain simpel, rapi, dan fungsional (bernuansa teknikal).
* **Core Value Proposition:** Pengguna tidak perlu berpindah aplikasi; catatan rapat (Notion), pelacakan kode (GitHub), dan meeting (Zoom) diakses dan dikelola dalam satu platform tersegregasi dan aman.

## 2. Technical Stack & Architecture
* **Frontend:** Next.js
* **Backend:** Nest.js (Node.js ecosystem)
* **Language:** TypeScript (Strict typing, Zod validation)
* **Key External APIs:** Notion API (Official SDK `@notionhq/client`), GitHub Webhooks, Zoom Web SDK / API, Gemini API.
* **Security:** JWT Authentication, Password Hashing, Encrypted API Keys, Strict Team Segregation (RBAC).

## 3. Prioritized Development Phases (MoSCoW)

### Phase 1: MUST HAVE (Core MVP & Foundations)
* **Auth & Security:** Secure login via JWT. Segregasi ketat antar tim (Data proyek A tidak bisa diakses proyek B; error 403 untuk unauthorized access).
* **API Management:** Admin dapat mengatur API Keys dengan aman (input disensor, dienkripsi di database).
* **Notion Integration:** Sistem dapat terhubung dengan Notion via Integration Token dan Database ID, divalidasi dengan menarik skema dari Notion API.
* **AI Note Taker (Gemini):** Sistem mengirim file VTT (Zoom transcript) ke Gemini API, menghasilkan ringkasan JSON.
* **Draft & Approve System:** Pengguna dapat meninjau, mengedit, dan menghapus draf ringkasan Gemini sebelum menekan "Approve & Sync" ke Notion.
* **Team Chat:** Real-time chat UI di dalam workspace proyek.

### Phase 2: SHOULD HAVE (Enhancements)
* **GitHub Integration:** Menghubungkan repositori via URL/PAT dan mendengarkan webhook push/pull_request.
* **Automatic Task Updates:** Commit/PR dengan tag tertentu di GitHub otomatis mengubah status task di Notion.
* **PM Dashboard:** Widget metrik tugas tersinkronisasi dari Notion (To Do, In Progress, Done) yang otomatis memuat ulang data.
* **Disconnect Platform:** Tombol untuk menghapus token dari database dan menghentikan sinkronisasi untuk platform tertentu.

### Phase 3: COULD HAVE (Nice to Have)
* **Zoom Integration:** Auto-create meeting link via API dan fitur Join Meeting langsung dari browser (Zoom Web SDK).
* **AI Task Recommendations:** UI menampilkan "Suggested Tasks" berdasarkan ringkasan rapat yang bisa diabaikan atau ditambahkan.
* **Admin System Logs:** Perekaman aktivitas integrasi (contoh: webhook sukses/gagal) dengan timestamp.

### OUT OF SCOPE (Won't Have)
* Mobile Application version.
* Routing pengguna ke aplikasi eksternal Notion atau Zoom (semua harus di dalam Orchestra).
* Biometric authentication.
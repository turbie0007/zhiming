# 知命 Roadmap

更新日期：2026-11-23
目前版本：1.0.0（原生 build 2；網頁快取版號 20261145）
目前狀態：20 項改善與命例管理完成；Capacitor iOS／Android 已可編譯並於模擬器啟動；2026-11-22 完成格局與用神分析、隱私政策頁、iOS 隱私清單與觸覺／原生分享／節氣提醒；2026-11-23 完成今日干支桌面小工具與商店隱私申報稿；尚未送審。

## 產品原則

- 離線計算、資料留在本機，無帳號也能使用。
- 原生功能要能通過 Apple 4.2，而不是純 WebView 殼。
- 命理輸出需有規則依據，避免空泛或不可驗證的文案。
- 預設置入不蒐集資料；任何雲端功能都需使用者明確同意。

## Phase 0｜上架準備（P0，1–2 週）

目標：能送審、能上架。

| 項目 | 說明 | 影響 |
| --- | --- | --- |
| Apple 4.2 原生功能 | 桌面小工具、節氣／流日通知、分享、觸覺回饋 | 避免退件，最高優先（四項均已完成；小工具提供今日干支、農曆與生肖） |
| 隱私合規 | `PrivacyInfo.xcprivacy`、隱私政策頁、Android Data Safety | 送審必要（清單與政策頁已完成；兩商店申報答案見 `PRIVACY-DECLARATIONS.md`，待公開政策網址後填入主控台） |
| 簽署與發布 | Android release keystore＋AAB；iOS Archive／TestFlight | 本機建置流程已完成；未簽署 AAB／iOS 裝置 Archive 已驗證；正式簽署、TestFlight／Play 上傳仍待完成 |
| 實機 QA | iPhone／Android 各一輪，含離線、背景、旋轉 | 降低負評 |
| 商店素材 | 截圖、文案、關鍵字、App 圖示 | 繁體中文雙商店文案、Google Play 主題圖片與圖示已完成；18 張原生截圖（iOS iPhone 17、iPad Pro 13 吋 M5、Android Pixel 5）已擷取並通過驗證，見 [素材預覽](store/zh-Hant/index.html) 與 [文案](store/zh-Hant/listing-copy.md)。字數、尺寸及圖片格式已驗證；送審前仍須完成實機 QA，補齊支援信箱／網址、公開隱私政策網址及著作權欄位；尚未上傳 |

### 本機發布建置（2026-11-23）

`npm run release:android` 產生簽署 AAB；`npm run release:ios` 產生本機 Archive。兩個指令都會先重產小工具資料、打包網頁與執行 Capacitor sync，**不會上傳、公開或自動申請憑證**。產物按時間存入已被 Git 忽略的 `artifacts/`。

未簽署驗證（不可送審、不是可安裝測試包）：

```sh
npm run test:release
npm run release:android -- --unsigned
npm run release:ios -- --unsigned
```

Android 需 JDK 21；`JAVA_HOME` 必須指向 JDK Home（本機安裝為 `$HOME/.local/jdk-21.0.13.1+2/Contents/Home`），並已設定 Android SDK。iOS 需 macOS、Xcode 與 iOS SDK。

正式簽署前：

初次設定 Android 可在 macOS 雙擊 `scripts/android-signing.command`：密碼在本機 Terminal 隱藏輸入，以 RSA 3072／PKCS12 建立有效期 10,000 天的 upload key，存至 `~/.zhiming-signing/zhiming-upload.p12`（別名 `zhiming-upload`），不覆寫既有金鑰；可接著建立 AAB 並驗證簽章。此引導使用相同的 keystore／key 密碼，僅暫存在程序環境，結束後清除，不會自動上傳。金鑰檔與密碼仍須由著作權人分別安全備份。

2026-11-23 已確認尚無 Android upload key、尚未加入付費 Apple Developer Program；目前僅備妥設定引導，金鑰建立／正式簽章結果與 Apple 入會仍待使用者操作。Apple 入會需自行完成雙重認證、身分核驗、條款與付款；個人會員的法定姓名會作為 App Store 賣方名稱，組織會員則需合法實體與適用的 D-U-N-S 資料。官方說明：[Apple 入會](https://developer.apple.com/programs/enroll/)、[Android 簽署](https://developer.android.com/studio/publish/app-signing)。

- **Android**：由著作權人建立／保管 upload keystore，放在專案之外並離線備份。透過本機密碼管理器或隱藏輸入設定環境變數 `ZHIMING_KEYSTORE_FILE`（絕對路徑）、`ZHIMING_KEYSTORE_PASSWORD`、`ZHIMING_KEY_ALIAS`、`ZHIMING_KEY_PASSWORD`，再執行 `npm run release:android`。請勿把密碼貼到對話、命令歷史或專案檔案；不要使用 Gradle `--debug`／`--scan` 公開建置環境。
- **iOS**：先在 Xcode 設好 Apple Developer 帳號、有效簽署憑證與 App／Widget provisioning profiles；設定 `ZHIMING_APPLE_TEAM_ID`，再執行 `npm run release:ios`。App 與 Widget 必須屬於同一 Team。此流程不會執行 `-allowProvisioningUpdates` 或自動上傳；完成後仍需在 Organizer 驗證／匯出，再由使用者決定是否上傳 TestFlight。
- 缺少 Android 簽署資料時，腳本與直接呼叫 Gradle 的 release 建置都會停止；未簽署模式必須明確指定。憑證、密碼檔、Archive、AAB 輸出均不得提交。
- 原生版本為 `1.0.0 (2)`，Android versionCode 與 iOS App／Widget build 已同步；之後每次商店上傳都必須使用更高的 build 編號。此次未改網頁內容，網頁快取版號維持不變。

已驗證：11 項發布防呆測試；Android 未簽署 AAB 與 debug 回歸建置；iOS arm64 裝置 Release Archive，含 Widget、農曆資料、隱私清單、網頁資產及 dSYM；App／Widget 版號一致且無 debug dylib。也確認既有未簽署快取及全域 Gradle unsigned 設定不能讓缺少憑證的正式建置通過。

仍待：真實 upload key 的簽署驗證、Apple 簽署／匯出驗證（目前找不到有效 codesigning identity）、公開隱私政策 URL、商店主控台表單與上傳、實機 QA。未簽署建置成功不等於可送審；小工具桌面互動、通知與分享仍需實機驗證。

## Phase 1｜命理深度 1.1（2–4 週）

目標：讓進階使用者覺得夠專業。

1. **格局與用神分析**（已完成 2026-11-22）：月令取格、透干／本氣、建祿／羊刃，並以扶抑、通關、調候、病藥產生用神候選與理由。
2. **大運流年時間軸**：把大運、流年、流月、流日串成可捲動時間軸，標記沖合刑害。
3. **神煞完整化**：補常見神煞與查法，維持可點擊釋義。
4. **合婚完整報告**：由目前雙盤合參延伸為合婚頁，涵蓋日柱、年柱、五行互補與溝通模式。
5. **PDF 命書輸出**：一頁精簡版＋完整版，含免責聲明。
6. **城市與真太陽時資料庫**：增加台灣、香港、東南亞城市，支援手動經度校正。

## Phase 2｜黏著與平台 1.2（1–2 個月）

目標：從「查一次」變成「每天打開」。

- **每日運勢通知**：以流日十神／沖合產生短句，可完全關閉。
- **節氣與流月提醒**：節氣交接、月初提示。
- **桌面小工具**（已完成 2026-11-23）：iOS WidgetKit 小／中尺寸、Android 4×2 App Widget，顯示今日干支、農曆與生肖；兩端以同一份資料在原生端重算，午夜與立春自動換日。
- **Siri／捷徑**：快速排盤、查今日。
- **多裝置同步**：iCloud／Google Drive 端到端加密備份，不建中央帳號。
- **iPad／橫向排版、無障礙、英文介面**。

## Phase 3｜差異化 2.0（3–6 個月）

目標：建立不容易被複製的價值。

- **規則式命理解讀引擎**：以可驗證規則產生段落，標明依據（十神、宮位、神煞）。
- **可選 AI 輔助**：僅在使用者同意下把命盤送往雲端，預設關閉；輸出需附規則依據。
- **擇日模組**：依用途（簽約、搬遷、開市）篩選日期，與命盤結合。
- **命例分析**：多命例統計、家族／客戶管理（本機）。
- **Pro 版**：PDF 命書、進階分析、同步、主題；建議一次買斷，訂閱需有持續價值。

## 工程持續軌

- 命理回歸測試由 12 例擴到 100+ 例（節氣邊界、時區、真太陽時）。
- CI：每次 push 執行 `tests.html`、Android debug build、iOS simulator build。
- 版本與快取自動遞增；release 腳本化。
- 效能：大型命例列表、首次載入、低階 Android。
- 可選 crash reporting（預設關閉、去識別化）。

## 建議優先序

1. Phase 0 的 **Apple 4.2 原生功能＋隱私 Manifest**（上架門檻）。
2. Phase 1 的 **格局用神** 與 **大運流年時間軸**（專業度最有感）。
3. Phase 2 的 **每日通知＋桌面小工具**（留存最有感）。

## 待拍板決策

- 商業模式：一次買斷或訂閱。
- 同步策略：維持純本機，或提供 iCloud／Google Drive 加密備份。
- AI 解讀：只做規則式，或提供可選的雲端輔助。
- 是否先只上一個平台，降低首次送審風險。

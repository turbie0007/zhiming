# 商店隱私申報稿（v1.0.0）

更新日期：2026-11-23
適用：App Store Connect「App 隱私權」、Google Play Console「資料安全性」
結論：本 App 不蒐集、不分享、不追蹤使用者資料；所有內容只留在裝置上。

## 一、事實盤點（申報依據）

| 項目 | 事實 |
| --- | --- |
| 網路請求 | 無第三方請求。頁面、字型、圖示皆為本機資產；Service Worker 只快取同源資源 |
| 帳號 | 無註冊、無登入 |
| 第三方 SDK | 無廣告、分析、崩潰回報 SDK；Capacitor 外掛（觸覺、分享、通知、偏好、狀態列、App）皆在本機執行，不外傳 |
| 裝置內資料 | `localStorage` 保存命例（姓名選填、性別、出生日期時間、校正選項、標籤、備註、資料夾）、主題、排序、最近輸入、節氣提醒開關；另由系統保存已排程的本機通知 |
| 分享 | 使用者主動觸發：文字摘要交給系統分享面板；分享連結把出生資訊編碼在 URL fragment，不上傳伺服器 |
| 匯出 | 使用者主動下載 PNG 命盤或 JSON 備份，只寫到本機 |
| Android 權限 | `INTERNET`（Capacitor 本機資源）、`VIBRATE`、`POST_NOTIFICATIONS`、`RECEIVE_BOOT_COMPLETED`、`WAKE_LOCK`、`SCHEDULE_EXACT_ALARM`（皆為觸覺／本機節氣提醒所需） |
| iOS 權限 | 僅本機通知（opt-in），無定位、相機、相簿、通訊錄、追蹤 |
| 必要理由 API | `UserDefaults`（CA92.1）、`FileTimestamp`（C617.1），已列於 `PrivacyInfo.xcprivacy` |
| 遠端推播 | 未使用 APNs／FCM，不會產生裝置權杖 |

依 Apple 與 Google 的定義，「收集」指資料被傳出裝置並可被開發者存取；本 App 沒有此行為，因此兩邊都申報「不收集」。

## 二、App Store Connect「App 隱私權」

1. **資料收集**：選「否，我們不會從此 App 收集資料」（No, we do not collect data from this app）。
2. **追蹤**：選「否」；不使用追蹤網域（manifest 亦為 `NSPrivacyTracking=false`、空陣列）。
3. **第三方 SDK**：無需勾選；Capacitor 外掛皆在本機執行，未傳輸資料。
4. **資料類型／連結到身分／保留期限／使用者選擇**：因未收集，全部不適用，不需逐項填寫。
5. **隱私權政策 URL**：必填且須公開可達。目前只有 App 內 `#/privacy`，送審前需另行公開（待辦，見第五節）。
6. **帳號刪除（5.1.1(v)）**：不適用，App 無帳號。
7. **出口合規**：`Info.plist` 已設 `ITSAppUsesNonExemptEncryption=false`，申報只用系統標準加密。
8. **年齡分級**：問卷各項皆「無」→ 建議 4+；內容為命理工具，無限制級素材。

**App Review 備註建議文字**（供 4.2 判斷，可貼在審查備註）：

> 知命是離線八字排盤工具。除網頁介面外，提供原生桌面小工具（WidgetKit，小／中尺寸）、可選的本機節氣提醒（LocalNotifications）、系統分享面板、觸覺回饋，並附隱私清單（PrivacyInfo.xcprivacy）。所有計算與資料保存都在裝置上，無帳號、無網路同步、無分析或廣告 SDK。隱私政策：<公開網址>。

## 三、Google Play「資料安全性」

主表單：

- **貴應用程式是否收集或分享任何必要使用者資料類型？** → **否**
- 之後顯示為「未收集任何資料」；資料類型、分享對象、加密傳輸、刪除請求等題目不需回答。
- **安全實務**（若畫面仍要求確認）：依「不收集」回答；「是否承諾遵循《家庭政策》」→ 否；「是否通過獨立安全審查」→ 否。

「應用程式內容」其他表單：

| 欄位 | 答案 |
| --- | --- |
| 隱私權政策 | 需公開 URL（待辦） |
| 廣告 | 無廣告 |
| 應用程式存取權 | 所有功能無需登入或特殊權限即可使用 |
| 內容分級（IARC） | 暴力、性、粗俗語言、毒品、賭博、恐怖皆「無」；「使用者可否互動或交換內容」→ 否（分享按鈕只是系統分享面板） |
| 目標對象 | 18+（產品決策，避免觸發 Families 政策） |
| 新聞應用程式／COVID／政府／金融功能／健康 | 否 |

若審查詢問權限用途：

- `VIBRATE`：按鈕操作與匯出成功的觸覺回饋。
- `POST_NOTIFICATIONS`、`RECEIVE_BOOT_COMPLETED`、`WAKE_LOCK`、`SCHEDULE_EXACT_ALARM`：使用者自行開啟的二十四節氣提醒；重開機後恢復排程。

**待決風險**：`SCHEDULE_EXACT_ALARM` 在 Android 14+ 需使用者授予「鬧鐘與提醒」權限，拒絕時提醒不會準時。這是可選功能，拒絕不影響排盤；但較嚴格的審查可能要求說明。若要更保守，可改為不精確排程（`setAndAllowWhileIdle`），以數分鐘誤差換掉此權限——需改 Capacitor LocalNotifications 的排程方式，列為實機 QA 時決定。

## 四、與 App 內政策頁一致

`#/privacy` 八節已涵蓋：蒐集範圍（無）、裝置內資料、分享連結與存圖、通知、系統權限、兒童與敏感資料、政策更新、聯絡方式。兩商店、`PrivacyInfo.xcprivacy`、`PRIVACY-DECLARATIONS.md` 三者口徑一致：**不傳輸、不收集、不追蹤**。

若日後加入雲端同步、分析或遠端推播，需同時更新：政策頁、`PrivacyInfo.xcprivacy`、Google Data Safety、App Store 隱私問答與本文件。

## 五、送審前待辦

- [ ] 公開隱私政策網址（兩商店必填；可只發布政策頁，不需公開原始碼）
- [ ] 依本稿填寫 App Store Connect 與 Play Console
- [ ] Android 14+ 實機驗證：通知權限拒絕、精確鬧鐘拒絕、重開機後排程
- [ ] iOS 實機：加入小工具、通知拒絕路徑、分享面板
- [ ] 確認商店申報與最終 binary 的權限、manifest 一致（每次改版重跑 `aapt2 dump permissions`）

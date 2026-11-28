# App Store Connect 表單答案對照（iOS 1.0.0 build 2）

更新日期：2026-11-28
來源：`listing.json`／`listing-copy.md`（繁中文案）、`PRIVACY-DECLARATIONS.md`（隱私申報）、已上傳 archive。
現況：ASC 記錄名稱**知命－八字排盤**、bundle `top.turbie.zhiming`、build 1.0.0 (2) 已上傳（Uploaded to Apple）。
用法：照下列欄位貼值；標「待決」者需使用者提供，不得代填虛構聯絡方式。

> 名稱已统一（2026-11-28 使用者決定）：ASC 記錄與 listing 檔皆為**知命－八字排盤**（「知命」全球被占）。

## 一、General → App Information

| 欄位 | 答案 |
| --- | --- |
| Name | 知命－八字排盤 |
| Subtitle | 觀四柱五行，循節氣讀懂命盤 |
| Primary Language | Chinese (Traditional)（目前記錄為 English (U.S.)，需改） |
| Primary Category | 參考（Reference） |
| Secondary Category | 教育（Education） |
| Content Rights（是否含第三方內容） | 否（介面與文字皆原創；引用之古籍為公共領域） |
| Privacy Policy URL | https://www.myzhiming.com/privacy/ |
| License Agreement | 維持 Apple 標準 EULA |

## 二、Pricing and Availability

- Price：**Free**。
- Availability：全選後**取消中國 mainland**（跳過 Security Assessment 與 AIGC 兩項申報）；繁中市場至少含 TW／HK／MO。
- Pre-order：不啟用。

## 三、Distribution → iOS App Version 1.0

| 欄位 | 答案 |
| --- | --- |
| Promotional Text | 把時間化作四柱，把術語讀成脈絡。從公農曆排盤、格局與用神，到大運流年、命例整理與雙盤合參，知命陪你安靜研習傳統文化，把判斷留給自己。 |
| Keywords | 傳統文化,天干地支,五行十神,大運流年,真太陽時,命例管理,格局用神 |
| Support URL | https://www.myzhiming.com/about（/about 已加聯絡區塊含支援信箱；需先 push 部署） |
| Marketing URL（選填） | https://www.myzhiming.com/ |
| Copyright | 2026 Wang Jen Lim（Apple 自動加 ©） |
| What's New | 留空（首版不適用） |
| Build | 選 1.0.0 (2)（TestFlight 處理完成後可選） |
| App Preview | 不上傳（選填） |

**Description**（純文字、661 字，直接貼）：

知命，而不認命。

知命是一款以傳統文化研習為出發點的四柱八字排盤工具。從出生日期與節氣出發，整理四柱、五行與十神的關係，讓初學者查閱術語，也讓研習者保存命例、反覆對照。

起盤有據
支援公曆與農曆輸入，含農曆閏月。可選擇「時辰未知」，也可設定晚子時是否按次日日柱計算。時間以北京時間為基準；真太陽時選項按內建城市經度與出生日均時差校正，並在命盤上標示結果。請先核對出生時間。

讀懂命盤的層次
查看四柱、日主、五行比例、十神分佈，以及格局與用神的取法說明。相關提示屬於簡化的教學性計算，供理解傳統術數的結構，不作吉凶斷定。

循時間慢慢對照
切換大運與流年，進一步查看流月、流日，對照不同時點的干支關係與神煞資訊。

把命例整理成自己的筆記
保存命盤，以資料夾、標籤與備註整理；按姓名、四柱或筆記內容搜尋。支援 JSON 匯出與匯入，方便自行備份。選擇兩張已存命盤，並置查看兩盤之間的合、沖、刑、害。

遇到術語，就停下來讀一讀
點選有說明的術語查看解釋，或走進學堂，按排盤脈絡閱讀短文。先理解記號，再回到命盤觀察。

不需登入，本機保存
排盤計算與命例儲存皆在本機完成。資料保存在本機，主動分享、匯出或系統備份可能使資料離開裝置。請妥善保管備份，並在分享前確認接收對象；移除 App 或清除儲存資料可能造成命例遺失。

使用邊界
時辰未知時，時柱、命宮與身宮會略去，起運時間按正午估算。內容僅供傳統文化研習與資訊整理，不構成醫療、法律、投資、婚戀或其他現實決策建議，也不保證任何人生結果。請勿依據排盤結果作出重大決定。

**截圖**（已重拍、驗證 PASS，web 20261155）：

- iPhone 6.9 吋（1206×2622）：`store/zh-Hant/native/ios-iphone/01-chart.png` … `06-dark.png`，依序上傳 6 張。
- iPad 13 吋（2064×2752）：binary 為 universal，需上傳 `store/zh-Hant/native/ios-ipad/01-chart.png` … `06-dark.png` 6 張。
- 皆無透明通道、sRGB、<8MB，符合規格。

## 四、App Review Information

| 欄位 | 答案 |
| --- | --- |
| Sign-in required | **否**（無帳號、無需測試帳號） |
| Contact（姓名／Email／電話） | Andirew／vapourware@hotmail.com／電話未提供（選填）。註：「Andirew」照使用者輸入登載，若為 Andrew 之誤請告知修正 |
| Notes | 貼下列合并文字 |

**Notes**（listing 測試指引＋4.2 原生功能說明，<4000 bytes）：

本應用程式供傳統文化研習及命例整理使用，無需登入，也不需要測試帳號。姓名為選填，可全程使用虛構資料。

建議測試步驟：
1. 在排盤頁點選「載入示例」，再點選「排盤 · 觀象」。查看四柱、格局與用神、五行及十神。
2. 切換大運與流年，再選擇流月、流日。點選有說明的術語，確認可開啟解釋。
3. 回到輸入頁切換農曆，並分別測試「時辰未知」、「啟用真太陽時校正」與晚子時選項。時辰未知會略去時柱、命宮、身宮，起運時間按正午估算。
4. 保存第一張命盤；修改出生日期後再排盤、保存第二張。進入「命例」，編輯資料夾、標籤與備註，測試搜尋及「雙盤合參」。
5. 點選「導出 JSON」保存測試備份，再以「導入 JSON」選取該檔；已存在的相同命例會略過，不會重複新增。僅在已確認備份可用的測試資料上測試刪除與還原。
6. 開啟「學堂」、「關於」及「隱私政策」查看內容。

資料在本機處理與保存；主動分享、匯出或系統備份可能使資料離開裝置。原生版本的分享使用系統面板傳送命盤文字，不依賴公開命盤網址。節氣提醒為選用功能，可在「關於」開啟或關閉；啟用時會請求通知權限，實際顯示受系統設定影響。

知命是離線八字排盤工具。除網頁介面外，提供原生桌面小工具（WidgetKit，小／中尺寸）、可選的本機節氣提醒（LocalNotifications）、系統分享面板、觸覺回饋，並附隱私清單（PrivacyInfo.xcprivacy）。所有計算與資料保存都在裝置上，無帳號、無網路同步、無分析或廣告 SDK。隱私政策：https://www.myzhiming.com/privacy/。

## 五、Trust & Safety

**App Privacy**：
1. 資料收集：**否，我們不會從此 App 收集資料**。
2. 追蹤：**否**（無追蹤網域；`NSPrivacyTracking=false`）。
3. 資料類型逐項：不適用、免填。
4. Privacy Policy URL：https://www.myzhiming.com/privacy/
5. 帳號刪除（5.1.1(v)）：不適用（無帳號）。

**Age Rating**：問卷各項（暴力、恐怖、醫療、酒精、賭博、性、粗俗語言、毒品、 unrestricted web access）皆「無」→ **4+**。

**出口合規**：binary 已含 `ITSAppUsesNonExemptEncryption=false`，不需動作；若仍被問，選「僅使用豁免之標準加密」。

## 六、已決聯絡與權利資料（2026-11-28 使用者提供）

1. **supportEmail**：vapourware@hotmail.com
2. **supportUrl**：https://www.myzhiming.com/about（/about 聯絡區塊已加該信箱；push 部署後生效）
3. **審查聯絡人**：Andirew／vapourware@hotmail.com（電話未提供；姓名拼字待使用者確認）
4. **Copyright**：2026 Wang Jen Lim
5. **商店名稱**：知命－八字排盤（ASC 與 listing 已统一）

## 七、填完後順序

1. 存檔各頁 → TestFlight 內部測試裝實機 QA（小工具、通知、分享）。
2. 實機 QA 通過、待決清單補齊 → **Add for Review**。
3. Android 側另依 `PRIVACY-DECLARATIONS.md` 第三節填 Play Console（upload key 建立後）。
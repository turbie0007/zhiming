// 雲端會員設定（public-safe：Supabase URL 與 anon key 本就公開，靠 RLS 保護資料）。
// 建立 Supabase project 後填入 url 與 anonKey；留空時雲端模組整體停用（本機功能不受影響）。
// Stripe secret／webhook secret 絕不放這裡，只放 Supabase edge function secrets。
export const CLOUD_CONFIG = {
  supabaseUrl: '',
  supabaseAnonKey: '',
};
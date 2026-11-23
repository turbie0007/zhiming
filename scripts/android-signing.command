#!/bin/zsh
unsetopt XTRACE VERBOSE
set -euo pipefail
umask 077

if [[ ! -t 0 || ! -t 1 ]]; then
  print -u2 -- '請在本機 Terminal 執行；不要透過聊天工具或記錄輸入的工作階段輸入密碼。'
  exit 1
fi

cleanup() {
  unset ZHIMING_KEYSTORE_PASSWORD ZHIMING_KEY_PASSWORD password confirm
  print
  read -r '?按 Enter 結束。' || true
}
trap cleanup EXIT

root="${0:A:h:h}"
signing_dir="$HOME/.zhiming-signing"
export ZHIMING_KEYSTORE_FILE="$signing_dir/zhiming-upload.p12"
export ZHIMING_KEY_ALIAS='zhiming-upload'

if [[ -n "${JAVA_HOME:-}" && -x "$JAVA_HOME/bin/keytool" ]]; then
  keytool_bin="$JAVA_HOME/bin/keytool"
else
  keytool_bin="$(command -v keytool)"
  if [[ "$keytool_bin" == '/usr/bin/keytool' ]]; then
    print -u2 -- '請先將 JAVA_HOME 設為已安裝的 JDK 21 Home，再重新執行。'
    exit 1
  fi
  export JAVA_HOME="${keytool_bin:A:h:h}"
fi

if [[ -L "$signing_dir" || -L "$ZHIMING_KEYSTORE_FILE" ]]; then
  print -u2 -- '金鑰目錄或檔案不可為符號連結；已停止，未覆寫任何金鑰。'
  exit 1
fi

print -- '知命 Android upload key 設定（不會上傳 Google Play）'
print -r -- "金鑰位置：$ZHIMING_KEYSTORE_FILE"
print -r -- "別名：$ZHIMING_KEY_ALIAS"
print -- '密碼不顯示、不寫入檔案；請另存於密碼管理器。'

if [[ -e "$ZHIMING_KEYSTORE_FILE" ]]; then
  print -- '找到既有金鑰，將沿用，不會重建。'
  read -rs 'password?請輸入既有金鑰密碼：'
  print
else
  read -r 'answer?在上述位置建立新金鑰？[y/N] '
  [[ "$answer" == [yY] ]] || exit 0
  read -rs 'password?設定密碼（至少 12 字元）：'
  print
  read -rs 'confirm?再次輸入密碼：'
  print
  if [[ ${#password} -lt 12 || "$password" != "$confirm" ]]; then
    print -u2 -- '密碼太短或兩次輸入不一致；未建立金鑰，請重新執行。'
    exit 1
  fi
  unset confirm
  export ZHIMING_KEYSTORE_PASSWORD="$password"
  export ZHIMING_KEY_PASSWORD="$password"
  mkdir -p "$signing_dir"
  chmod 700 "$signing_dir"
  print -- '接著請填憑證資料；這些資料會包含於公開憑證，請勿填入密碼。'
  "$keytool_bin" -genkeypair -storetype PKCS12 \
    -keystore "$ZHIMING_KEYSTORE_FILE" -alias "$ZHIMING_KEY_ALIAS" \
    -keyalg RSA -keysize 3072 -sigalg SHA256withRSA -validity 10000 \
    -storepass:env ZHIMING_KEYSTORE_PASSWORD -keypass:env ZHIMING_KEY_PASSWORD
  chmod 600 "$ZHIMING_KEYSTORE_FILE"
fi

export ZHIMING_KEYSTORE_PASSWORD="$password"
export ZHIMING_KEY_PASSWORD="$password"
unset password
"$keytool_bin" -list -keystore "$ZHIMING_KEYSTORE_FILE" -alias "$ZHIMING_KEY_ALIAS" \
  -storepass:env ZHIMING_KEYSTORE_PASSWORD
print -- '請備份金鑰檔到安全的離線位置，密碼另行保管；不要上傳私密金鑰到聊天或 Git。'
read -r 'answer?現在用此金鑰建立正式簽署 AAB？[y/N] '
if [[ "$answer" == [yY] ]]; then
  npm --prefix "$root" run release:android
  verification="$("$JAVA_HOME/bin/jarsigner" -J-Duser.language=en -J-Duser.country=US \
    -verify "$root/android/app/build/outputs/bundle/release/app-release.aab")"
  print -r -- "$verification"
  if [[ "$verification" != *'jar verified.'* ]]; then
    print -u2 -- 'AAB 簽章驗證未通過，請勿上傳。'
    exit 1
  fi
  print -- 'AAB 簽章已驗證；尚未上傳 Google Play。'
fi
